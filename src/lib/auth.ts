import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  full_name?: string;
}

const CACHE_KEY = "senstock_current_user";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function extractName(email: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function setCache(u: User | null) {
  if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
  else localStorage.removeItem(CACHE_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function hydrateFromSession(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    setCache(null);
    return null;
  }
  const uid = session.user.id;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, active").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);
  const role = roles?.some((r) => r.role === "admin") ? "admin" : "user";
  const user: User = {
    id: uid,
    email: profile?.email ?? session.user.email ?? "",
    full_name: profile?.full_name ?? undefined,
    role,
    active: profile?.active !== false,
  };
  setCache(user);
  return user;
}

/** Called once at boot: bootstraps defaults + hydrates the local cache. */
export async function initSession(): Promise<User | null> {
  try {
    await supabase.functions.invoke("admin-users", { body: { action: "bootstrap" } });
  } catch (e) {
    console.warn("bootstrap failed (non-blocking)", e);
  }
  supabase.auth.onAuthStateChange((_e, session) => {
    if (!session) setCache(null);
    else hydrateFromSession().catch(() => {});
  });
  return await hydrateFromSession();
}

export async function login(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: password.trim(),
  });
  if (error || !data.user) return null;
  return await hydrateFromSession();
}

export async function logout() {
  await supabase.auth.signOut();
  setCache(null);
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "list" },
  });
  if (error || !data?.users) return [];
  return data.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    active: u.active,
  }));
}

export async function addUser(
  email: string,
  password: string,
  role: "admin" | "user" = "user"
): Promise<"created" | "updated" | "invalid"> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = password.trim();
  if (!normalizedEmail || normalizedPassword.length < 6) return "invalid";
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "create", email: normalizedEmail, password: normalizedPassword, role },
  });
  if (error || !data?.ok) return "invalid";
  return data.updated ? "updated" : "created";
}

export async function toggleUserActive(userId: string) {
  await supabase.functions.invoke("admin-users", {
    body: { action: "toggle", userId },
  });
}
