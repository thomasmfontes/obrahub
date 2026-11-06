import fs from 'fs';

// 1. Fix WizardStep2.tsx
let w2 = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');

// Fix cleanKm
w2 = w2.replace(
  "const cleanKm = (kmPercorridos || '').replace(/\\D/g, '').slice(0, 6);",
  "const cleanKm = String(kmPercorridos || '').split('.')[0].replace(/\\D/g, '').slice(0, 6);"
);

// Remove the second duplicate expense card
const cardRegex = /        {\/\* Card 4: Despesas e Comprovantes do Dia \*\/}[\s\S]*?<\/div>\s*<\/div>\n\n        {\/\* Card 4: Despesas e Comprovantes do Dia \*\//;
if (cardRegex.test(w2.replace(/\r\n/g, '\n'))) {
  let normalized = w2.replace(/\r\n/g, '\n');
  const target = `        {/* Card 4: Despesas e Comprovantes do Dia */}
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
        </div>\n\n`;
  
  const first = normalized.indexOf(target);
  if (first !== -1) {
    const second = normalized.indexOf(target, first + target.length);
    if (second !== -1) {
      normalized = normalized.substring(0, second) + normalized.substring(second + target.length);
      w2 = normalized;
    }
  }
}
fs.writeFileSync('src/components/WizardStep2.tsx', w2, 'utf8');

// 2. Fix App.tsx line 500
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  "kmPercorridos: Number(diario?.dc_km_percorridos) > 0 ? String(diario!.dc_km_percorridos) : '',",
  "kmPercorridos: Number(diario?.dc_km_percorridos) > 0 ? String(Math.round(Number(diario!.dc_km_percorridos))) : '',"
);
fs.writeFileSync('src/App.tsx', app, 'utf8');

console.log('✅ Correções aplicadas!');
