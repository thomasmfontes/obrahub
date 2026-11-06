import type { DespesaRubrica } from '../types';
export function reportWarnings(
  days: string[],
  diaries: { t_data_registro?: string | null; t_resumo_atividades?: string | null }[],
  expenses: DespesaRubrica[]
) {
  const recorded = new Set(
    (diaries || [])
      .filter(day => day?.t_resumo_atividades?.trim() && Boolean(day?.t_data_registro))
      .map(day => (day.t_data_registro || '').slice(0, 10))
  );
  return {
    missingDays: (days || []).filter(day => !recorded.has(day)),
    missingReceipts: (expenses || []).filter(expense => !expense.t_comprovante_storage_urls?.length)
  };
}
