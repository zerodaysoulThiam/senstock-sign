export interface User {
  email: string;
  password: string;
  role: 'admin' | 'user';
  active: boolean;
}

const USERS_KEY = 'senstock_users';
const CURRENT_USER_KEY = 'senstock_current_user';

const DEFAULT_USERS: User[] = [
  { email: 'admin@senstock.sn', password: 'admin123', role: 'admin', active: true },
  { email: 'matar.thiam@senstock.sn', password: 'password123', role: 'user', active: true },
  { email: 'fatou.diallo@senstock.sn', password: 'password123', role: 'user', active: true },
  { email: 'ibrahima.ndiaye@senstock.sn', password: 'password123', role: 'user', active: true },
  { email: 'aminata.sow@senstock.sn', password: 'password123', role: 'user', active: true },
  { email: 'ousmane.ba@senstock.sn', password: 'password123', role: 'user', active: true },
  { email: 'serigne.thiam@senstock.sn', password: 'passer123', role: 'user', active: true },
];

export function initUsers() {
  const existing = localStorage.getItem(USERS_KEY);
  if (!existing) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return;
  }
  try {
    const users: User[] = JSON.parse(existing);
    let changed = false;
    for (const def of DEFAULT_USERS) {
      if (!users.find(u => u.email.toLowerCase() === def.email.toLowerCase())) {
        users.push(def);
        changed = true;
      }
    }
    if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
}

export function getUsers(): User[] {
  initUsers();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

export function login(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active);
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function extractName(email: string): string {
  const local = email.split('@')[0];
  return local
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function addUser(email: string, password: string, role: 'admin' | 'user' = 'user') {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  if (users.find(u => u.email.toLowerCase() === normalizedEmail)) return false;
  users.push({ email: normalizedEmail, password, role, active: true });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

export function toggleUserActive(email: string) {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (user && user.role !== 'admin') {
    user.active = !user.active;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}
