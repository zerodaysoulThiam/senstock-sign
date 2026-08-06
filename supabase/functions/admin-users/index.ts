// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_USERS = [
  { email: "admin@senstock.sn", password: "admin123", role: "admin" as const },
];

function extractName(email: string) {
  return email
    .split("@")[0]
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

async function createAuthUser(email: string, password: string, role: "admin" | "user") {
  const normalized = email.trim().toLowerCase();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: normalized,
    password: password.trim(),
    email_confirm: true,
    user_metadata: { full_name: extractName(normalized), role },
  });
  if (error) {
    // If user already exists, try to update password + ensure role
    if (String(error.message).toLowerCase().includes("already")) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === normalized);
      if (!existing) throw error;
      await admin.auth.admin.updateUserById(existing.id, {
        password: password.trim(),
      });
      // Ensure profile active
      await admin.from("profiles").upsert({
        id: existing.id,
        email: normalized,
        full_name: extractName(normalized),
        active: true,
      });
      await admin.from("user_roles").upsert(
        { user_id: existing.id, role },
        { onConflict: "user_id,role" }
      );
      return { id: existing.id, updated: true };
    }
    throw error;
  }
  // Ensure role row exists (in case trigger raced)
  if (created.user) {
    await admin.from("user_roles").upsert(
      { user_id: created.user.id, role },
      { onConflict: "user_id,role" }
    );
  }
  return { id: created.user?.id, created: true };
}

async function isCallerAdmin(authHeader: string | null): Promise<{ ok: boolean; userId?: string }> {
  if (!authHeader) return { ok: false };
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { ok: false };
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const isAdmin = !!roles?.some((r) => r.role === "admin");
  return { ok: isAdmin, userId: data.user.id };
}

/** Removes a user's documents, stored files, profile, roles and auth account. */
async function deleteUserCascade(userId: string) {
  const { data: docs } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("owner_id", userId);
  const paths = (docs ?? []).map((d: any) => d.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await admin.storage.from("signed-documents").remove(paths);
  }
  await admin.from("documents").delete().eq("owner_id", userId);
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "bootstrap") {
      // Seed default users if there are zero admins in the system.
      const { data: adminRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);
      if (adminRoles && adminRoles.length > 0) {
        return new Response(JSON.stringify({ bootstrapped: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const u of DEFAULT_USERS) {
        try {
          await createAuthUser(u.email, u.password, u.role);
        } catch (e) {
          console.error("bootstrap user failed", u.email, e);
        }
      }
      return new Response(JSON.stringify({ bootstrapped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require admin.
    const auth = req.headers.get("Authorization");
    const check = await isCallerAdmin(auth);
    if (!check.ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, email, full_name, active, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const users = (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        active: p.active,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "user",
      }));
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "").trim();
      const role = (body.role === "admin" ? "admin" : "user") as "admin" | "user";
      if (!email || password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Email invalide ou mot de passe trop court (min 6)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await createAuthUser(email, password, role);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle") {
      const userId = String(body.userId ?? "");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: prof } = await admin
        .from("profiles")
        .select("active")
        .eq("id", userId)
        .maybeSingle();
      const nextActive = !(prof?.active ?? true);
      await admin.from("profiles").update({ active: nextActive }).eq("id", userId);
      // Also ban/unban in auth so login is blocked immediately
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: nextActive ? "none" : "876000h",
      } as any);
      return new Response(JSON.stringify({ ok: true, active: nextActive }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-password") {
      const userId = String(body.userId ?? "");
      const password = String(body.password ?? "").trim();
      if (!userId || password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Mot de passe trop court (min 6 caractères)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const userId = String(body.userId ?? "");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userId === check.userId) {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Refuse to delete another admin account
      const { data: targetRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (targetRoles?.some((r) => r.role === "admin")) {
        return new Response(
          JSON.stringify({ error: "Impossible de supprimer un compte administrateur." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await deleteUserCascade(userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "purge-non-admins") {
      const { data: profiles } = await admin.from("profiles").select("id");
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const adminIds = new Set(
        (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)
      );
      let deleted = 0;
      for (const p of profiles ?? []) {
        if (adminIds.has(p.id)) continue;
        try {
          await deleteUserCascade(p.id);
          deleted++;
        } catch (e) {
          console.error("purge failed", p.id, e);
        }
      }
      return new Response(JSON.stringify({ ok: true, deleted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});