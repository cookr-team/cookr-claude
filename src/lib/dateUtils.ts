/**
 * Datas em hora LOCAL (YYYY-MM-DD).
 * `new Date().toISOString()` devolve a data em UTC, o que dá o dia errado
 * perto da meia-noite (ex.: Portugal no horário de verão) e quebra agendas e reservas.
 */
export const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocal = (): string => toLocalDateStr(new Date());
