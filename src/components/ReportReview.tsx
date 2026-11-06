import { BottomSheet } from './BottomSheet';
import type { DespesaRubrica } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';

interface Props {
  open: boolean; busy: boolean; state: 'loading' | 'ready' | 'error'; error: string;
  missionario: string; destino: string; saida: string; retorno: string; comitiva: number; total: number;
  objetivo: string; protocolo: string;
  missingDays: string[]; missingReceipts: DespesaRubrica[];
  emails: string[]; declared: boolean;
  onDeclare: (value: boolean) => void; onClose: () => void; onRetry: () => void;
  onBasic: () => void; onDay: (day: string) => void; onExpense: (expense: DespesaRubrica) => void; onConfirm: () => void;
}
const date = (value?: string | null) => {
  if (!value || typeof value !== 'string') return '';
  const parts = value.split('-');
  return parts.length === 3 ? parts.reverse().join('/') : value;
};
export function ReportReview(props: Props) {
  return <BottomSheet wide isOpen={props.open} dismissDisabled={props.busy} onClose={props.onClose} title="Revisar antes de finalizar" footer={
    <div className="space-y-2">
      {!props.declared && <p className="text-sm text-rose-800">Para finalizar, marque a declaração de idoneidade na revisão.</p>}
      {props.state !== 'ready' && <p className="text-sm text-slate-700">A revisão precisa carregar com sucesso antes da finalização.</p>}
      <button type="button" disabled={props.busy || props.state !== 'ready' || !props.declared} onClick={props.onConfirm} className="w-full h-12 rounded-xl bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs flex items-center justify-center transition shadow-xs active:scale-[0.985] disabled:opacity-50 cursor-pointer">{props.busy ? 'Aguarde…' : 'Confirmar finalização'}</button>
    </div>
  }>
    <div className="desktop-review space-y-4 text-sm">
      <section className="space-y-2">
        <h4 className="font-bold">Dados da viagem</h4>
        <p>Relatório #{props.protocolo}</p>
        <p>{props.missionario} · {props.destino}</p>
        <p>{date(props.saida)} a {date(props.retorno)} · {props.comitiva} integrante(s)</p>
        <p className="break-words">Objetivo: {props.objetivo || 'Não informado'}</p>
        <p className="font-semibold">Total de despesas: {formatCurrencyBRL(props.total)}</p>
        <button type="button" disabled={props.busy} onClick={props.onBasic} className="min-h-11 underline">Conferir dados da viagem</button>
      </section>
      <section className="space-y-2">
        <h4 className="font-bold">Destinatários selecionados</h4>
        {props.emails.length ? props.emails.map(email => <p key={email} className="break-all">{email}</p>) : <p>Nenhum destinatário selecionado.</p>}
        <p className="text-slate-600">Após concluir, você poderá conferir os destinatários e preparar o e-mail. Finalizar não envia a mensagem.</p>
      </section>
      {props.state === 'loading' && <p role="status">Carregando os relatos e comprovantes para revisão…</p>}
      {props.error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-800">{props.error}</p>}
      {props.state === 'error' && <button type="button" disabled={props.busy} onClick={props.onRetry} className="min-h-11 underline">Tentar carregar revisão novamente</button>}
      {props.state === 'ready' && <section className="desktop-span-all rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
        <h4 className="font-bold">Avisos para conferência</h4>
        <p>Relatos e comprovantes ausentes são avisos e permitem finalizar.</p>
        {props.missingDays.length === 0 && props.missingReceipts.length === 0 && <p>Nenhum aviso de relato ou comprovante ausente.</p>}
        {props.missingDays.length > 0 && <details open={props.missingDays.length <= 7}><summary className="cursor-pointer py-2 font-semibold">{props.missingDays.length} dia(s) sem relato de atividades</summary>{props.missingDays.map(day => <button key={day} type="button" disabled={props.busy} onClick={() => props.onDay(day)} className="block min-h-11 underline">Conferir diário de {date(day)}</button>)}</details>}
        {props.missingReceipts.map(expense => <button key={expense.id_despesa} type="button" disabled={props.busy} onClick={() => props.onExpense(expense)} className="block min-h-11 text-left underline">Conferir comprovante: {expense.nm_rubrica} · {formatCurrencyBRL(Number(expense.dc_valor_despesa))}</button>)}
      </section>}
      <label className="desktop-span-all flex gap-3 items-start p-3 rounded-xl border border-slate-200">
        <input type="checkbox" disabled={props.busy} checked={props.declared} onChange={event => props.onDeclare(event.target.checked)} className="mt-1 w-5 h-5 shrink-0" />
        <span>Atesto que as despesas possuem idoneidade fiscal e se destinam exclusivamente às necessidades da Obra.</span>
      </label>
    </div>
  </BottomSheet>;
}
