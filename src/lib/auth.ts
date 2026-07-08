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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePassword(password: string) {
  return password.trim();
}

function normalizeUser(user: User): User {
  return {
    ...user,
    email: normalizeEmail(user.email),
    password: normalizePassword(user.password),
    active: user.active !== false,
  };
}

export function initUsers() {
  const existing = localStorage.getItem(USERS_KEY);
  if (!existing) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return;
  }
  try {
    const parsedUsers: User[] = JSON.parse(existing);
    const users = parsedUsers.map(normalizeUser);
    let changed = false;
    if (JSON.stringify(users) !== JSON.stringify(parsedUsers)) changed = true;
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
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  const user = users.find(u => normalizeEmail(u.email) === normalizedEmail && normalizePassword(u.password) === normalizedPassword && u.active);
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizeUser(user)));
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
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  if (!normalizedEmail || !normalizedPassword) return 'invalid';
  const existingUser = users.find(u => normalizeEmail(u.email) === normalizedEmail);
  if (existingUser) {
    existingUser.email = normalizedEmail;
    existingUser.password = normalizedPassword;
    existingUser.active = true;
    localStorage.setItem(USERS_KEY, JSON.stringify(users.map(normalizeUser)));
    return 'updated';
  }
  users.push({ email: normalizedEmail, password: normalizedPassword, role, active: true });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return 'created';
}

export function toggleUserActive(email: string) {
  const users = getUsers();
  const normalizedEmail = normalizeEmail(email);
  const user = users.find(u => normalizeEmail(u.email) === normalizedEmail);
  if (user && user.role !== 'admin') {
    user.active = !user.active;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}
