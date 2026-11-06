import fs from 'fs';

let content = fs.readFileSync('src/components/ReportDetailModal.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { formatCurrencyBRL, triggerHaptic, shareSummary, calculateDaysBetween } from '../utils/formatters';",
  "import { formatCurrencyBRL, triggerHaptic, shareSummary, calculateDaysBetween, formatPillDate } from '../utils/formatters';"
);

// 2. Tab financeiro item
const oldFinanceItem = `<span className="text-[11px] text-slate-400 block mt-0.5">
                          {getRubricaName(d.t_icone_identificador)}
                        </span>`;

const newFinanceItem = `<span className="text-[11px] text-slate-400 block mt-0.5">
                          {getRubricaName(d.t_icone_identificador)}
                          {d.t_data_despesa && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {formatPillDate(d.t_data_despesa)}
                            </span>
                          )}
                        </span>`;

content = content.replace(oldFinanceItem, newFinanceItem);
content = content.replace(oldFinanceItem.replace(/\n/g, '\r\n'), newFinanceItem.replace(/\n/g, '\r\n'));

// 3. Print PDF table row
const oldPdfRow = `<td className="py-2 px-3 font-semibold text-slate-800">
                      {d.nm_rubrica}
                    </td>`;

const newPdfRow = `<td className="py-2 px-3 font-semibold text-slate-800">
                      {d.nm_rubrica}
                      {d.t_data_despesa && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({formatPillDate(d.t_data_despesa)})
                        </span>
                      )}
                    </td>`;

content = content.replace(oldPdfRow, newPdfRow);
content = content.replace(oldPdfRow.replace(/\n/g, '\r\n'), newPdfRow.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/ReportDetailModal.tsx', content, 'utf8');
console.log('✅ ReportDetailModal.tsx atualizado com sucesso!');
