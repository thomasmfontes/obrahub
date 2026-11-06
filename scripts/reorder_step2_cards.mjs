import fs from 'fs';

let content = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');

// The expense card block
const expenseCard = `        {/* Card 4: Despesas e Comprovantes do Dia */}
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

// 1. Remove expenseCard from the bottom
content = content.replace(expenseCard, '');
content = content.replace(expenseCard.replace(/\n/g, '\r\n'), '');

// 2. Insert expenseCard right after Deslocamento no Dia
const deslocamentoEnd = `        {/* Card 1: Deslocamento no Dia */}`;
const deslocamentoFullCardEnd = `              {/* Campo 2: Tempo de Trajeto Segmentado Profissional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Tempo de Trajeto
                </label>
                <div 
                  onClick={() => {
                    if (!localHours && !localMinutes) {
                      hoursInputRef.current?.focus();
                    }
                  }}
                  className="h-11 bg-white border border-slate-200 rounded-xl flex items-center px-3 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900/10 transition shadow-2xs cursor-text"
                >
                  <div className="flex items-center space-x-1 flex-1 justify-center">
                    <input 
                      aria-label="Tempo de trajeto em horas" ref={hoursInputRef}
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="00"
                      maxLength={2}
                      value={localHours}
                      onChange={handleHoursChange}
                      onBlur={handleBlurDuration}
                      className="w-7 text-center text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent placeholder:text-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-400 select-none pointer-events-none">h</span>
                  </div>

                  <span className="text-slate-300 font-bold select-none text-xs sm:text-sm mx-1">:</span>

                  <div className="flex items-center space-x-1 flex-1 justify-center">
                    <input 
                      aria-label="Tempo de trajeto em minutos" ref={minutesInputRef}
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="00"
                      maxLength={2}
                      value={localMinutes}
                      onChange={handleMinutesChange}
                      onKeyDown={handleMinutesKeyDown}
                      onBlur={handleBlurDuration}
                      className="w-7 text-center text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent placeholder:text-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-400 select-none pointer-events-none">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>`;

const targetBeforeAtividades = `        {/* Card 2: Atividades Ministeriais */}`;

content = content.replace(
  targetBeforeAtividades,
  `${expenseCard}\n\n        {/* Card 2: Atividades Ministeriais */}`
);
content = content.replace(
  targetBeforeAtividades.replace(/\n/g, '\r\n'),
  `${expenseCard.replace(/\n/g, '\r\n')}\r\n\r\n        {/* Card 2: Atividades Ministeriais */}`
);

fs.writeFileSync('src/components/WizardStep2.tsx', content, 'utf8');
console.log('✅ WizardStep2.tsx reposicionado com sucesso!');
