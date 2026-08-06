import { supabase } from "@/integrations/supabase/client";

export const MAX_FAILURES = 5;
export const LOCKOUT_MINUTES = 15;

const LOCAL_KEY = "senstock_login_guard";

interface LocalState {
  failures: number;
  lockedUntil: number | null;
}

export interface GuardStatus {
  blocked: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function readLocal(): Record<string, LocalState> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeLocal(state: Record<string, LocalState>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : le blocage serveur reste actif */
  }
}

/** Blocage local (retour immédiat, non autoritaire). */
export function localStatus(email: string): GuardStatus {
  const key = normalize(email);
  const entry = readLocal()[key];
  if (!entry) return { blocked: false, retryAfterSeconds: 0, remaining: MAX_FAILURES };
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000),
      remaining: 0,
    };
  }
  return {
    blocked: false,
    retryAfterSeconds: 0,
    remaining: Math.max(0, MAX_FAILURES - entry.failures),
  };
}

function recordLocal(email: string, success: boolean) {
  const key = normalize(email);
  const state = readLocal();
  if (success) {
    delete state[key];
    writeLocal(state);
    return;
  }
  const entry = state[key] ?? { failures: 0, lockedUntil: null };
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    entry.failures = 0;
    entry.lockedUntil = null;
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60_000;
  }
  state[key] = entry;
  writeLocal(state);
}

/** Vérifie auprès du serveur (autoritaire) si la connexion est autorisée. */
export async function checkLoginAllowed(email: string): Promise<GuardStatus> {
  const local = localStatus(email);
  if (local.blocked) return local;

  try {
    const { data } = await supabase.functions.invoke("login-guard", {
      body: { action: "check", email: normalize(email) },
    });
    if (data && typeof data.blocked === "boolean") {
      return {
        blocked: data.blocked,
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
        remaining: data.remaining ?? MAX_FAILURES,
      };
    }
  } catch {
    /* le serveur ne répond pas : on s'appuie sur le blocage local */
  }
  return local;
}

/** Enregistre le résultat d'une tentative et renvoie l'état résultant. */
export async function recordLoginAttempt(email: string, success: boolean): Promise<GuardStatus> {
  recordLocal(email, success);
  try {
    const { data } = await supabase.functions.invoke("login-guard", {
      body: { action: "record", email: normalize(email), success },
    });
    if (data && typeof data.blocked === "boolean") {
      return {
        blocked: data.blocked,
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
        remaining: data.remaining ?? 0,
      };
    }
  } catch {
    /* ignoré : l'état local suffit pour l'affichage */
  }
  return localStatus(email);
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}
