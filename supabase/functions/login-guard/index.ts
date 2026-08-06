// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Politique anti-force brute. */
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;
const WINDOW_MINUTES = 15;
/** Limite globale par IP (toutes adresses email confondues). */
const MAX_FAILURES_PER_IP = 20;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim();
}

/** Retourne l'état de blocage pour un email + IP. */
async function getStatus(email: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { data: rows } = await admin
    .from("login_attempts")
    .select("success, created_at, ip")
    .eq("email", email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  // Les échecs comptés sont ceux survenus après la dernière connexion réussie.
  const attempts = rows ?? [];
  const lastSuccessIdx = attempts.findIndex((a: any) => a.success);
  const recentFailures = (lastSuccessIdx === -1 ? attempts : attempts.slice(0, lastSuccessIdx))
    .filter((a: any) => !a.success);

  let blocked = false;
  let retryAfterSeconds = 0;

  if (recentFailures.length >= MAX_FAILURES) {
    const lastFailure = new Date(recentFailures[0].created_at).getTime();
    const unlockAt = lastFailure + LOCKOUT_MINUTES * 60_000;
    if (unlockAt > Date.now()) {
      blocked = true;
      retryAfterSeconds = Math.ceil((unlockAt - Date.now()) / 1000);
    }
  }

  if (!blocked && ip && ip !== "unknown") {
    const { count } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_FAILURES_PER_IP) {
      blocked = true;
      retryAfterSeconds = LOCKOUT_MINUTES * 60;
    }
  }

  return {
    blocked,
    retryAfterSeconds,
    failures: recentFailures.length,
    remaining: Math.max(0, MAX_FAILURES - recentFailures.length),
    maxFailures: MAX_FAILURES,
    lockoutMinutes: LOCKOUT_MINUTES,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const ip = clientIp(req);

    if (!email || email.length > 320 || !email.includes("@")) {
      return json({ error: "Email invalide" }, 400);
    }

    if (action === "check") {
      const status = await getStatus(email, ip);
      return json(status, status.blocked ? 429 : 200);
    }

    if (action === "record") {
      const success = body.success === true;
      await admin.from("login_attempts").insert({ email, ip, success });
      if (success) {
        // On purge les échecs de ce compte après une connexion réussie.
        await admin.from("login_attempts").delete().eq("email", email).eq("success", false);
        return json({ ok: true, blocked: false, retryAfterSeconds: 0, remaining: MAX_FAILURES });
      }
      const status = await getStatus(email, ip);
      return json({ ok: true, ...status });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error(err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
