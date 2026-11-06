import React, { useState } from 'react';
import { 
  Mail, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import type { DestinatarioNotificacao } from '../types';
import { triggerHaptic, getInitials } from '../utils/formatters';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinatarios: DestinatarioNotificacao[];
  onSaveDestinatario: (data: {
    id_destinatario?: string;
    nm_destinatario: string;
    t_email: string;
    t_cargo_departamento?: string;
    t_envio_automatico?: boolean;
  }) => Promise<void>;
  onDeleteDestinatario: (id: string) => Promise<void>;
  onToggleAutomatico: (id: string, ativo: boolean) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  isPushEnabled?: boolean;
  onEnablePush?: () => void;
  isRegisteringPush?: boolean;
  onOpenSettings?: () => void;
  horarioLembrete?: string;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  destinatarios,
  onSaveDestinatario,
  onDeleteDestinatario,
  onToggleAutomatico,
  onShowToast
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [envioAuto, setEnvioAuto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNome('');
    setEmail('');
    setCargo('');
    setEnvioAuto(true);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onShowToast('Informe o nome do destinatário.', 'warning');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      onShowToast('Informe um e-mail válido.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveDestinatario({
        nm_destinatario: nome.trim(),
        t_email: email.trim().toLowerCase(),
        t_cargo_departamento: cargo.trim() || 'Gestão Ministerial',
        t_envio_automatico: envioAuto
      });
      triggerHaptic('medium');
      onShowToast('Destinatário cadastrado com sucesso!', 'success');
      resetForm();
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao salvar destinatário.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nomeDest: string) => {
    triggerHaptic('light');
    try {
      await onDeleteDestinatario(id);
      onShowToast(`${nomeDest} removido da lista de notificações.`, 'info');
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao remover destinatário.', 'error');
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    triggerHaptic('light');
    try {
      await onToggleAutomatico(id, !current);
      onShowToast(
        !current 
          ? 'Contato selecionado por padrão na preparação do e-mail.' 
          : 'Contato disponível para seleção manual.',
        'info'
      );
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao atualizar preferência.', 'error');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
            <Mail className="w-4 h-4 text-[#0B1B2B]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Destinatários de E-mail
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Contatos para envio da prestação de contas
            </p>
          </div>
        </div>
      }
      contentClassName="px-5 py-3 overflow-y-auto flex-1 space-y-4 overscroll-contain"
      footer={
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs transition active:scale-[0.985] cursor-pointer"
        >
          Concluir
        </button>
      }
    >
      {/* Cabeçalho da Lista + Botão Adicionar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Destinatários
          </h4>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
            {destinatarios.length}
          </span>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsAdding(true);
            }}
            className="h-8 px-3 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar</span>
          </button>
        )}
      </div>

      {/* Formulário de Novo Destinatário */}
      {isAdding && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">Novo Destinatário</span>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nome do Responsável / Órgão *
              </label>
              <input
                type="text"
                placeholder="Ex: Ir. Salvador, Tesouraria Central..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]/20 focus:border-[#0B1B2B]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                E-mail para envio *
              </label>
              <input
                type="email"
                placeholder="exemplo@ministerio.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]/20 focus:border-[#0B1B2B]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cargo / Departamento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Conselho Fiscal, Auditoria, Secretaria..."
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]/20 focus:border-[#0B1B2B]"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={envioAuto}
                  onChange={(e) => setEnvioAuto(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0B1B2B] focus:ring-[#0B1B2B]"
                />
                <span className="text-[11px] text-slate-700 font-medium">
                  Selecionar por padrão ao preparar o e-mail
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={resetForm}
              className="h-9 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Salvar Contato</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Destinatários */}
      <div className="space-y-2.5">
        {destinatarios.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-slate-800">Nenhum destinatário cadastrado</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Cadastre membros do conselho fiscal ou tesouraria para receberem as prestações de contas oficiais por e-mail.
            </p>
          </div>
        ) : (
          destinatarios.map((d) => (
            <div
              key={d.id_destinatario}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.02)] hover:border-slate-300 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Avatar elegante */}
                <div className="w-10 h-10 rounded-full bg-[#0B1B2B] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {getInitials(d.nm_destinatario)}
                </div>

                {/* Detalhes do contato */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate leading-tight">
                      {d.nm_destinatario}
                    </h4>
                    {d.t_cargo_departamento && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                        {d.t_cargo_departamento}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 truncate mt-0.5 font-normal">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{d.t_email}</span>
                  </div>
                </div>
              </div>

              {/* Ações: Toggle Padrão/Opcional + Excluir */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  title={d.t_envio_automatico ? 'Marcado como padrão (toque para alternar)' : 'Opcional (toque para marcar como padrão)'}
                  onClick={() => handleToggle(d.id_destinatario, d.t_envio_automatico)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer ${
                    d.t_envio_automatico
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200/80 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${d.t_envio_automatico ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{d.t_envio_automatico ? 'Padrão' : 'Opcional'}</span>
                </button>

                <button
                  type="button"
                  title="Excluir destinatário"
                  aria-label={`Excluir ${d.nm_destinatario}`}
                  onClick={() => handleDelete(d.id_destinatario, d.nm_destinatario)}
                  className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition active:scale-90 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Nota de rodapé explicativa sutil estilo Apple */}
      {destinatarios.length > 0 && (
        <p className="text-center text-[11px] text-slate-400 font-medium px-4 pt-1">
          Contatos marcados como <span className="text-slate-600 font-semibold">Padrão</span> são pré-selecionados ao concluir a viagem.
        </p>
      )}
    </BottomSheet>
  );
};
