/**
 * Helper para formatação automática de Código Postal Português (XXXX-XXX)
 * 1. Remove qualquer caractere que não seja dígito numérico (0-9).
 * 2. Limita o valor a no máximo 7 dígitos.
 * 3. Aplica automaticamente o hífen após os primeiros 4 dígitos ("XXXX-XXX").
 * 4. Permite apagar facilmente com Backspace sem bloquear no hífen.
 */
export const formatPostalCode = (value: string): string => {
  // Remove tudo o que não for dígito
  const digitsOnly = value.replace(/\D/g, '').slice(0, 7);
  
  // Aplica o hífen após os primeiros 4 dígitos
  if (digitsOnly.length > 4) {
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
  }
  return digitsOnly;
};
