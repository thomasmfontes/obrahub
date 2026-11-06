import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Bell,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import type { Missionario, DestinatarioNotificacao } from '../types';
import { triggerHaptic } from '../utils/formatters';
import { saveMissionario, deleteMissionario } from '../services/neon';
import { BottomSheet } from './BottomSheet';
import { CustomSelect } from './CustomSelect';

interface MembrosTabProps {
  membros: Missionario[];
  isLoading: boolean;
  loadUnavailable?: boolean;
  recipientsUnavailable?: boolean;
  onRefresh: () => Promise<void>;
  onShowNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  destinatarios?: DestinatarioNotificacao[];
  currentMemberId?: string;
  onSelectActiveMember?: (id: string) => void;
  onOpenProfile?: () => void;
  onSaveDestinatario?: (data: {
    id_destinatario?: string;
    nm_destinatario: string;
    t_email: string;
    t_cargo_departamento?: string;
    t_envio_automatico?: boolean;
  }) => Promise<void>;
  onDeleteDestinatario?: (id: string) => Promise<void>;
  onToggleAutomatico?: (id: string, ativo: boolean) => Promise<void>;
}

const CARGOS_SUGERIDOS = [
  'Ancião',
  'Cooperador do Ofício Ministerial',
  'Cooperador de Jovens e Menores',
  'Diácono',
  'Irmã da Piedade / Apoio',
  'Irmão de Apoio',
  'Administração / Tesouraria'
];

export const MembrosTab: React.FC<MembrosTabProps> = ({ 
  membros, 
  isLoading,
  loadUnavailable = false,
  recipientsUnavailable = false, 
  onRefresh,
  onShowNotification,
  destinatarios = [],
  currentMemberId,
  onSelectActiveMember,
  onOpenProfile,
  onSaveDestinatario,
  onDeleteDestinatario,
  onToggleAutomatico
}) => {
  const [subTab, setSubTab] = useState<'irmaos' | 'notificacoes'>('irmaos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Cadastro / Edição via BottomSheet Padrão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields Irmãos
  const [formNome, setFormNome] = useState('');
  const [formCargo, setFormCargo] = useState(CARGOS_SUGERIDOS[0]);
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Form fields Destinatários de Notificação
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [destNome, setDestNome] = useState('');
  const [destEmail, setDestEmail] = useState('');
  const [destCargo, setDestCargo] = useState('');
  const [destEnvioAuto, setDestEnvioAuto] = useState(true);
  const [isSavingDest, setIsSavingDest] = useState(false);

  // Confirmação de exclusão acessível (WCAG 2.4.3 e 2.1.2)
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (deletingId) {
      const timer = setTimeout(() => {
        cancelDeleteRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isDeleting) {
          e.stopPropagation();
          setDeletingId(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [deletingId, isDeleting]);

  // Handlers Destinatários
  const handleOpenNewDest = () => {
    triggerHaptic('medium');
    setDestNome('');
    setDestEmail('');
    setDestCargo('');
    setDestEnvioAuto(true);
    setIsDestModalOpen(true);
  };

  const handleSaveDest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destNome.trim()) {
      onShowNotification('Informe o nome do destinatário.', 'warning');
      return;
    }
    if (!destEmail.trim() || !destEmail.includes('@')) {
      onShowNotification('Informe um e-mail válido.', 'warning');
      return;
    }

    setIsSavingDest(true);
    triggerHaptic('medium');
    try {
      await onSaveDestinatario?.({
        nm_destinatario: destNome.trim(),
        t_email: destEmail.trim().toLowerCase(),
        t_cargo_departamento: destCargo.trim() || 'Gestão Ministerial',
        t_envio_automatico: destEnvioAuto
      });
      onShowNotification('Destinatário cadastrado com sucesso!', 'success');
      setIsDestModalOpen(false);
    } catch (err) {
      console.error(err);
      onShowNotification('Erro ao salvar destinatário.', 'error');
    } finally {
      setIsSavingDest(false);
    }
  };

  const handleDeleteDest = async (id: string, nome: string) => {
    triggerHaptic('light');
    try {
      await onDeleteDestinatario?.(id);
      onShowNotification(`${nome} removido da lista de transmissão.`, 'info');
    } catch (err) {
      console.error(err);
      onShowNotification('Erro ao remover destinatário.', 'error');
    }
  };

  const handleToggleAuto = async (id: string, current: boolean) => {
    triggerHaptic('light');
    try {
      await onToggleAutomatico?.(id, !current);
      onShowNotification(
        !current ? 'Contato selecionado por padrão.' : 'Contato disponível para seleção manual.',
        'info'
      );
    } catch (err) {
      console.error(err);
      onShowNotification('Erro ao atualizar preferência.', 'error');
    }
  };

  const filteredMembros = membros.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchName = (m.nm_missionario || '').toLowerCase().includes(term);
    const matchCargo = (m.t_cargo_tipo || '').toLowerCase().includes(term);
    const matchCred = (m.nm_credencial_pastoral || '').toLowerCase().includes(term);
    const matchTel = (m.t_telefone || '').toLowerCase().includes(term);
    const matchEmail = (m.t_email || '').toLowerCase().includes(term);
    return matchName || matchCargo || matchCred || matchTel || matchEmail;
  });

  const currentMember = membros.find(m => m.id_missionario === currentMemberId) || (membros.length > 0 ? membros[0] : null);
  const outrosMembros = filteredMembros.filter(m => m.id_missionario !== currentMember?.id_missionario);

  const getInitials = (name: string) => {
    if (!name) return 'IR';
    const clean = name.replace(/^(Pr\.|Miss\.|Ev\.|Dca\.|Dc\.|Ir\.|Irª\.)\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) return 'IR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleOpenNew = () => {
    triggerHaptic('medium');
    setEditingId(null);
    setFormNome('');
    setFormCargo(CARGOS_SUGERIDOS[0]);
    setFormTelefone('');
    setFormEmail('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Missionario) => {
    triggerHaptic('light');
    setEditingId(m.id_missionario);
    setFormNome(m.nm_missionario);
    setFormCargo(m.t_cargo_tipo || CARGOS_SUGERIDOS[0]);
    setFormTelefone(m.t_telefone ? formatPhoneMask(m.t_telefone) : '');
    setFormEmail(m.t_email || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      onShowNotification('Informe o nome do irmão.', 'warning');
      return;
    }

    setIsSaving(true);
    triggerHaptic('medium');

    try {
      await saveMissionario({
        id_missionario: editingId || undefined,
        nm_missionario: formNome.trim(),
        t_cargo_tipo: formCargo.trim(),
        nm_credencial_pastoral: (editingId ? membros.find((m: any) => m.id_missionario === editingId)?.nm_credencial_pastoral : null) || 'Ministério / Atendimento',
        t_telefone: formTelefone.trim() || undefined,
        t_email: formEmail.trim() || undefined,
        t_ativo: true
      });

      onShowNotification(
        editingId ? 'Irmão atualizado com sucesso!' : 'Irmão cadastrado com sucesso!', 
        'success'
      );
      setIsModalOpen(false);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao salvar irmão:', err);
      onShowNotification('Não foi possível salvar no banco de dados.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    triggerHaptic('medium');
    try {
      await deleteMissionario(id);
      onShowNotification('Irmão desativado do ministério.', 'info');
      setDeletingId(null);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao desativar irmão:', err);
      onShowNotification('Erro ao desativar irmão.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="desktop-page flex-1 px-4 pt-5 safe-pb-dock space-y-4 overflow-y-auto overscroll-y-contain">
      {/* Header Padronizado e Limpo */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Ministério
          </h1>
        </div>

        <button
          type="button"
          onClick={subTab === 'irmaos' ? handleOpenNew : handleOpenNewDest}
          aria-label={subTab === 'irmaos' ? 'Cadastrar Irmão' : 'Cadastrar E-mail'}
          title={subTab === 'irmaos' ? 'Cadastrar Irmão' : 'Cadastrar E-mail'}
          className="w-10 h-10 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Segmented Control Minimalista */}
      <div className="bg-slate-100 p-1 rounded-xl flex shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSubTab('irmaos');
          }}
          className={`flex-1 py-1.5 text-xs rounded-lg transition font-semibold text-center ${
            subTab === 'irmaos'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Membros ({isLoading || loadUnavailable ? '—' : membros.length})
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSubTab('notificacoes');
          }}
          className={`flex-1 py-1.5 text-xs rounded-lg transition font-semibold text-center ${
            subTab === 'notificacoes'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          E-mails ({recipientsUnavailable ? '—' : destinatarios.length})
        </button>
      </div>

      {/* ========================================================
          SUB-ABA 1: CORPO MINISTERIAL (IRMÃOS)
      ======================================================== */}
      {subTab === 'irmaos' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">

          {/* Barra de Pesquisa no topo da aba */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="membro-search"
              aria-label="Buscar por nome ou ministério"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou ministério..."
              className="w-full h-11 pl-10 pr-4 bg-white rounded-xl border border-slate-200/80 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-sm"
            />
          </div>

          {/* Linha Minimalista: Meu Perfil (Você) */}
          {!searchTerm && currentMember && (
            <div
              onClick={() => {
                triggerHaptic('light');
                onOpenProfile?.();
              }}
              className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition active:scale-[0.99]"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {getInitials(currentMember.nm_missionario)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {currentMember.nm_missionario}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      Você
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 truncate block mt-0.5">
                    {currentMember.t_cargo_tipo}{currentMember.t_telefone ? ` • ${formatPhoneMask(currentMember.t_telefone)}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 pl-2 shrink-0">
                <span className="text-xs font-medium text-slate-400">Editar</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Cabeçalho da Lista de Outros Membros */}
          {!searchTerm && (
            <div className="pt-1 px-0.5 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Equipe Ministerial e Colaboradores
                </h4>
                <p className="text-[11px] text-slate-500">
                  {outrosMembros.length === 0 
                    ? 'Nenhum outro irmão cadastrado' 
                    : `${outrosMembros.length} outro(s) irmão(s) para escalas e viagens`}
                </p>
              </div>
            </div>
          )}

          {searchTerm && (
            <div className="pt-1 px-0.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Resultados da Busca
              </h4>
              <p className="text-[11px] text-slate-500">
                {filteredMembros.length} irmão(s) encontrado(s)
              </p>
            </div>
          )}

          {/* Lista de Membros */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs font-medium">Carregando irmãos do ministério...</p>
            </div>
          ) : loadUnavailable && membros.length === 0 ? null : (searchTerm ? filteredMembros : outrosMembros).length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 text-center space-y-2.5 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                {searchTerm ? 'Nenhum irmão encontrado' : 'Nenhum outro membro cadastrado na equipe'}
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {searchTerm 
                  ? 'Tente buscar por outro termo ou limpe a busca.' 
                  : 'Para adicionar outros irmãos do ministério às suas escalas, use o botão + no topo.'}
              </p>
            </div>
          ) : (
            <div className="desktop-card-list space-y-3">
              {(searchTerm ? filteredMembros : outrosMembros).map((m) => {
            const rawPhone = (m.t_telefone || '').replace(/\D/g, '');
            const hasPhone = rawPhone.length >= 10;
            const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

            return (
              <div
                key={m.id_missionario}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      {m.t_foto_avatar_url ? (
                        <img
                          src={m.t_foto_avatar_url}
                          alt={m.nm_missionario}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-sm shadow-2xs ring-1 ring-slate-200">
                          {getInitials(m.nm_missionario)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {m.nm_missionario}
                        </h3>
                        {m.id_missionario === currentMember?.id_missionario && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            Você
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-sky-800 block mt-0.5">
                        {m.t_cargo_tipo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-0.5 -mr-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      aria-label="Editar"
                      title="Editar"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(m.id_missionario)}
                      aria-label="Excluir"
                      title="Excluir"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Botões de Ação Rápida: WhatsApp / Telefone / E-mail */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate max-w-[200px]">
                    <span className="text-xs font-medium text-slate-500 truncate">
                      {m.t_telefone ? formatPhoneMask(m.t_telefone) : (m.t_email || 'Sem contato salvo')}
                    </span>
                    {m.id_missionario !== currentMember?.id_missionario && onSelectActiveMember && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          onSelectActiveMember(m.id_missionario);
                          onShowNotification(`Aparelho configurado para ${m.nm_missionario}`, 'info');
                        }}
                        className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md transition shrink-0 cursor-pointer"
                        title="Definir como usuário ativo deste aparelho"
                      >
                        Tornar Ativo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Botão de WhatsApp */}
                    {hasPhone ? (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`A paz de Deus, ${m.nm_missionario}!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => triggerHaptic('light')}
                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60 flex items-center justify-center transition active:scale-95 shadow-2xs"
                        title="Conversar no WhatsApp"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" />
                      </a>
                    ) : (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`A paz de Deus, ${m.nm_missionario}!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => triggerHaptic('light')}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center transition active:scale-95"
                        title="WhatsApp"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon className="w-4 h-4 fill-slate-400" />
                      </a>
                    )}

                    {/* Botão de Ligação telefônica */}
                    {hasPhone && (
                      <a
                        href={`tel:${rawPhone}`}
                        onClick={() => triggerHaptic('light')}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition active:scale-95 shadow-2xs"
                        aria-label="Ligar"
                        title="Ligar"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Botão de E-mail */}
                    {m.t_email && (
                      <a
                        href={`mailto:${m.t_email}`}
                        onClick={() => triggerHaptic('light')}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition active:scale-95 shadow-2xs"
                        aria-label="Email"
                        title="Enviar E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* ========================================================
          SUB-ABA 2: TRANSMISSÃO DE RELATÓRIOS (DESTINATÁRIOS)
      ======================================================== */}
      {subTab === 'notificacoes' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Lista de Contatos */}
          {recipientsUnavailable && destinatarios.length === 0 ? null : destinatarios.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200/70 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Mail className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Nenhum e-mail cadastrado
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Cadastre os e-mails para envio dos relatórios concluídos.
              </p>
              <button
                type="button"
                onClick={handleOpenNewDest}
                className="mt-2 h-10 px-4 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar E-mail</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {destinatarios.map((d) => (
                <div
                  key={d.id_destinatario}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/70 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {getInitials(d.nm_destinatario)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {d.nm_destinatario}
                      </h3>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        {d.t_email}
                      </p>
                      {d.t_cargo_departamento && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {d.t_cargo_departamento}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAuto(d.id_destinatario, d.t_envio_automatico)}
                      title={d.t_envio_automatico ? "Selecionado por padrão (toque para alternar)" : "Seleção manual (toque para selecionar por padrão)"}
                      className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition flex items-center space-x-1.5 ${
                        d.t_envio_automatico
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200/60 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${d.t_envio_automatico ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{d.t_envio_automatico ? 'Padrão' : 'Manual'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDest(d.id_destinatario, d.nm_destinatario)}
                      aria-label="Excluir"
                      title="Excluir"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          BOTTOM SHEET: NOVO DESTINATÁRIO DE NOTIFICAÇÃO
      ======================================================== */}
      <BottomSheet
        isOpen={isDestModalOpen}
        onClose={() => setIsDestModalOpen(false)}
        title="Cadastrar Destinatário"
        footer={
          <button
            type="submit"
            form="dest-membros-form"
            disabled={isSavingDest}
            className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.985] disabled:opacity-50 cursor-pointer"
          >
            {isSavingDest ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Salvando no banco de dados...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                <span>Salvar Destinatário</span>
              </>
            )}
          </button>
        }
      >
        <form id="dest-membros-form" onSubmit={handleSaveDest} className="space-y-3.5 pt-1">
          <div>
            <label htmlFor="dest-nome" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Nome do Responsável ou Órgão <span className="text-rose-500">*</span>
            </label>
            <input
              id="dest-nome"
              type="text"
              required
              value={destNome}
              onChange={(e) => setDestNome(e.target.value)}
              placeholder="Ex: Ir. Salvador, Tesouraria Central..."
              className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
            />
          </div>

          <div>
            <label htmlFor="dest-email" className="text-xs font-semibold text-slate-700 block mb-1.5">
              E-mail para Envio <span className="text-rose-500">*</span>
            </label>
            <input
              id="dest-email"
              type="email"
              required
              value={destEmail}
              onChange={(e) => setDestEmail(e.target.value)}
              placeholder="exemplo@ministerio.org"
              className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
            />
          </div>

          <div>
            <label htmlFor="dest-cargo" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Cargo ou Departamento (opcional)
            </label>
            <input
              id="dest-cargo"
              type="text"
              value={destCargo}
              onChange={(e) => setDestCargo(e.target.value)}
              placeholder="Ex: Conselho Fiscal, Secretaria..."
              className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
            />
          </div>

          <div className="pt-1">
            <label htmlFor="dest-envio-auto" className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                id="dest-envio-auto"
                type="checkbox"
                checked={destEnvioAuto}
                onChange={(e) => setDestEnvioAuto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0B1B2B] focus:ring-[#0B1B2B]"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Selecionar este contato por padrão ao preparar o e-mail
              </span>
            </label>
          </div>


        </form>
      </BottomSheet>

      {/* ========================================================
          BOTTOM SHEET PADRÃO DO SISTEMA: CADASTRO / EDIÇÃO
      ======================================================== */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Irmão' : 'Cadastrar Irmão'}
        footer={
          <button
            type="submit"
            form="membro-membros-form"
            disabled={isSaving}
            className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.985] disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Salvando no banco de dados...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Irmão'}</span>
              </>
            )}
          </button>
        }
      >
        <form id="membro-membros-form" onSubmit={handleSave} className="space-y-3.5 pt-1">
          <div>
            <label htmlFor="membro-nome" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Nome do Irmão / Obreiro <span className="text-rose-500">*</span>
            </label>
            <input
              id="membro-nome"
              type="text"
              required
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: Ir. Samuel Albuquerque"
              className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
            />
          </div>

          <div>
            <label htmlFor="membro-funcao" id="label-membro-funcao" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Ministério / Função <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              id="membro-funcao"
              labelledBy="label-membro-funcao"
              value={formCargo}
              onChange={(val) => setFormCargo(val)}
              options={CARGOS_SUGERIDOS}
            />
          </div>

          

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="membro-telefone" className="text-xs font-semibold text-slate-700 block mb-1.5">
                WhatsApp / Telefone
              </label>
              <input
                id="membro-telefone"
                type="tel"
                value={formTelefone}
                onChange={(e) => setFormTelefone(formatPhoneMask(e.target.value))}
                placeholder="(11) 98765-4321"
                className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="membro-email" className="text-xs font-semibold text-slate-700 block mb-1.5">
                E-mail
              </label>
              <input
                id="membro-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
              />
            </div>
          </div>


        </form>
      </BottomSheet>

      {/* ========================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (VIA PORTAL)
      ======================================================== */}
      {deletingId && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeleting) setDeletingId(null);
          }}
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-delete-membro-title"
            aria-describedby="modal-delete-membro-desc"
            className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto" aria-hidden="true">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-delete-membro-title" className="text-sm font-bold text-slate-900">Inativar membro?</h3>
              <p id="modal-delete-membro-desc" className="text-xs text-slate-500 mt-1">
                O membro não aparecerá mais na lista ativa de comitivas e viagens.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                disabled={isDeleting}
                className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Inativar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
