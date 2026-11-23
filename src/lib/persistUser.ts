// Dados financeiros/fiscais e notas internas nunca ficam guardados em localStorage (só em memória).
const PRIVATE_USER_FIELDS = [
  "nif", "iban", "fiscal_name", "billing_address", "billing_street", "billing_number",
  "billing_floor", "billing_zip", "billing_city", "billing_country", "admin_notes", "adminNotes",
];

export function persistableUser<T extends Record<string, any>>(u: T): T {
  const c: any = { ...u };
  for (const k of PRIVATE_USER_FIELDS) delete c[k];
  return c;
}
