export const displaySubSlot = (n?: number | null) => {
  if (typeof n !== 'number' || !Number.isInteger(n)) return 1; // fallback seguro
  // Acepta datos 0–4 (legacy) y 1–5 (correcto)
  if (n >= 1 && n <= 5) return n;      // ya normalizado
  if (n >= 0 && n <= 4) return n + 1;  // legacy 0‑based → 1‑based
  return 1;
};
