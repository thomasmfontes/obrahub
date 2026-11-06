import fs from 'fs';

let content = fs.readFileSync('src/components/WizardStep3.tsx', 'utf8');

// 1. Import formatPillDate
content = content.replace(
  "import { formatCurrencyBRL, triggerHaptic } from '../utils/formatters';",
  "import { formatCurrencyBRL, triggerHaptic, formatPillDate } from '../utils/formatters';"
);

// 2. Display date badge next to category label
const oldBadge = `<span className="text-xs text-slate-400 font-medium truncate block mt-0.5">
                          {getCategoryLabel(d.t_icone_identificador)}
                        </span>`;

const newBadge = `<span className="text-xs text-slate-400 font-medium truncate block mt-0.5">
                          {getCategoryLabel(d.t_icone_identificador)}
                          {d.t_data_despesa && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                              {formatPillDate(d.t_data_despesa)}
                            </span>
                          )}
                        </span>`;

content = content.replace(oldBadge, newBadge);
content = content.replace(oldBadge.replace(/\n/g, '\r\n'), newBadge.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/WizardStep3.tsx', content, 'utf8');
console.log('✅ WizardStep3.tsx atualizado com sucesso!');
