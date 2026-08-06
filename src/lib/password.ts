export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_RULES_TEXT =
  "Au moins 10 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.";

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
  score: number; // 0..4
}

export function validatePassword(raw: string): PasswordCheck {
  const pwd = (raw ?? "").trim();
  const errors: string[] = [];
  if (pwd.length < PASSWORD_MIN_LENGTH) errors.push(`Au moins ${PASSWORD_MIN_LENGTH} caractères`);
  if (!/[A-Z]/.test(pwd)) errors.push("Une lettre majuscule");
  if (!/[a-z]/.test(pwd)) errors.push("Une lettre minuscule");
  if (!/[0-9]/.test(pwd)) errors.push("Un chiffre");
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("Un caractère spécial");
  if (/^(.)\1+$/.test(pwd)) errors.push("Pas un caractère répété");
  const weak = ["password", "passer123", "motdepasse", "azerty", "qwerty", "123456", "admin123", "senstock"];
  if (weak.some((w) => pwd.toLowerCase().includes(w))) errors.push("Trop courant / devinable");

  const passed = [
    pwd.length >= PASSWORD_MIN_LENGTH,
    /[A-Z]/.test(pwd),
    /[a-z]/.test(pwd) && /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;

  return { valid: errors.length === 0, errors, score: passed };
}
