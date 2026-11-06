import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  Check, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Settings, 
  Bell, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  Smartphone,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { CustomSelect } from './CustomSelect';
import type { Missionario } from '../types';
import { triggerHaptic, getInitials, formatPhoneMask } from '../utils/formatters';

const CARGOS_SUGERIDOS = [
  'Ancião',
  'Cooperador do Ofício Ministerial',
  'Cooperador de Jovens e Menores',
  'Diácono',
  'Irmã da Piedade / Apoio',
  'Irmão de Apoio',
  'Administração / Tesouraria'
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: Missionario | null;
  membros: Missionario[];
  onSelectActiveMember: (id: string) => void;
  onSaveProfile: (data: {
    id_missionario: string;
    nm_missionario: string;
    t_cargo_tipo: string;
    t_telefone?: string;
    t_email?: string;
  }) => Promise<void>;
  onAddNewMember?: (data: {
    nm_missionario: string;
    t_cargo_tipo: string;
    t_telefone?: string;
    t_email?: string;
  }) => Promise<void>;
  onOpenReminderSettings?: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  membros,
  onSelectActiveMember,
  onSaveProfile,
  onAddNewMember,
  onOpenReminderSettings,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'trocar'>('dados');
  
  // Form fields para edição do perfil
  const [formNome, setFormNome] = useState('');
  const [formCargo, setFormCargo] = useState(CARGOS_SUGERIDOS[0]);
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form fields para adicionar outro irmão rápido
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCargo, setNewCargo] = useState(CARGOS_SUGERIDOS[0]);
  const [newTelefone, setNewTelefone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  useEffect(() => {
    if (isOpen && currentMember) {
      setFormNome(currentMember.nm_missionario);
      setFormCargo(currentMember.t_cargo_tipo || CARGOS_SUGERIDOS[0]);
      setFormTelefone(currentMember.t_telefone ? formatPhoneMask(currentMember.t_telefone) : '');
      setFormEmail(currentMember.t_email || '');
      setIsAddingNew(false);
    }
  }, [isOpen, currentMember]);

  const handleSaveDados = async () => {
    if (!currentMember) return;
    if (!formNome.trim()) {
      onShowToast('Informe o seu nome completo.', 'warning');
      return;
    }

    triggerHaptic('medium');
    setIsSaving(true);
    try {
      await onSaveProfile({
        id_missionario: currentMember.id_missionario,
        nm_missionario: formNome.trim(),
        t_cargo_tipo: formCargo,
        t_telefone: formTelefone.trim() || undefined,
        t_email: formEmail.trim() || undefined
      });
      onShowToast('Seu perfil foi atualizado com sucesso!', 'success');
    } catch {
      onShowToast('Erro ao atualizar os dados do perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewMember = async () => {
    if (!newNome.trim()) {
      onShowToast('Informe o nome do novo irmão.', 'warning');
      return;
    }

    triggerHaptic('medium');
    setIsSavingNew(true);
    try {
      if (onAddNewMember) {
        await onAddNewMember({
          nm_missionario: newNome.trim(),
          t_cargo_tipo: newCargo,
          t_telefone: newTelefone.trim() || undefined,
          t_email: newEmail.trim() || undefined
        });
        onShowToast('Novo membro cadastrado com sucesso!', 'success');
        setIsAddingNew(false);
        setNewNome('');
        setNewTelefone('');
        setNewEmail('');
      }
    } catch {
      onShowToast('Erro ao cadastrar novo membro.', 'error');
    } finally {
      setIsSavingNew(false);
    }
  };

  const cargoOptions = CARGOS_SUGERIDOS.map((c) => ({
    value: c,
    label: c
  }));

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {getInitials(currentMember?.nm_missionario)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Meu Perfil
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Identidade ativa neste dispositivo
            </p>
          </div>
        </div>
      }
      contentClassName="px-4 py-3 overflow-y-auto flex-1 space-y-4 overscroll-contain"
    >
      {/* 1. Card de Identidade do Usuário Ativo */}
      <div className="bg-gradient-to-br from-slate-900 to-[#132B45] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/10 ring-2 ring-white/30 text-white flex items-center justify-center text-lg font-black shadow-inner">
              {getInitials(currentMember?.nm_missionario)}
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white truncate leading-tight">
                {currentMember?.nm_missionario || 'Irmão do Ministério'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                Você
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium mt-0.5 truncate">
              {currentMember?.t_cargo_tipo || 'Ministério CCB'}
            </p>

            <div className="flex items-center gap-x-3 text-[11px] text-slate-400 mt-2 truncate">
              {currentMember?.t_telefone && (
                <span className="flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{formatPhoneMask(currentMember.t_telefone)}</span>
                </span>
              )}
              {currentMember?.t_email && (
                <span className="flex items-center space-x-1 truncate">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{currentMember.t_email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seletor de Sub-abas: Meus Dados vs Trocar Usuário */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('dados');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'dados'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Meus Dados</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('trocar');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'trocar'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Trocar Usuário ({membros.length})</span>
        </button>
      </div>

      {/* Conteúdo Aba: MEUS DADOS */}
      {activeTab === 'dados' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Editar Meus Dados Cadastrais
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seus dados serão vinculados automaticamente aos novos relatórios e viagens que você iniciar.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Thomas Fontes"
                className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo / Ministério *
              </label>
              <CustomSelect
                value={formCargo}
                onChange={(val) => setFormCargo(val)}
                options={cargoOptions}
                placeholder="Selecione seu cargo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={formTelefone}
                onChange={(e) => setFormTelefone(formatPhoneMask(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Institucional ou Pessoal
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-800 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDados}
            className="w-full h-11 rounded-xl bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.985] disabled:opacity-75 cursor-pointer mt-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Salvando perfil...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Alterações do Meu Perfil</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Conteúdo Aba: TROCAR USUÁRIO DESTE APARELHO */}
      {activeTab === 'trocar' && (
        <div className="space-y-3">
          <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3.5 text-xs text-sky-900">
            <span className="font-bold block mb-0.5 flex items-center space-x-1.5">
              <Smartphone className="w-4 h-4 text-sky-700" />
              <span>Compartilhamento de Dispositivo</span>
            </span>
            <p className="text-[11px] text-sky-800/90 leading-relaxed">
              Se outro irmão estiver utilizando este celular ou tablet para preencher relatórios, selecione o nome dele abaixo para que as viagens fiquem no perfil correto.
            </p>
          </div>

          {/* Lista de Membros */}
          <div className="space-y-2">
            {membros.map((m) => {
              const isSelected = m.id_missionario === currentMember?.id_missionario;

              return (
                <div
                  key={m.id_missionario}
                  onClick={() => {
                    if (!isSelected) {
                      triggerHaptic('medium');
                      onSelectActiveMember(m.id_missionario);
                      onShowToast(`Perfil alterado para ${m.nm_missionario}`, 'info');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-white text-slate-900 ring-2 ring-emerald-400'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getInitials(m.nm_missionario)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold truncate block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {m.nm_missionario}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white shrink-0">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span className={`text-xs block mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {m.t_cargo_tipo || 'Ministério'}
                      </span>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3px]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Selecionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Adicionar Novo Irmão Rápido */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsAddingNew(true);
              }}
              className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center space-x-2 transition bg-white/50 hover:bg-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Não está na lista? Cadastrar Novo Irmão</span>
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Novo Irmão da Equipe</span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              <input
                type="text"
                placeholder="Nome completo do irmão"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-slate-800 focus:outline-none"
              />

              <CustomSelect
                value={newCargo}
                onChange={(val) => setNewCargo(val)}
                options={cargoOptions}
                placeholder="Cargo / Ministério"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  placeholder="Telefone / WhatsApp"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(formatPhoneMask(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-slate-800 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="E-mail (opcional)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-slate-800 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={isSavingNew}
                onClick={handleCreateNewMember}
                className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-75 cursor-pointer"
              >
                {isSavingNew ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Cadastrar e Adicionar à Equipe</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Atalho de Lembretes Diários e Configurações */}
      {onOpenReminderSettings && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
            onOpenReminderSettings();
          }}
          className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 flex items-center justify-between text-left transition cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              <Bell className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Lembretes & Notificações Push
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Configurar horário de aviso do diário de viagem
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </BottomSheet>
  );
};
