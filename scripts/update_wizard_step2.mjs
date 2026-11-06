import fs from 'fs';

let content = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "  Sparkles\n} from 'lucide-react';",
  "  Sparkles,\n  Receipt,\n  Plus,\n  Trash2\n} from 'lucide-react';"
);
content = content.replace(
  "  Sparkles\r\n} from 'lucide-react';",
  "  Sparkles,\r\n  Receipt,\r\n  Plus,\r\n  Trash2\r\n} from 'lucide-react';"
);

content = content.replace(
  "import type { EvidenciaFotografica } from '../types';",
  "import type { EvidenciaFotografica, DespesaRubrica } from '../types';"
);

content = content.replace(
  "  formatPartsToDuration\n} from '../utils/formatters';",
  "  formatPartsToDuration,\n  formatCurrencyBRL\n} from '../utils/formatters';"
);
content = content.replace(
  "  formatPartsToDuration\r\n} from '../utils/formatters';",
  "  formatPartsToDuration,\r\n  formatCurrencyBRL\r\n} from '../utils/formatters';"
);

// 2. Props interface
const oldProps = `  isSaving: boolean;
}`;
const newProps = `  isSaving: boolean;
  despesas?: DespesaRubrica[];
  onOpenExpenseSheetForDay?: (day: string) => void;
  onEditExpense?: (expense: DespesaRubrica) => void;
  onDeleteExpense?: (idDespesa: string) => void;
}`;
content = content.replace(oldProps, newProps);
content = content.replace(oldProps.replace(/\n/g, '\r\n'), newProps.replace(/\n/g, '\r\n'));

// 3. Component signature
const oldSig = `  onNext,
  isSaving
}) => {`;
const newSig = `  onNext,
  isSaving,
  despesas = [],
  onOpenExpenseSheetForDay,
  onEditExpense,
  onDeleteExpense
}) => {`;
content = content.replace(oldSig, newSig);
content = content.replace(oldSig.replace(/\n/g, '\r\n'), newSig.replace(/\n/g, '\r\n'));

// 4. In component logic
const logicAnchor = `  const visibleDays = datePills.slice(week * 7, (week + 1) * 7);`;
const newLogic = `  const visibleDays = datePills.slice(week * 7, (week + 1) * 7);
  const despesasDoDia = (despesas || []).filter(d => d.t_data_despesa === selectedDay);
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);`;
content = content.replace(logicAnchor, newLogic);
content = content.replace(logicAnchor.replace(/\n/g, '\r\n'), newLogic.replace(/\n/g, '\r\n'));

// 5. JSX Card for Daily Expenses after Photos Card
const photoCardEnd = `              <div className="text-center px-1">
                <span className="text-xs font-bold text-slate-800 block">Anexar Foto</span>
                <span className="text-[10px] text-slate-400 block">Galeria ou Câmera</span>
              </div>
            </button>
          </div>
        </div>`;

const expenseCardJSX = `              <div className="text-center px-1">
                <span className="text-xs font-bold text-slate-800 block">Anexar Foto</span>
                <span className="text-[10px] text-slate-400 block">Galeria ou Câmera</span>
              </div>
            </button>
          </div>
        </div>

        {/* Card 4: Despesas e Comprovantes do Dia */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Despesas deste Dia
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {formatPillDate(selectedDay)}
                </span>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-full">
              {formatCurrencyBRL(totalDespesasDia)}
            </span>
          </div>

          {despesasDoDia.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">
              Nenhuma despesa ou comprovante lançado nesta data.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              {despesasDoDia.map(d => (
                <div key={d.id_despesa} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-xs font-semibold text-slate-900 block truncate">{d.nm_rubrica}</span>
                    <span className="text-[11px] text-slate-400 block">
                      {d.nr_comprovantes_anexados && d.nr_comprovantes_anexados > 0 ? \`\${d.nr_comprovantes_anexados} comprovante(s)\` : 'Sem anexo'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-bold text-slate-900 font-mono">{formatCurrencyBRL(Number(d.dc_valor_despesa))}</span>
                    {onEditExpense && (
                      <button 
                        type="button" 
                        onClick={() => onEditExpense(d)} 
                        className="text-[11px] text-slate-600 hover:text-slate-900 underline px-1 py-1"
                      >
                        Editar
                      </button>
                    )}
                    {onDeleteExpense && (
                      <button 
                        type="button" 
                        onClick={() => onDeleteExpense(d.id_despesa)} 
                        aria-label="Excluir despesa do dia"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenExpenseSheetForDay?.(selectedDay)}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-2 transition active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Lançar Comprovante / Despesa de Hoje</span>
          </button>
        </div>`;

content = content.replace(photoCardEnd, expenseCardJSX);
content = content.replace(photoCardEnd.replace(/\n/g, '\r\n'), expenseCardJSX.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/WizardStep2.tsx', content, 'utf8');
console.log('✅ WizardStep2.tsx atualizado com sucesso!');
