/** Contact normalization for duplicate/anti-abuse matching (PRD §31-33). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}
