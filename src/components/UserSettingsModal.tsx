import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Clock, 
  Check, 
  AlertCircle, 
  Smartphone, 
  Volume2, 
  Calendar, 
  ShieldCheck, 
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Mail,
  Play
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import type { ConfiguracaoLembrete, Missionario } from '../types';
import { triggerHaptic } from '../utils/formatters';
import { 
  getPushPermissionState, 
  requestPushPermission, 
  triggerLocalNotification, 
  sendDelayedTestNotification,
  playNotificationSound 
} from '../services/fcm';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracaoLembrete;
  onSaveConfig: (updated: Partial<ConfiguracaoLembrete>) => Promise<void>;
  missionario?: Missionario | null;
  onOpenDestinatarios?: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const PRESET_HOURS = [
  { time: '18:00', label: '18:00 (Fim de tarde)' },
  { time: '19:30', label: '19:30 (Jantar)' },
  { time: '20:00', label: '20:00 (Recomendado)' },
  { time: '21:30', label: '21:30 (Noite)' },
  { time: '22:00', label: '22:00 (Descanso)' }
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  missionario,
  onOpenDestinatarios,
  onShowToast
}) => {
  const [ativo, setAtivo] = useState(config.t_lembrete_ativo ?? true);
  const [hora, setHora] = useState(config.hr_lembrete ? config.hr_lembrete.slice(0, 5) : '20:00');
  const [somenteEmViagem, setSomenteEmViagem] = useState(config.t_somente_em_viagem ?? true);
  const [notificarPendencias, setNotificarPendencias] = useState(config.t_notificar_pendencias ?? true);
  const [somAtivo, setSomAtivo] = useState(config.t_som_ativo ?? true);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAtivo(config.t_lembrete_ativo ?? true);
      setHora(config.hr_lembrete ? config.hr_lembrete.slice(0, 5) : '20:00');
      setSomenteEmViagem(config.t_somente_em_viagem ?? true);
      setNotificarPendencias(config.t_notificar_pendencias ?? true);
      setSomAtivo(config.t_som_ativo ?? true);
      setPushStatus(getPushPermissionState());
    }
  }, [isOpen, config]);

  const handleRequestPush = async () => {
    triggerHaptic('medium');
    setIsRequestingPush(true);
    try {
      const res = await requestPushPermission(missionario?.id_missionario);
      setPushStatus(getPushPermissionState());
      if (res.success) {
        onShowToast('Notificações ativadas com sucesso neste aparelho!', 'success');
      } else {
        onShowToast(res.error || 'Permissão de notificação não concedida.', 'warning');
      }
    } catch {
      onShowToast('Não foi possível registrar o dispositivo.', 'error');
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleTestImmediate = async () => {
    triggerHaptic('light');
    const perm = getPushPermissionState();
    if (perm !== 'granted') {
      const req = await requestPushPermission(missionario?.id_missionario);
      setPushStatus(getPushPermissionState());
      if (!req.success) {
        onShowToast('É necessário permitir notificações no navegador para testar.', 'warning');
        return;
      }
    }

    const ok = await triggerLocalNotification({
      title: "ObraHub: Lembrete de Viagem 🔔",
      body: "Você tem recibos ou atividades de hoje para lançar? Toque aqui para preencher.",
      tag: "teste-imediato",
      data: { url: '/', step: 'step2' },
      playSound: somAtivo
    });

    if (ok) {
      onShowToast('Notificação de teste disparada! Verifique a barra do sistema.', 'success');
    } else {
      onShowToast('Navegador bloqueou a exibição da notificação.', 'error');
    }
  };

  const handlePlaySound = () => {
    triggerHaptic('light');
    setIsPlayingSound(true);
    playNotificationSound();
    setTimeout(() => setIsPlayingSound(false), 2200);
  };

  const handleTestCountdown = async () => {
    triggerHaptic('medium');
    const perm = getPushPermissionState();
    if (perm !== 'granted') {
      if (typeof Notification !== 'undefined') {
        const p = await Notification.requestPermission();
        setPushStatus(getPushPermissionState());
        if (p !== 'granted') {
          onShowToast('Permissão de notificação não concedida no navegador.', 'warning');
          return;
        }
      }
    }

    onShowToast('Contagem iniciada! Minimize a janela agora para ver o aviso.', 'info');
    setTestCountdown(5);

    const delivered = await sendDelayedTestNotification(5, (rem) => {
      setTestCountdown(rem > 0 ? rem : null);
    });

    if (delivered) {
      onShowToast('Notificação entregue pelo sistema!', 'success');
    }
    setTestCountdown(null);
  };

  const handleSave = async () => {
    triggerHaptic('medium');
    setIsSaving(true);
    try {
      await onSaveConfig({
        id_config: config.id_config,
        id_missionario: missionario?.id_missionario,
        t_lembrete_ativo: ativo,
        hr_lembrete: hora,
        t_somente_em_viagem: somenteEmViagem,
        t_notificar_pendencias: notificarPendencias,
        t_som_ativo: somAtivo
      });
      onShowToast('Configurações salvas com sucesso!', 'success');
      onClose();
    } catch {
      onShowToast('Erro ao salvar preferências.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
            <Settings className="w-4 h-4 text-[#0B1B2B]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Configurações de Uso
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Preferências de lembretes e rotina de viagem
            </p>
          </div>
        </div>
      }
      contentClassName="px-5 py-3 overflow-y-auto flex-1 space-y-4 overscroll-contain"
      footer={
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full h-12 rounded-xl bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.985] disabled:opacity-75 cursor-pointer"
        >
          {isSaving ? (
            <span className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Salvando preferências...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>Salvar Preferências de Lembrete</span>
            </span>
          )}
        </button>
      }
    >
      {/* 1. Card Principal de Lembrete Diário */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Lembrete Diário de Preenchimento
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Aviso para lançar o diário e notas antes de dormir
              </span>
            </div>
          </div>

          {/* Switch Nativo Customizado */}
          <button
            type="button"
            role="switch"
            aria-checked={ativo}
            onClick={() => {
              triggerHaptic('light');
              setAtivo(!ativo);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              ativo ? 'bg-[#0B1B2B]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                ativo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {ativo && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Seletor de Horário */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Horário da Notificação
              </label>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/60 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]/20 focus:border-[#0B1B2B]"
                  />
                </div>
              </div>

              {/* Pílulas de Atalhos de Horário */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {PRESET_HOURS.map((preset) => {
                  const isSelected = hora === preset.time;
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setHora(preset.time);
                      }}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
                        isSelected
                          ? 'bg-[#0B1B2B] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regras e Condições Adicionais */}
            <div className="pt-2 space-y-2.5 border-t border-slate-100 text-xs">
              <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={somenteEmViagem}
                  onChange={(e) => setSomenteEmViagem(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0B1B2B] rounded border-slate-300 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Apenas durante viagens em andamento
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Não notifica quando não houver relatório ativo em campo.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={notificarPendencias}
                  onChange={(e) => setNotificarPendencias(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0B1B2B] rounded border-slate-300 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Avisar se houver dias anteriores pendentes
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Alerta caso algum dia passado da comitiva esteja sem dados salvos.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
                <label className="flex items-start space-x-3 cursor-pointer flex-1 min-w-0 mr-2">
                  <input
                    type="checkbox"
                    checked={somAtivo}
                    onChange={(e) => setSomAtivo(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#0B1B2B] rounded border-slate-300 focus:ring-0 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block text-xs">
                      Alerta sonoro e vibração
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      Toque oficial ObraHub ao disparar o aviso.
                    </span>
                  </div>
                </label>

                {somAtivo && (
                  <button
                    type="button"
                    onClick={handlePlaySound}
                    disabled={isPlayingSound}
                    title="Ouvir toque personalizado"
                    aria-label="Ouvir toque personalizado"
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-90 shrink-0 cursor-pointer"
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingSound ? 'text-emerald-600 animate-pulse' : 'text-slate-600'}`} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dispositivo & Alertas - 100% Mobile Friendly (Sem truncamento) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            pushStatus === 'granted' 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Notificações no Aparelho
              </span>
              {pushStatus === 'granted' ? (
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                  <Check className="w-3 h-3 mr-1 text-emerald-600" />
                  Ativas
                </span>
              ) : pushStatus === 'denied' ? (
                <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                  Bloqueadas
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Pendente
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
              {pushStatus === 'granted'
                ? 'Avisos autorizados neste dispositivo'
                : pushStatus === 'denied'
                ? 'Permissão desativada nas configurações do navegador'
                : 'Ative para receber avisos nativos no seu aparelho'}
            </span>
          </div>
        </div>

        {/* Botão de Ação Full Width / Mobile Touch */}
        {pushStatus !== 'granted' ? (
          <button
            type="button"
            disabled={isRequestingPush}
            onClick={handleRequestPush}
            className="w-full h-9 rounded-xl bg-[#0B1B2B] hover:bg-[#132B45] text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-[0.985] shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isRequestingPush ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>Ativar Notificações no Aparelho</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={testCountdown !== null}
            onClick={handleTestCountdown}
            className="w-full h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-[0.985] shadow-2xs cursor-pointer disabled:opacity-80"
          >
            {testCountdown !== null ? (
              <span className="text-amber-700 font-bold animate-pulse text-xs">
                Enviando notificação em {testCountdown}s... (Pode minimizar)
              </span>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>Testar Notificação no Celular</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Atalho para Destinatários de E-mail */}
      {onOpenDestinatarios && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenDestinatarios();
          }}
          className="w-full p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 flex items-center justify-between text-left transition active:scale-[0.985] shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-[#0B1B2B] group-hover:text-white transition">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Destinatários de E-mail
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                Definir quem recebe a prestação de contas oficial
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
        </button>
      )}

    </BottomSheet>
  );
};
