/** Validadores de formulários (registo e faturação). Sem dependências. */

export const isValidEmail = (value: string): boolean => {
  const v = (value || "").trim();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
};

/**
 * Telemóvel/telefone: aceita números portugueses (9 dígitos a começar por 2, 3 ou 9,
 * com ou sem +351/00351) e números internacionais com prefixo "+" (8 a 15 dígitos).
 */
export const isValidPhone = (value: string): boolean => {
  const raw = (value || "").trim();
  if (!raw) return false;
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.startsWith("+") && !raw.startsWith("+351")) {
    return digits.length >= 8 && digits.length <= 15;
  }
  const national = digits.replace(/^(00)?351/, "");
  return /^[239]\d{8}$/.test(national);
};

/** NIF português com validação do dígito de controlo (módulo 11). */
export const isValidNIF = (value: string): boolean => {
  const nif = (value || "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  if (!/^[1235689]/.test(nif)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return check === Number(nif[8]);
};

export const isValidPostalCode = (value: string): boolean => /^\d{4}-\d{3}$/.test((value || "").trim());

/** Nome completo: pelo menos 2 caracteres úteis. */
export const isValidName = (value: string): boolean => (value || "").trim().replace(/\s+/g, " ").length >= 2;

/** Mantém só dígitos (e "+" inicial) e agrupa 3-3-3 nos números nacionais. */
export const formatPhoneInput = (value: string): string => {
  const v = (value || "").replace(/[^\d+\s]/g, "");
  if (v.startsWith("+")) return v.slice(0, 20);
  const d = v.replace(/\s/g, "").slice(0, 9);
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
};

/** Versão dos documentos legais aceites (para prova de consentimento). */
export const LEGAL_VERSION = "2026-11";
