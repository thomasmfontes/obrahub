import { ReportReview } from './components/ReportReview';
import { reportWarnings } from './utils/reportReview';
import { saveReportPosition, resolveReportPosition, clearReportPosition, type ReportPosition } from './utils/reportPosition';
import { tripDays } from './utils/tripDays';
import { agendaReportFields } from './utils/agendaReport';
import type { AgendaItem } from './types';
import { validateTrip } from './utils/tripValidation';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Info,
  Home, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  Fuel, 
  Utensils, 
  Bed, 
  Church, 
  UploadCloud, 
  X, 
  Loader2,
  Camera,
  Check,
  Trash2,
  Sparkles,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';

import { 
  getIndicadoresDashboard,
  getUltimoRelatorioAtivo,
  getAllRelatorios,
  getMissionarios,
  getPolos,
  saveRelatorioBasico, 
  getProximoProtocolo,
  getDiarioPorData,
  getDiaryDates,
  getReportReview,
  saveDiarioAtividade, 
  getEvidenciasFotos,
  saveEvidenciaFoto,
  deleteEvidenciaFoto,
  getDespesasRelatorio,
  saveDespesaRubrica,
  deleteDespesaRubrica,
  finalizarRelatorio,
  getDestinatariosNotificacao,
  saveDestinatarioNotificacao,
  deleteDestinatarioNotificacao,
  toggleEnvioAutomaticoDestinatario,
  getConfiguracaoLembrete,
  saveConfiguracaoLembrete,
  DEFAULT_CONFIG_LEMBRETE,
  saveMissionario
} from './services/neon';
import { uploadMissionPhoto } from './services/firebase';
import { requestPushPermission } from './services/fcm';
import { SaveQueue, type SaveStatus } from './utils/saveQueue';
import { loadResource, type LoadState } from './utils/loadResource';
import { LoadFeedback } from './components/LoadFeedback';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { BottomSheet } from './components/BottomSheet';
import { DashboardTab } from './components/DashboardTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { AgendaTab } from './components/AgendaTab';
import { MembrosTab } from './components/MembrosTab';
import { ReportDetailModal } from './components/ReportDetailModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { WizardHeader } from './components/WizardHeader';
import { WizardStep1 } from './components/WizardStep1';
import { WizardStep2 } from './components/WizardStep2';
import { WizardStep3 } from './components/WizardStep3';

import { 
  triggerHaptic, 
  parseCurrencyInput, 
  formatCurrencyBRL,
  calculateDaysBetween,
  normalizeDateToInput,
  maskDistancia,
  parseDistanceRaw,
  parseTrajetoToMinutes,
  formatMinutesToDuration
} from './utils/formatters';
import { scanReceiptImage } from './services/receiptOcr';
import type { 
  IndicadorMinisterial, 
  RelatorioViagem, 
  EvidenciaFotografica, 
  DespesaRubrica,
  Missionario,
  PoloMissionario,
  DestinatarioNotificacao,
  ConfiguracaoLembrete
} from './types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'step1' | 'step2' | 'step3'>('dashboard');
  const [activeTab, setActiveTab] = useState<'visao' | 'relatorios' | 'agenda' | 'membros'>('visao');

  // Dados reais carregados do Neon
  const [indicadores, setIndicadores] = useState<IndicadorMinisterial | null>(null);
  const [relatorioAtivo, setRelatorioAtivo] = useState<RelatorioViagem | null>(null);
  const [allRelatorios, setAllRelatorios] = useState<RelatorioViagem[]>([]);
  const [membros, setMembros] = useState<Missionario[]>([]);
  const [polos, setPolos] = useState<PoloMissionario[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  type ResourceKey = 'indicadores' | 'ativo' | 'relatorios' | 'membros' | 'polos' | 'destinatarios';
  const [loadStates, setLoadStates] = useState<Record<ResourceKey, LoadState>>({ indicadores: 'loading', ativo: 'loading', relatorios: 'loading', membros: 'loading', polos: 'loading', destinatarios: 'loading' });
  const knownResources = useRef(new Set<ResourceKey>());
  const loadingDashboardRef = useRef(false);

  // Perfil do Usuário Ativo
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    try {
      return localStorage.getItem('obrahub_active_member_id') || '';
    } catch {
      return '';
    }
  });

  const currentMember = useMemo(() => {
    if (!membros || membros.length === 0) return null;
    if (activeMemberId) {
      const found = membros.find(m => m.id_missionario === activeMemberId);
      if (found) return found;
    }
    return membros[0];
  }, [membros, activeMemberId]);

  const handleSelectActiveMember = (id: string) => {
    setActiveMemberId(id);
    try {
      localStorage.setItem('obrahub_active_member_id', id);
    } catch {}
    const m = membros.find(item => item.id_missionario === id);
    if (m) {
      setMissionario(m.nm_missionario);
    }
  };

  const handleSaveProfile = async (data: {
    id_missionario: string;
    nm_missionario: string;
    t_cargo_tipo: string;
    t_telefone?: string;
    t_email?: string;
  }) => {
    const existing = membros.find(m => m.id_missionario === data.id_missionario);
    await saveMissionario({
      id_missionario: data.id_missionario,
      nm_missionario: data.nm_missionario,
      nm_credencial_pastoral: existing?.nm_credencial_pastoral || 'Ministério / Atendimento',
      t_cargo_tipo: data.t_cargo_tipo,
      t_telefone: data.t_telefone,
      t_email: data.t_email,
      t_ativo: true
    });
    setMissionario(data.nm_missionario);
    await loadDashboardData();
  };

  const handleAddNewMemberFromProfile = async (data: {
    nm_missionario: string;
    t_cargo_tipo: string;
    t_telefone?: string;
    t_email?: string;
  }) => {
    const created = await saveMissionario({
      nm_missionario: data.nm_missionario,
      nm_credencial_pastoral: 'Ministério / Atendimento',
      t_cargo_tipo: data.t_cargo_tipo,
      t_telefone: data.t_telefone,
      t_email: data.t_email,
      t_ativo: true
    });
    await loadDashboardData();
    if (created?.id_missionario) {
      handleSelectActiveMember(created.id_missionario);
    }
  };

  // Notificações e Destinatários de E-mail
  const [destinatarios, setDestinatarios] = useState<DestinatarioNotificacao[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [configLembrete, setConfigLembrete] = useState<ConfiguracaoLembrete>(DEFAULT_CONFIG_LEMBRETE);
  const [selectedWizardEmails, setSelectedWizardEmails] = useState<string[]>([]);

  // Modal de Detalhes do Relatório
  const [selectedReportForModal, setSelectedReportForModal] = useState<RelatorioViagem | null>(null);

  // Estado do Relatório Atual (Sem dados mockados)
  const [agendaSource, setAgendaSource] = useState<{ title: string; missingParticipants: boolean } | null>(null);
  const [idRelatorio, setIdRelatorio] = useState<string>('');
  const [protocolo, setProtocolo] = useState<string>('');
  const [missionario, setMissionario] = useState<string>('');
  const [poloDestino, setPoloDestino] = useState<string>('');
  const [dataSaida, setDataSaida] = useState<string>('');
  const [dataRetorno, setDataRetorno] = useState<string>('');
  const [comitivaCount, setComitivaCount] = useState<number>(1);
  const [objetivoPrimario, setObjetivoPrimario] = useState<string>('');

  // Estado do Diário de Bordo (Passo 2)
  const [idDiario, setIdDiario] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [deslocamentoAtivo, setDeslocamentoAtivo] = useState(false);
  const [kmPercorridos, setKmPercorridos] = useState('');
  const [tempoTrajeto, setTempoTrajeto] = useState('');
  const [resumoAtividades, setResumoAtividades] = useState('');

  // Fotos reais vinculadas ao Neon e Firebase Storage
  const [fotos, setFotos] = useState<EvidenciaFotografica[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Bottom Sheets
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');

  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expExistingUrls, setExpExistingUrls] = useState<string[]>([]);
  const [expenseError, setExpenseError] = useState('');
  const expenseSavingRef = useRef(false);
  const receiptScanVersion = useRef(0);
  const uploadedReceiptRef = useRef<{ file: File; url: string } | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expMaskedValue, setExpMaskedValue] = useState('R$ 0,00');
  const [expRawValue, setExpRawValue] = useState(0);
  const [expCategory, setExpCategory] = useState<'fuel' | 'utensils' | 'bed' | 'church'>('fuel');
  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);

  const [expReceiptFile, setExpReceiptFile] = useState<File | null>(null);
  const [expReceiptPreview, setExpReceiptPreview] = useState<string | null>(null);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);
  const [isReceiptViewerActive, setIsReceiptViewerActive] = useState(false);
    const [isReceiptViewerClosing, setIsReceiptViewerClosing] = useState(false);
  const [receiptOriginRect, setReceiptOriginRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const receiptThumbnailRef = useRef<HTMLDivElement>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [detectedReceiptInfo, setDetectedReceiptInfo] = useState<{ total: number | null; merchant?: string; category?: 'fuel' | 'utensils' | 'bed' | 'church' } | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (expReceiptPreview?.startsWith('blob:')) URL.revokeObjectURL(expReceiptPreview);
  }, [expReceiptPreview]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Prestação de Contas (Passo 3)
  const [tetoPreAprovado, setTetoPreAprovado] = useState<number>(5000);
  const [temTetoPreAprovado, setTemTetoPreAprovado] = useState<boolean>(true);
  const [declaracaoAceita, setDeclaracaoAceita] = useState(false);
  const [despesas, setDespesas] = useState<DespesaRubrica[]>([]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewState, setReviewState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reviewError, setReviewError] = useState('');
  const [reviewData, setReviewData] = useState<Awaited<ReturnType<typeof getReportReview>> | null>(null);
  const [emailSeed, setEmailSeed] = useState<{ id: string; emails: string[] } | null>(null);
  const [deletion, setDeletion] = useState<{ kind: 'photo' | 'expense'; id: string; name: string; value?: number } | null>(null);
  const [deletionError, setDeletionError] = useState('');
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const deletingItemRef = useRef(false);

  // Estados de feedback & loading
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveQueueRef = useRef<SaveQueue | null>(null);
  if (!saveQueueRef.current) saveQueueRef.current = new SaveQueue(setSaveStatus);
  type BasicEditing = { 
    missionario: string; 
    poloDestino: string; 
    dataSaida: string; 
    dataRetorno: string; 
    comitivaCount: number; 
    objetivoPrimario: string; 
    declaracaoAceita: boolean;
    tetoPreAprovado?: number;
    temTetoPreAprovado?: boolean;
  };
  type DayEditing = { dia: string; deslocamentoAtivo: boolean; kmPercorridos: string; tempoTrajeto: string; resumoAtividades: string };
  const basicEditingRef = useRef<BasicEditing>({ missionario: '', poloDestino: '', dataSaida: '', dataRetorno: '', comitivaCount: 1, objetivoPrimario: '', declaracaoAceita: false, tetoPreAprovado: 5000, temTetoPreAprovado: true });
  const currentDayEditingRef = useRef<DayEditing>({ dia: '', deslocamentoAtivo: false, kmPercorridos: '', tempoTrajeto: '', resumoAtividades: '' });
  const reportIdentityRef = useRef({ id: '', protocolo: '' });
  const lastReportSavedRef = useRef<RelatorioViagem | null>(null);
  const lastDiarySavedRef = useRef(new Map<string, Awaited<ReturnType<typeof saveDiarioAtividade>>>());
  const navigationBusyRef = useRef(false);
  const [loadingDay, setLoadingDay] = useState('');
  const [registeredDays, setRegisteredDays] = useState<string[]>([]);
  const [dayIndexState, setDayIndexState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [diaryLoadError, setDiaryLoadError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // StrictMode may set up and clean up this effect twice during development.
    saveQueueRef.current = new SaveQueue(setSaveStatus);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveQueueRef.current?.hasPending) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { saveQueueRef.current?.dispose(); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, []);

  const resetSaveSession = (id: string, reportProtocol: string, basic: BasicEditing) => {
    saveQueueRef.current?.dispose();
    saveQueueRef.current = new SaveQueue(setSaveStatus);
    reportIdentityRef.current = { id, protocolo: reportProtocol };
    basicEditingRef.current = basic;
    lastReportSavedRef.current = null;
    lastDiarySavedRef.current.clear();
    setRegisteredDays([]);
    setDayIndexState('loading');
    setSaveStatus(id ? 'saved' : 'idle');
    setDiaryLoadError(false);
  };

  const goToStep = (step: ReportPosition['step']) => {
    saveReportPosition(reportIdentityRef.current, { step, day: currentDayEditingRef.current.dia });
    setCurrentScreen(step);
  };

  type ToastType = 'success' | 'error' | 'warning' | 'info';
  type ToastStage = 'entering' | 'expanded' | 'collapsing' | 'exiting';

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [toastStage, setToastStage] = useState<ToastStage>('entering');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissNotification = () => {
    triggerHaptic('light');
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (stageTimeoutRef.current) {
      clearTimeout(stageTimeoutRef.current);
      stageTimeoutRef.current = null;
    }

    // 1. Contrai suavemente o texto de volta para o ícone no centro (520ms)
    setToastStage('collapsing');

    // 2. Após fechar completamente no círculo (520ms), mantém o ícone no centro por 300ms e depois esmaece
    stageTimeoutRef.current = setTimeout(() => {
      setToastStage('exiting');
      stageTimeoutRef.current = setTimeout(() => {
        setToast(null);
        stageTimeoutRef.current = null;
      }, 300);
    }, 550);
  };

  const showNotification = (msg: string, type: ToastType = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current);

    // 1. O ícone aparece suavemente primeiro, 100% centralizado no círculo (com a tremidinha)
    setToast({ message: msg, type });
    setToastStage('entering');

    // 2. Permanece com o ícone no centro durante a tremidinha (500ms) e então estende suavemente para revelar o texto
    stageTimeoutRef.current = setTimeout(() => {
      setToastStage('expanded');
      stageTimeoutRef.current = null;
    }, 500);

    // 3. Tempo confortável de leitura (5.5s) e contração elegante
    toastTimeoutRef.current = setTimeout(() => {
      dismissNotification();
    }, 5500);
  };

  // Carrega os dados reais do banco Neon ao iniciar
  const loadDashboardData = async () => {
    if (loadingDashboardRef.current) return;
    loadingDashboardRef.current = true;
    setIsLoadingData(true);
    const load = async <T,>(key: ResourceKey, query: () => Promise<T>, apply: (data: T) => void) => {
      const state = await loadResource(key, query, knownResources.current.has(key), apply,
        data => key === 'indicadores' || key === 'ativo'
          ? data === null || (typeof data === 'object' && !Array.isArray(data))
          : Array.isArray(data));
      if (state !== 'error') knownResources.current.add(key);
      setLoadStates(prev => ({ ...prev, [key]: state }));
    };
    try {
      await Promise.allSettled([
        load('indicadores', getIndicadoresDashboard, setIndicadores),
        load('ativo', getUltimoRelatorioAtivo, setRelatorioAtivo),
        load('relatorios', getAllRelatorios, setAllRelatorios),
        load('membros', getMissionarios, setMembros),
        load('polos', getPolos, setPolos),
        load('destinatarios', getDestinatariosNotificacao, dests => {
          setDestinatarios(dests);
          const auto = dests.filter(d => d.t_envio_automatico).map(d => d.t_email);
          setSelectedWizardEmails(auto);
        })
      ]);
    } finally {
      loadingDashboardRef.current = false;
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Carrega configurações de lembretes do usuário
  useEffect(() => {
    getConfiguracaoLembrete().then((cfg) => {
      if (cfg) setConfigLembrete(cfg);
    });
  }, []);

  const handleSaveConfigLembrete = async (updated: Partial<ConfiguracaoLembrete>) => {
    const currentMissionario = membros.find(m => m.nm_missionario === missionario) || membros[0];
    const saved = await saveConfiguracaoLembrete(updated, currentMissionario?.id_missionario);
    setConfigLembrete(saved);
  };

  // Responde ao clique de notificação push em segundo plano para abrir o dia do relatório ativo
  useEffect(() => {
    if (typeof window === 'undefined' || !('navigator' in window) || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const data = event.data.data;
        if (data?.step === 'step2' || data?.action === 'diario_hoje') {
          if (relatorioAtivo) {
            handleResumeReport(relatorioAtivo);
          }
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [relatorioAtivo]);

  // Se a URL tiver ?relatorio=RM-... abre o modal do relatório automaticamente (Deep Link do E-mail)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const relParam = params.get('relatorio');
    if (relParam && allRelatorios.length > 0) {
      const cleanParam = relParam.replace('#', '').trim().toLowerCase();
      const found = allRelatorios.find(r => 
        r.nm_documento_protocolo.replace('#', '').trim().toLowerCase() === cleanParam
      );
      if (found) {
        setSelectedReportForModal(found);
      }
    }
  }, [allRelatorios]);

  // Handlers para Gestão de Destinatários de Notificação
  const handleSaveDestinatario = async (data: {
    id_destinatario?: string;
    nm_destinatario: string;
    t_email: string;
    t_cargo_departamento?: string;
    t_envio_automatico?: boolean;
  }) => {
    const saved = await saveDestinatarioNotificacao(data);
    setDestinatarios(prev => {
      const exists = prev.some(d => d.id_destinatario === saved.id_destinatario);
      if (exists) {
        return prev.map(d => d.id_destinatario === saved.id_destinatario ? saved : d);
      }
      return [saved, ...prev];
    });
    if (saved.t_envio_automatico && !selectedWizardEmails.includes(saved.t_email)) {
      setSelectedWizardEmails(prev => [...prev, saved.t_email]);
    }
  };

  const handleDeleteDestinatario = async (id: string) => {
    await deleteDestinatarioNotificacao(id);
    setDestinatarios(prev => prev.filter(d => d.id_destinatario !== id));
  };

  const handleToggleAutomatico = async (id: string, ativo: boolean) => {
    await toggleEnvioAutomaticoDestinatario(id, ativo);
    setDestinatarios(prev => prev.map(d => d.id_destinatario === id ? { ...d, t_envio_automatico: ativo } : d));
  };

  const handleToggleWizardEmail = (email: string) => {
    setSelectedWizardEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAddCustomWizardEmail = (email: string) => {
    if (!selectedWizardEmails.includes(email)) {
      setSelectedWizardEmails(prev => [...prev, email]);
      showNotification(`E-mail ${email} adicionado para esta viagem.`, "info");
    }
  };

  const handleRemoveCustomWizardEmail = (email: string) => {
    setSelectedWizardEmails(prev => prev.filter(e => e !== email));
  };

  const queueBasicSave = (overrides?: Partial<BasicEditing>, totalOverride?: number) => {
    basicEditingRef.current = { ...basicEditingRef.current, ...overrides };
    const basic = basicEditingRef.current;
    const identity = reportIdentityRef.current;
    const snapshot = {
      nm_documento_protocolo: identity.protocolo,
      nm_missionario: basic.missionario.trim(),
      nm_polo_destino: basic.poloDestino.trim(),
      nm_ministerio_vinculado: membros.find(m => m.nm_missionario.toLowerCase() === basic.missionario.toLowerCase())?.t_cargo_tipo || 'Atendimento Regional',
      t_data_saida: basic.dataSaida,
      t_data_retorno: basic.dataRetorno,
      nr_integrantes_comitiva: basic.comitivaCount,
      t_objetivo_primario: basic.objetivoPrimario.trim(),
      nr_etapa_atual: 1,
      t_status: 'Em Aberto',
      dc_teto_pre_aprovado: (basic.temTetoPreAprovado ?? temTetoPreAprovado)
        ? (basic.tetoPreAprovado ?? tetoPreAprovado)
        : 0,
      dc_total_realizado: totalOverride ?? totalRealizado,
      t_concordancia_fiscal: basic.declaracaoAceita
    };
    saveQueueRef.current!.update('report', snapshot, async data => {
      const saved = await saveRelatorioBasico({ ...data, id_relatorio: identity.id || undefined });
      identity.id = saved.id_relatorio;
      setIdRelatorio(saved.id_relatorio);
      lastReportSavedRef.current = saved;
    });
  };

  const saveStep1Immediate = async (overrides?: Partial<BasicEditing>) => {
    queueBasicSave(overrides);
    const ok = await saveQueueRef.current!.flush();
    return ok ? lastReportSavedRef.current : null;
  };

  const scheduleStep1Save = (overrides?: Partial<BasicEditing>) => queueBasicSave(overrides);

  const ensureRelatorioId = async (): Promise<string> => {
    if (reportIdentityRef.current.id) return reportIdentityRef.current.id;
    const saved = await saveStep1Immediate();
    return saved?.id_relatorio || '';
  };

  const queueDiarySave = (overrides?: Partial<DayEditing>) => {
    currentDayEditingRef.current = { ...currentDayEditingRef.current, ...overrides };
    const snapshot = { ...currentDayEditingRef.current };
    const identity = reportIdentityRef.current;
    saveQueueRef.current!.update('day:' + snapshot.dia, snapshot, async data => {
      if (!identity.id) throw new Error('Relatório ainda não confirmado.');
      const saved = await saveDiarioAtividade({
        id_relatorio: identity.id,
        t_data_registro: data.dia,
        t_deslocamento_ativo: data.deslocamentoAtivo,
        dc_km_percorridos: parseDistanceRaw(data.kmPercorridos),
        nr_tempo_minutos_trajeto: parseTrajetoToMinutes(data.tempoTrajeto),
        t_resumo_atividades: data.resumoAtividades.trim(),
        t_salvo_status: true,
        t_intercorrencias: 'Sem intercorrências no trajeto'
      });
      lastDiarySavedRef.current.set(data.dia, saved);
      setRegisteredDays(prev => prev.includes(data.dia) ? prev : [...prev, data.dia]);
      if (currentDayEditingRef.current.dia === data.dia) setIdDiario(saved.id_diario);
    });
  };

  const saveDiarioImmediate = async (overrides?: Partial<DayEditing>) => {
    queueDiarySave(overrides);
    const day = currentDayEditingRef.current.dia;
    const ok = await saveQueueRef.current!.flush();
    return ok ? lastDiarySavedRef.current.get(day) || null : null;
  };

  const scheduleDiarioSave = (overrides?: Partial<DayEditing>) => queueDiarySave(overrides);

  const flushEdits = async () => {
    const ok = await saveQueueRef.current!.flush();
    if (!ok) showNotification('Não foi possível salvar. Suas alterações continuam nesta tela. Tente novamente.', 'error');
    return ok;
  };

  const runNavigation = async (action: () => Promise<void>) => {
    if (navigationBusyRef.current) return;
    if (isRecording) { showNotification('Pare a gravação antes de trocar o dia ou a etapa.', 'info'); return; }
    navigationBusyRef.current = true;
    setIsSaving(true);
    try { await action(); }
    finally { navigationBusyRef.current = false; setIsSaving(false); }
  };

  // Fetch everything before replacing the current date or editor content.
  const loadDiary = async (day: string) => {
    setLoadingDay(day);
    try {
      const diario = await getDiarioPorData(reportIdentityRef.current.id, day);
      const photos = diario ? await getEvidenciasFotos(diario.id_diario) : [];
      const editing: DayEditing = {
        dia: day,
        deslocamentoAtivo: Boolean(diario?.t_deslocamento_ativo),
        kmPercorridos: Number(diario?.dc_km_percorridos) > 0 ? String(Math.round(Number(diario!.dc_km_percorridos))) : '',
        tempoTrajeto: Number(diario?.nr_tempo_minutos_trajeto) > 0 ? formatMinutesToDuration(Number(diario!.nr_tempo_minutos_trajeto)) : '',
        resumoAtividades: diario?.t_resumo_atividades || ''
      };
      currentDayEditingRef.current = editing;
      setSelectedDay(day);
      saveReportPosition(reportIdentityRef.current, { step: 'step2', day });
      setIdDiario(diario?.id_diario || '');
      setDeslocamentoAtivo(editing.deslocamentoAtivo);
      setKmPercorridos(editing.kmPercorridos);
      setTempoTrajeto(editing.tempoTrajeto);
      setResumoAtividades(editing.resumoAtividades);
      setFotos(photos);
      if (diario) lastDiarySavedRef.current.set(day, diario);
      setDiaryLoadError(false);
      return true;
    } catch {
      setDiaryLoadError(true);
      showNotification('Não foi possível carregar o diário. A edição atual foi mantida.', 'error');
      return false;
    } finally { setLoadingDay(''); }
  };

  const handleSelectDay = async (newDay: string) => {
    if (newDay === currentDayEditingRef.current.dia) return;
    await runNavigation(async () => {
      if (await flushEdits()) await loadDiary(newDay);
    });
  };

  const handleToggleDeclaracao = (val: boolean) => {
    setDeclaracaoAceita(val);
    scheduleStep1Save({ declaracaoAceita: val });
  };

  const handleRetrySave = () => runNavigation(async () => { await flushEdits(); });
  const handleBackToStep1 = () => runNavigation(async () => {
    if (await flushEdits()) goToStep('step1');
  });
  const handleBackToStep2 = () => runNavigation(async () => {
    if (await flushEdits()) goToStep('step2');
  });

  // Iniciar novo relatório limpo (cria rascunho instantâneo no Neon)
  const handleStartNewReport = async (event?: AgendaItem) => {
    if (navigationBusyRef.current) return;
    triggerHaptic('medium');
    const novoProtocolo = await getProximoProtocolo();
    const unicoMembro = membros.length === 1 ? membros[0] : null;
    const initial = event ? agendaReportFields(event) : {
      missionario: currentMember?.nm_missionario || unicoMembro?.nm_missionario || '', 
      poloDestino: '', 
      dataSaida: '', 
      dataRetorno: '',
      comitivaCount: 1, 
      objetivoPrimario: '', 
      source: null
    };
    setAgendaSource(initial.source);
    setIdRelatorio('');
    setProtocolo(novoProtocolo);
    setMissionario(initial.missionario);
    setPoloDestino(initial.poloDestino);
    setDataSaida(initial.dataSaida);
    setDataRetorno(initial.dataRetorno);
    setComitivaCount(initial.comitivaCount);
    setObjetivoPrimario(initial.objetivoPrimario);
    setSelectedDay(initial.dataSaida);
    setDeslocamentoAtivo(false);
    setKmPercorridos('');
    setTempoTrajeto('');
    setResumoAtividades('');
    setFotos([]);
    setDespesas([]);
    setDeclaracaoAceita(false);
    setTetoPreAprovado(5000);
    setTemTetoPreAprovado(true);
    currentDayEditingRef.current = {
      dia: initial.dataSaida, deslocamentoAtivo: false, kmPercorridos: '', tempoTrajeto: '', resumoAtividades: ''
    };
    resetSaveSession('', novoProtocolo, { ...initial, declaracaoAceita: false, tetoPreAprovado: 5000, temTetoPreAprovado: true });
    setIdDiario('');
    queueBasicSave(undefined, 0);

    goToStep('step1');
  };

  // Retomar rascunho existente com dados reais do banco Neon
  const handleResumeReport = (rel: RelatorioViagem) => runNavigation(async () => {
    setAgendaSource(null);
    triggerHaptic('medium');
    setIdRelatorio(rel.id_relatorio || '');
    setProtocolo(rel.nm_documento_protocolo);
    setMissionario(rel.nm_missionario || '');
    setPoloDestino(rel.nm_polo_destino || '');
    const safeDataSaida = normalizeDateToInput(rel.t_data_saida);
    const safeDataRetorno = normalizeDateToInput(rel.t_data_retorno);
    setDataSaida(safeDataSaida);
    setDataRetorno(safeDataRetorno);
    setComitivaCount(rel.nr_integrantes_comitiva || 1);
    setObjetivoPrimario(rel.t_objetivo_primario || '');
    setDeclaracaoAceita(Boolean(rel.t_concordancia_fiscal));
    const tetoVal = Number(rel.dc_teto_pre_aprovado);
    const hasTeto = !isNaN(tetoVal) && tetoVal > 0;
    setTetoPreAprovado(hasTeto ? tetoVal : 5000);
    setTemTetoPreAprovado(hasTeto);
    resetSaveSession(rel.id_relatorio || '', rel.nm_documento_protocolo, {
      missionario: rel.nm_missionario || '', poloDestino: rel.nm_polo_destino || '', dataSaida: safeDataSaida, dataRetorno: safeDataRetorno,
      comitivaCount: rel.nr_integrantes_comitiva || 1, objetivoPrimario: rel.t_objetivo_primario || '', declaracaoAceita: Boolean(rel.t_concordancia_fiscal),
      tetoPreAprovado: hasTeto ? tetoVal : 5000, temTetoPreAprovado: hasTeto
    });
    setDespesas([]);
    setIdDiario('');
    setDeslocamentoAtivo(false); setKmPercorridos(''); setTempoTrajeto(''); setResumoAtividades(''); setFotos([]);

    const position = resolveReportPosition(rel);
    const diaInicial = position.day;
    setSelectedDay(diaInicial);

    currentDayEditingRef.current = {
      dia: diaInicial,
      deslocamentoAtivo: false,
      kmPercorridos: '',
      tempoTrajeto: '',
      resumoAtividades: ''
    };

    if (rel.id_relatorio) {
      try {
        const despesasSalvas = await getDespesasRelatorio(rel.id_relatorio);
        setDespesas(despesasSalvas);
      } catch (err) {
        showNotification("Não foi possível carregar as despesas. Tente retomar o relatório novamente.", "error");
        return;
      }
    }

    if (position.step !== 'step1') {
      if (!await loadDiary(position.day)) {
        setCurrentScreen('step1');
        return;
      }
    }
    goToStep(position.step);
  });

  const datePills = useMemo(() => tripDays(dataSaida, dataRetorno), [dataSaida, dataRetorno]);
  const loadDayIndex = async () => {
    const identity = reportIdentityRef.current;
    if (!identity.id) return;
    setDayIndexState('loading');
    try {
      const dates = await getDiaryDates(identity.id);
      if (reportIdentityRef.current !== identity) return;
      setRegisteredDays([...new Set([...dates, ...lastDiarySavedRef.current.keys()])]);
      setDayIndexState('ready');
    } catch {
      if (reportIdentityRef.current === identity) setDayIndexState('error');
    }
  };
  useEffect(() => { if (currentScreen === 'step2') void loadDayIndex(); }, [currentScreen, idRelatorio]);

  // Cálculos dinâmicos
  const diasMissao = useMemo(() => calculateDaysBetween(dataSaida, dataRetorno), [dataSaida, dataRetorno]);
  const totalRealizado = useMemo(() => {
    return despesas.reduce((acc, curr) => acc + (Number(curr.dc_valor_despesa) || 0), 0);
  }, [despesas]);
  const mediaDiaria = useMemo(() => {
    return diasMissao > 0 ? totalRealizado / diasMissao : totalRealizado;
  }, [totalRealizado, diasMissao]);
  const activeTeto = temTetoPreAprovado ? tetoPreAprovado : 0;
  const saldoRestante = activeTeto > 0 ? (activeTeto - totalRealizado) : 0;
  const percExecucao = activeTeto > 0 ? Math.min(100, Math.round((totalRealizado / activeTeto) * 100)) : 0;

  // Persistência Passo 1 -> Passo 2
  const handleSaveStep1 = async (): Promise<RelatorioViagem | null> => {
    triggerHaptic('medium');
    if (Object.keys(validateTrip(basicEditingRef.current)).length > 0) return null;

    const saved = await saveStep1Immediate();
    if (!saved) showNotification('Não foi possível salvar. Suas alterações continuam nesta tela.', 'error');
    return saved;
  };

  const handleSaveAndExit = () => runNavigation(async () => {
    if (!await flushEdits()) return;
    if (currentScreen !== 'dashboard') saveReportPosition(reportIdentityRef.current, { step: currentScreen, day: currentDayEditingRef.current.dia });
    await loadDashboardData();
    setCurrentScreen('dashboard');
  });

  const handleBackFromStep1 = () => runNavigation(async () => {
    if (!await flushEdits()) return;
    await loadDashboardData();
    setCurrentScreen('dashboard');
  });

  const handleNextFromStep1 = () => runNavigation(async () => {
    const saved = await handleSaveStep1();
    if (!saved) return;
    const basic = basicEditingRef.current;
    const currentDay = currentDayEditingRef.current.dia;
    const day = currentDay >= basic.dataSaida && currentDay <= basic.dataRetorno ? currentDay : basic.dataSaida;
    if (await loadDiary(day)) goToStep('step2');
  });

  const handleNextFromStep2 = () => runNavigation(async () => {
    if (await flushEdits()) goToStep('step3');
  });

  // Abre Bottom Sheet para upload de foto
  const handleOpenPhotoSheet = () => {
    triggerHaptic('light');
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoTitle('');
    setIsPhotoSheetOpen(true);
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (!photoTitle) {
      setPhotoTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    triggerHaptic('light');
  };

  // Confirmação do upload na Bottom Sheet
  const handleConfirmPhotoUpload = async () => {
    if (!photoFile) return;

    let relatorioId = await ensureRelatorioId();
    if (!relatorioId) return;

    let diarioIdAtual = idDiario;
    if (!diarioIdAtual) {
      const savedDiario = await saveDiarioImmediate();
      if (savedDiario?.id_diario) {
        diarioIdAtual = savedDiario.id_diario;
        setIdDiario(diarioIdAtual);
      }
    }

    if (!diarioIdAtual) return;
    const label = photoTitle.trim() || 'Evidência em Campo';

    setIsUploadingPhoto(true);
    try {
      const { downloadUrl, storagePath } = await uploadMissionPhoto(protocolo, photoFile, label);

      const novaFoto = await saveEvidenciaFoto({
        id_diario: diarioIdAtual,
        t_titulo_legenda: label,
        t_download_url: downloadUrl,
        t_storage_path: storagePath,
        nr_ordem: fotos.length + 1
      });

      setFotos(prev => [...prev, novaFoto]);
      setIsPhotoSheetOpen(false);
      triggerHaptic('success');
      showNotification("Foto anexada com sucesso!", "success");
    } catch (err) {
      console.error(err);
      triggerHaptic('warning');
      showNotification("Falha no upload da foto. Tente novamente.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = (id: string) => {
    const item = fotos.find(photo => photo.id_foto === id);
    if (!item) return;
    setDeletionError('');
    setDeletion({ kind: 'photo', id, name: item.t_titulo_legenda || 'Foto sem legenda' });
  };



  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const activeMissionarioId = membros.find(m => m.nm_missionario === missionario)?.id_missionario;
      const res = await requestPushPermission(activeMissionarioId);
      if (res.success) {
        setIsPushEnabled(true);
        showNotification("Lembretes noturnos às 20h ativados com sucesso!", "success");
      } else {
        showNotification(res.error || "Permissão de notificação não concedida.", "warning");
      }
    } catch {
      showNotification("Não foi possível registrar o dispositivo para push.", "error");
    } finally {
      setIsRegisteringPush(false);
    }
  };

  // Abre Bottom Sheet para adicionar despesa
  const handleOpenExpenseSheet = (defaultDate?: string) => {
    setEditingExpenseId(null);
    setExpExistingUrls([]);
    setExpenseError('');
    uploadedReceiptRef.current = null;
    receiptScanVersion.current++;
    triggerHaptic('light');
    setExpTitle('');
    setExpMaskedValue('R$ 0,00');
    setExpRawValue(0);
    setExpCategory('fuel');
    setExpDate(defaultDate || selectedDay || new Date().toISOString().slice(0, 10));
    setExpReceiptFile(null);
    setExpReceiptPreview(null);
    setIsReceiptViewerOpen(false);
    setIsReceiptViewerActive(false);
    setReceiptOriginRect(null);
    setDetectedReceiptInfo(null);
    setIsScanningReceipt(false);
    setIsExpenseSheetOpen(true);
  };

  const handleOpenReceiptViewer = () => {
    if (!expReceiptPreview) return;
    triggerHaptic('light');
    if (receiptThumbnailRef.current) {
      const rect = receiptThumbnailRef.current.getBoundingClientRect();
      setReceiptOriginRect({
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }
    setIsReceiptViewerOpen(true);
    setIsReceiptViewerClosing(false);
    setIsReceiptViewerActive(false);
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReceiptViewerActive(true);
        
      });
    });
  };

  const handleCloseReceiptViewer = () => {
    if (isReceiptViewerClosing) return;
    triggerHaptic('light');
    setIsReceiptViewerActive(false);
    setIsReceiptViewerClosing(true);

    setTimeout(() => {
      setIsReceiptViewerOpen(false);
      setIsReceiptViewerClosing(false);
      setReceiptOriginRect(null);
    }, 320);
  };

  const handleEditExpense = (expense: DespesaRubrica) => {
    handleOpenExpenseSheet();
    setEditingExpenseId(expense.id_despesa);
    setExpTitle(expense.nm_rubrica);
    setExpRawValue(Number(expense.dc_valor_despesa));
    setExpMaskedValue(formatCurrencyBRL(Number(expense.dc_valor_despesa)));
    setExpCategory(expense.t_icone_identificador as typeof expCategory);
    setExpDate(normalizeDateToInput(expense.t_data_despesa) || selectedDay || '');
    setExpExistingUrls(expense.t_comprovante_storage_urls || []);
    setExpReceiptPreview(expense.t_comprovante_storage_urls?.[0] || null);
  };

  const handleExpenseValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { raw, formatted } = parseCurrencyInput(e.target.value);
    setExpRawValue(raw);
    setExpMaskedValue(formatted);
  };

  const handleSelectReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setExpReceiptFile(file);
    setExpReceiptPreview(URL.createObjectURL(file));
    setDetectedReceiptInfo(null);
    triggerHaptic('light');

    e.target.value = '';
    uploadedReceiptRef.current = null;
    const version = ++receiptScanVersion.current;
    setIsScanningReceipt(true);
    try {
      const result = await scanReceiptImage(file);
      if (version !== receiptScanVersion.current) return;
      setDetectedReceiptInfo(result);
    } catch {
      if (version === receiptScanVersion.current) setExpenseError('Não foi possível ler o comprovante. Confira e preencha os dados manualmente.');
    } finally {
      if (version === receiptScanVersion.current) setIsScanningReceipt(false);
    }
  };

  const handleRemoveReceiptFile = () => {
    receiptScanVersion.current++;
    uploadedReceiptRef.current = null;
    setExpExistingUrls([]);
    setExpReceiptFile(null);
    setExpReceiptPreview(null);
    setIsReceiptViewerOpen(false);
    setDetectedReceiptInfo(null);
    setIsScanningReceipt(false);
    triggerHaptic('light');
  };

  // Confirmação da despesa na Bottom Sheet com upload de comprovante
  const handleConfirmExpense = async () => {
    if (expenseSavingRef.current || isScanningReceipt) return;
    setExpenseError('');
    if (!expTitle.trim()) {
      triggerHaptic('warning');
      setExpenseError("Informe a descrição da despesa.");
      return;
    }
    if (expRawValue <= 0) {
      triggerHaptic('warning');
      setExpenseError("Informe um valor maior que zero.");
      return;
    }

    let relId = idRelatorio;
    if (!relId) {
      const saved = await handleSaveStep1();
      if (!saved) return;
      relId = saved.id_relatorio;
    }

    expenseSavingRef.current = true;
    setIsUploadingReceipt(true);
    try {
      let receiptUrls: string[] = [...expExistingUrls];
      if (expReceiptFile) {
        const downloadUrl = uploadedReceiptRef.current?.file === expReceiptFile
          ? uploadedReceiptRef.current.url
          : (await uploadMissionPhoto(protocolo || 'despesa', expReceiptFile, `Comprovante - ${expTitle}`)).downloadUrl;
        uploadedReceiptRef.current = { file: expReceiptFile, url: downloadUrl };
        receiptUrls = [downloadUrl];
      }

      const saved = await saveDespesaRubrica({
        id_despesa: editingExpenseId || undefined,
        id_relatorio: relId,
        nm_rubrica: expTitle.trim().slice(0, 80),
        dc_valor_despesa: expRawValue,
        t_icone_identificador: expCategory,
        nr_comprovantes_anexados: receiptUrls.length,
        t_comprovante_storage_urls: receiptUrls,
        t_data_despesa: expDate || undefined
      });

      const updated = editingExpenseId ? despesas.map(item => item.id_despesa === saved.id_despesa ? saved : item) : [...despesas, saved];
      setDespesas(updated);
      queueBasicSave(undefined, updated.reduce((total, item) => total + Number(item.dc_valor_despesa || 0), 0));
      void saveQueueRef.current!.flush();
      setIsExpenseSheetOpen(false);
      triggerHaptic('success');
      showNotification(editingExpenseId ? "Despesa atualizada com sucesso." : "Despesa salva com sucesso.", "success");
    } catch (err) {
      console.error(err);
      triggerHaptic('warning');
      setExpenseError("Não foi possível salvar a despesa. Sua edição foi mantida. Tente salvar novamente.");
    } finally {
      expenseSavingRef.current = false;
      setIsUploadingReceipt(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const item = despesas.find(expense => expense.id_despesa === id);
    if (!item) return;
    setDeletionError('');
    setDeletion({ kind: 'expense', id, name: item.nm_rubrica, value: Number(item.dc_valor_despesa) });
  };
  const confirmDeletion = async () => {
    if (!deletion || deletingItemRef.current) return;
    deletingItemRef.current = true;
    setIsDeletingItem(true);
    setDeletionError('');
    try {
      if (deletion.kind === 'photo') {
        await deleteEvidenciaFoto(deletion.id);
        setFotos(prev => prev.filter(item => item.id_foto !== deletion.id));
      } else {
        await deleteDespesaRubrica(deletion.id);
        const remaining = despesas.filter(item => item.id_despesa !== deletion.id);
        setDespesas(remaining);
        queueBasicSave(undefined, remaining.reduce((sum, item) => sum + Number(item.dc_valor_despesa || 0), 0));
        void saveQueueRef.current!.flush();
      }
      setDeletion(null);
      showNotification(deletion.kind === 'photo' ? 'Foto removida do relatório.' : 'Despesa removida do relatório.', 'success');
    } catch {
      setDeletionError('Não foi possível excluir. O item foi mantido. Tente novamente.');
    } finally {
      deletingItemRef.current = false;
      setIsDeletingItem(false);
    }
  };

  const handleOpenReview = () => runNavigation(async () => {
    if (!await flushEdits()) return;
    setReviewOpen(true);
    setReviewState('loading');
    setReviewError('');
    setReviewData(null);
    try {
      const data = await getReportReview(reportIdentityRef.current.id);
      setReviewData(data);
      setDespesas(data.expenses);
      setReviewState('ready');
    } catch {
      setReviewState('error');
      setReviewError('Não foi possível conferir os relatos e comprovantes. Tente carregar a revisão novamente.');
    }
  });
  const handleReviewDay = (day: string) => runNavigation(async () => {
    if (!await flushEdits()) return;
    if (await loadDiary(day)) { setReviewOpen(false); goToStep('step2'); }
    else setReviewError('Não foi possível abrir o diário selecionado. Tente novamente.');
  });
  const reviewWarnings = reportWarnings(datePills, reviewData?.diaries || [], reviewData?.expenses || []);

  // Finalização do relatório
  const handleFinalizeReport = () => runNavigation(async () => {
    if (reviewState !== 'ready' || !reviewOpen) return;
    setReviewError('');
    triggerHaptic('medium');
    if (!declaracaoAceita) {
      triggerHaptic('warning');
      showNotification("Por favor, assinale a declaração de conformidade.", "warning");
      return;
    }

    let relId = idRelatorio;
    if (!relId) {
      const saved = await handleSaveStep1();
      if (!saved) return;
      relId = saved.id_relatorio;
    }

    setIsSaving(true);
    try {
      if (!await flushEdits()) { setReviewError('Não foi possível salvar as alterações pendentes. Tente confirmar novamente.'); return; }
      const completed = await finalizarRelatorio(relId, totalRealizado, declaracaoAceita);
      setEmailSeed({ id: completed.id_relatorio, emails: [...selectedWizardEmails] });
      setReviewOpen(false);
      clearReportPosition(reportIdentityRef.current);
      triggerHaptic('success');

      showNotification(`Relatório #${protocolo} finalizado com sucesso.`, 'success');
      setSelectedReportForModal(completed);

      await loadDashboardData();
      setActiveTab('relatorios');
      setCurrentScreen('dashboard');
    } catch (err) {
      console.error(err);
      triggerHaptic('warning');
      setReviewError("Não foi possível finalizar o relatório. A revisão foi mantida. Tente confirmar novamente.");
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <div className="h-full h-[100dvh] bg-[#F0F2F5] text-slate-800 flex justify-center overflow-hidden selection:bg-slate-900 selection:text-white">
      {/* Toast flutuante com expansão dinâmica a partir do ícone (Dynamic Island HIG) */}
      {toast && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 bottom-[calc(max(1.125rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))+68px)]"
        >
          <div 
            onClick={() => {
              triggerHaptic('light');
              dismissNotification();
            }}
            className={`pointer-events-auto toast-dynamic-island items-center bg-[#0B1B2B]/95 text-white backdrop-blur-xl border border-white/10 rounded-full overflow-hidden h-11 cursor-pointer select-none active:scale-[0.98] transition-transform ${
              toastStage === 'expanded' 
                ? 'is-expanded scale-100 opacity-100' 
                : toastStage === 'collapsing'
                  ? 'is-collapsing scale-100 opacity-100'
                  : toastStage === 'exiting'
                    ? 'scale-75 opacity-0'
                    : 'scale-100 opacity-100'
            }`}
          >
            {/* Bloco fixo do Ícone: 44px de largura e h-full para centralização absoluta */}
            <div className={`w-11 h-full shrink-0 flex items-center justify-center ${
              toastStage === 'entering' ? 'animate-icon-tremidinha' : ''
            }`}>
              {toast.type === 'success' && (
                <CheckCircle2 className="w-[18px] h-[18px] text-emerald-400 stroke-[2.2]" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-[18px] h-[18px] text-rose-400 stroke-[2.2]" />
              )}
              {toast.type === 'warning' && (
                <AlertTriangle className="w-[18px] h-[18px] text-amber-400 stroke-[2.2]" />
              )}
              {toast.type === 'info' && (
                <Info className="w-[18px] h-[18px] text-sky-400 stroke-[2.2]" />
              )}
            </div>

            {/* Coluna 2: Expansão com alinhamento vertical casado perfeitamente com o centro do ícone */}
            <div 
              className={`min-w-0 h-full overflow-hidden flex items-center transition-opacity duration-300 ${
                toastStage === 'expanded' ? 'opacity-100 delay-75' : 'opacity-0'
              }`}
            >
              <div className="pr-4 pl-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                <span className="text-[13px] font-medium tracking-tight text-white select-none leading-none">
                  {toast.message}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frame Mobile Central */}
      <div className="app-frame w-full max-w-md bg-[#F8FAFC] h-full h-[100dvh] flex flex-col relative shadow-xl border-x border-slate-200/50 overflow-hidden">
        
        {/* ========================================================
            TELA PRINCIPAL: DASHBOARD COM 4 ABAS (Fiel a media_1790569617991.png)
        ======================================================== */}
        {currentScreen === 'dashboard' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {activeTab !== 'agenda' && <LoadFeedback
              items={(activeTab === 'visao'
                ? [{ label: 'relatórios', state: loadStates.relatorios }, { label: 'relatório em aberto', state: loadStates.ativo }, { label: 'membros', state: loadStates.membros }, { label: 'destinatários', state: loadStates.destinatarios }, { label: 'polos', state: loadStates.polos }, { label: 'indicadores', state: loadStates.indicadores }]
                : activeTab === 'relatorios'
                  ? [{ label: 'relatórios', state: loadStates.relatorios }]
                  : [{ label: 'membros', state: loadStates.membros }, { label: 'destinatários', state: loadStates.destinatarios }])}
              isLoading={isLoadingData}
              onRetry={loadDashboardData}
            />}
            {activeTab === 'visao' && (
              (knownResources.current.has('relatorios') && knownResources.current.has('ativo')) ? (
                <DashboardTab
                  relatorios={allRelatorios}
                  relatorioAtivo={relatorioAtivo}
                  missionarioName={currentMember ? currentMember.nm_missionario : (missionario || '')}
                  onStartNewReport={handleStartNewReport}
                  onResumeReport={handleResumeReport}
                  onNavigateTab={(tab) => {
                    triggerHaptic('light');
                    setActiveTab(tab);
                  }}
                  onOpenNotifications={() => {
                    triggerHaptic('light');
                    setIsSettingsModalOpen(true);
                  }}
                  onOpenProfile={() => {
                    triggerHaptic('light');
                    setIsProfileModalOpen(true);
                  }}
                  notificationCount={0}
                />
              ) : (
                <DashboardSkeleton />
              )
            )}

            {activeTab === 'relatorios' && (
              <RelatoriosTab
                relatorios={allRelatorios}
                isLoading={isLoadingData && !knownResources.current.has('relatorios')}
                loadUnavailable={loadStates.relatorios === 'error'}
                onStartNew={handleStartNewReport}
                onResumeReport={handleResumeReport}
                onViewReport={(rep) => setSelectedReportForModal(rep)}
              />
            )}

            {activeTab === 'agenda' && (
              <AgendaTab
                onPlanMission={handleStartNewReport}
                onShowNotification={showNotification}
                membros={membros}
                polos={polos}
              />
            )}

            {activeTab === 'membros' && (
              <MembrosTab
                membros={membros}
                isLoading={isLoadingData && !knownResources.current.has('membros')}
                loadUnavailable={loadStates.membros === 'error'}
                recipientsUnavailable={loadStates.destinatarios === 'error' || loadStates.destinatarios === 'loading'}
                onRefresh={loadDashboardData}
                onShowNotification={showNotification}
                destinatarios={destinatarios}
                currentMemberId={currentMember?.id_missionario}
                onSelectActiveMember={handleSelectActiveMember}
                onOpenProfile={() => {
                  triggerHaptic('light');
                  setIsProfileModalOpen(true);
                }}
                onSaveDestinatario={handleSaveDestinatario}
                onDeleteDestinatario={handleDeleteDestinatario}
                onToggleAutomatico={handleToggleAutomatico}
              />
            )}

            {/* ========================================================
                NAVBAR MODERNA & MINIMALISTA (FLOATING DOCK HIG)
            ======================================================== */}
            <div className="floating-dock-container">
              <nav aria-label="Navegação principal" className="h-[58px] bg-white/92 backdrop-blur-2xl rounded-full border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.03)] px-2 flex items-center justify-between">
                {/* Botão 1: Início */}
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('visao');
                  }} 
                  className={`navbar-dock-tab ${activeTab === 'visao' ? 'is-active' : ''}`}
                  aria-label="Início" aria-current={activeTab === 'visao' ? 'page' : undefined}
                >
                  <div className="tab-icon-box">
                    <Home className={`w-4 h-4 ${activeTab === 'visao' ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                  </div>
                  <div className="tab-text-box">
                    <span className="text-[12px] font-semibold tracking-tight">
                      Início
                    </span>
                  </div>
                </button>

                {/* Botão 2: Relatórios */}
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('relatorios');
                  }} 
                  className={`navbar-dock-tab ${activeTab === 'relatorios' ? 'is-active' : ''}`}
                  aria-label="Relatórios" aria-current={activeTab === 'relatorios' ? 'page' : undefined}
                >
                  <div className="tab-icon-box">
                    <div className="relative flex items-center justify-center">
                      <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'relatorios' ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                      {allRelatorios.some(r => r.t_status !== 'Concluído') && (
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 transition-colors ${
                          activeTab === 'relatorios' ? 'ring-[#0B1B2B]' : 'ring-white'
                        }`} />
                      )}
                    </div>
                  </div>
                  <div className="tab-text-box">
                    <span className="text-[12px] font-semibold tracking-tight">
                      Relatórios
                    </span>
                  </div>
                </button>

                {/* Botão 3: Agenda */}
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('agenda');
                  }} 
                  className={`navbar-dock-tab ${activeTab === 'agenda' ? 'is-active' : ''}`}
                  aria-label="Agenda" aria-current={activeTab === 'agenda' ? 'page' : undefined}
                >
                  <div className="tab-icon-box">
                    <Calendar className={`w-4 h-4 ${activeTab === 'agenda' ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                  </div>
                  <div className="tab-text-box">
                    <span className="text-[12px] font-semibold tracking-tight">
                      Agenda
                    </span>
                  </div>
                </button>

                {/* Botão 4: Ministério */}
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('membros');
                  }} 
                  className={`navbar-dock-tab ${activeTab === 'membros' ? 'is-active' : ''}`}
                  aria-label="Ministério" aria-current={activeTab === 'membros' ? 'page' : undefined}
                >
                  <div className="tab-icon-box">
                    <Users className={`w-4 h-4 ${activeTab === 'membros' ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                  </div>
                  <div className="tab-text-box">
                    <span className="text-[12px] font-semibold tracking-tight">
                      Ministério
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* ========================================================
            FLUXO WIZARD: PASSOS 1, 2 E 3 (Fiel a media_1790569627857 / 48104 / 707661)
        ======================================================== */}
        {currentScreen === 'step1' && (
          <>
            <WizardHeader
              onSaveAndExit={handleSaveAndExit}
              currentStep={1}
              onBack={handleBackFromStep1}
              isSaving={isSaving || isRecording}
              saveStatus={saveStatus}
              onRetrySave={handleRetrySave}
              loadError={diaryLoadError}
            />
            <div inert={isSaving} className="flex-1 min-h-0 flex flex-col">
            <WizardStep1
              agendaSource={agendaSource}
              missionario={missionario}
              setMissionario={(val) => {
                setMissionario(val);
                scheduleStep1Save({ missionario: val });
              }}
              poloDestino={poloDestino}
              setPoloDestino={(val) => {
                setPoloDestino(val);
                scheduleStep1Save({ poloDestino: val });
              }}
              dataSaida={dataSaida}
              setDataSaida={(val) => {
                setDataSaida(val);
                scheduleStep1Save({ dataSaida: val });
              }}
              dataRetorno={dataRetorno}
              setDataRetorno={(val) => {
                setDataRetorno(val);
                scheduleStep1Save({ dataRetorno: val });
              }}
              diasMissao={diasMissao}
              comitivaCount={comitivaCount}
              setComitivaCount={(val) => {
                setComitivaCount(val);
                scheduleStep1Save({ comitivaCount: val });
              }}
              objetivoPrimario={objetivoPrimario}
              setObjetivoPrimario={(val) => {
                setObjetivoPrimario(val);
                scheduleStep1Save({ objetivoPrimario: val });
              }}
              tetoPreAprovado={tetoPreAprovado}
              setTetoPreAprovado={(val) => {
                setTetoPreAprovado(val);
                scheduleStep1Save({ tetoPreAprovado: val, temTetoPreAprovado: true });
              }}
              temTetoPreAprovado={temTetoPreAprovado}
              setTemTetoPreAprovado={(val) => {
                setTemTetoPreAprovado(val);
                scheduleStep1Save({ temTetoPreAprovado: val });
              }}
              onBlurSave={() => { if (!navigationBusyRef.current) void saveQueueRef.current!.flush(); }}
              isSaving={isSaving}
              membros={membros}
              polos={polos}
              onNext={handleNextFromStep1}
              onBack={handleBackFromStep1}
              onSaveDraft={handleBackFromStep1}
            />
            </div>
          </>
        )}

        {currentScreen === 'step2' && (
          <>
            <WizardHeader
              onSaveAndExit={handleSaveAndExit}
              currentStep={2}
              onBack={handleBackToStep1}
              isSaving={isSaving || isRecording}
              saveStatus={saveStatus}
              onRetrySave={handleRetrySave}
              loadError={diaryLoadError}
            />
            <div inert={isSaving} className="flex-1 min-h-0 flex flex-col">
            <WizardStep2
              registeredDays={registeredDays}
              dayIndexState={dayIndexState}
              onRetryDayIndex={loadDayIndex}
              onRecordingChange={setIsRecording}
              datePills={datePills}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              onSelectDay={handleSelectDay}
              deslocamentoAtivo={deslocamentoAtivo}
              setDeslocamentoAtivo={(val) => {
                setDeslocamentoAtivo(val);
                scheduleDiarioSave({ deslocamentoAtivo: val });
              }}
              kmPercorridos={kmPercorridos}
              setKmPercorridos={(val) => {
                setKmPercorridos(val);
                scheduleDiarioSave({ kmPercorridos: val });
              }}
              tempoTrajeto={tempoTrajeto}
              setTempoTrajeto={(val) => {
                setTempoTrajeto(val);
                scheduleDiarioSave({ tempoTrajeto: val });
              }}
              resumoAtividades={resumoAtividades}
              setResumoAtividades={(val) => {
                setResumoAtividades(val);
                scheduleDiarioSave({ resumoAtividades: val });
              }}
              onBlurSave={() => { if (!navigationBusyRef.current) void saveQueueRef.current!.flush(); }}
              onSaveImmediately={(overrides) => saveDiarioImmediate(overrides)}
              fotos={fotos}
              onOpenPhotoSheet={handleOpenPhotoSheet}
              onDeletePhoto={handleDeletePhoto}
              onBack={handleBackToStep1}
              onNext={handleNextFromStep2}
              isSaving={isSaving}
              despesas={despesas}
              onOpenExpenseSheetForDay={(day) => handleOpenExpenseSheet(day)}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
            </div>
          </>
        )}

        {currentScreen === 'step3' && (
          <>
            <WizardHeader
              onSaveAndExit={handleSaveAndExit}
              currentStep={3}
              onBack={handleBackToStep2}
              isSaving={isSaving || isRecording}
              saveStatus={saveStatus}
              onRetrySave={handleRetrySave}
              loadError={diaryLoadError}
            />
            <div inert={isSaving} className="flex-1 min-h-0 flex flex-col">
            <WizardStep3
              protocolo={protocolo}
              missionario={missionario}
              poloDestino={poloDestino}
              dataSaida={dataSaida}
              dataRetorno={dataRetorno}
              comitivaCount={comitivaCount}
              totalRealizado={totalRealizado}
              tetoPreAprovado={temTetoPreAprovado ? tetoPreAprovado : 0}
              mediaDiaria={mediaDiaria}
              diasMissao={diasMissao}
              saldoRestante={saldoRestante}
              percExecucao={percExecucao}
              despesas={despesas}
              onOpenExpenseSheet={handleOpenExpenseSheet}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              declaracaoAceita={declaracaoAceita}
              setDeclaracaoAceita={handleToggleDeclaracao}
              onBack={handleBackToStep2}
              onFinalize={handleOpenReview}
              isSaving={isSaving}
              destinatarios={destinatarios}
              selectedEmails={selectedWizardEmails}
              onToggleEmail={handleToggleWizardEmail}
              onAddCustomEmail={handleAddCustomWizardEmail}
              onRemoveCustomEmail={handleRemoveCustomWizardEmail}
            />
            </div>
          </>
        )}

        {/* Modal de Detalhes de Relatório Concluído */}
        <ReportDetailModal
          initialSelectedEmails={selectedReportForModal?.id_relatorio === emailSeed?.id ? emailSeed?.emails : undefined}
          report={selectedReportForModal}
          onClose={() => setSelectedReportForModal(null)}
        />

        {/* Modal de Destinatários de E-mail (Prestação de Contas) */}
        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          destinatarios={destinatarios}
          onSaveDestinatario={handleSaveDestinatario}
          onDeleteDestinatario={handleDeleteDestinatario}
          onToggleAutomatico={handleToggleAutomatico}
          onShowToast={showNotification}
        />

        {/* Modal de Meu Perfil & Troca de Usuário do Aparelho */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentMember={currentMember}
          membros={membros}
          onSelectActiveMember={handleSelectActiveMember}
          onSaveProfile={handleSaveProfile}
          onAddNewMember={handleAddNewMemberFromProfile}
          onOpenReminderSettings={() => setIsSettingsModalOpen(true)}
          onShowToast={showNotification}
        />

        {/* Modal de Configurações de Uso & Lembretes */}
        <UserSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          config={configLembrete}
          onSaveConfig={handleSaveConfigLembrete}
          missionario={membros.find(m => m.nm_missionario === missionario) || membros[0] || null}
          onOpenDestinatarios={() => setIsNotificationModalOpen(true)}
          onShowToast={showNotification}
        />

        <ReportReview open={reviewOpen} busy={isSaving} state={reviewState} error={reviewError}
          objetivo={objetivoPrimario} protocolo={protocolo}
          missionario={missionario} destino={poloDestino} saida={dataSaida} retorno={dataRetorno} comitiva={comitivaCount} total={totalRealizado}
          missingDays={reviewWarnings.missingDays} missingReceipts={reviewWarnings.missingReceipts} emails={selectedWizardEmails} declared={declaracaoAceita}
          onDeclare={value => { setDeclaracaoAceita(value); scheduleStep1Save({ declaracaoAceita: value }); }}
          onClose={() => setReviewOpen(false)} onRetry={handleOpenReview}
          onBasic={() => runNavigation(async () => { if (await flushEdits()) { setReviewOpen(false); goToStep('step1'); } })} onDay={handleReviewDay}
          onExpense={expense => { setReviewOpen(false); handleEditExpense(expense); }} onConfirm={handleFinalizeReport}
        />

        <BottomSheet
          dismissDisabled={isDeletingItem}
          isOpen={Boolean(deletion)}
          onClose={() => { if (!deletingItemRef.current) setDeletion(null); }}
          title={deletion?.kind === 'photo' ? 'Excluir foto?' : 'Excluir despesa?'}
          footer={
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={isDeletingItem} onClick={() => setDeletion(null)} className="h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 cursor-pointer">Cancelar</button>
              <button type="button" disabled={isDeletingItem} onClick={confirmDeletion} className="h-11 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer">{isDeletingItem ? 'Excluindo…' : deletionError ? 'Tentar excluir novamente' : 'Confirmar exclusão'}</button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <p className="text-sm font-semibold text-slate-900 break-words">{deletion?.name}</p>
            {deletion?.value !== undefined && <p className="text-sm text-slate-700">{formatCurrencyBRL(deletion.value)}</p>}
            <p className="text-sm text-slate-600">Confirme a remoção deste item do relatório.</p>
            {deletionError && <p role="alert" className="text-sm text-rose-800 bg-rose-50 p-3 rounded-xl">{deletionError}</p>}
            {isDeletingItem && <p role="status" className="text-sm text-slate-700">Excluindo… Aguarde a confirmação.</p>}
          </div>
        </BottomSheet>

        {/* Bottom Sheet: Nova Despesa */}
        <BottomSheet
          dismissDisabled={isUploadingReceipt}
          isOpen={isExpenseSheetOpen}
          onClose={() => { if (!expenseSavingRef.current) { receiptScanVersion.current++; setIsExpenseSheetOpen(false); } }}
          title={editingExpenseId ? "Editar Despesa / Comprovante" : "Nova Despesa / Comprovante"}
          footer={
            <button 
              type="button"
              onClick={handleConfirmExpense}
              disabled={isUploadingReceipt}
              className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-xs active:scale-[0.985] disabled:opacity-50 cursor-pointer"
            >
              {isUploadingReceipt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Salvando despesa e comprovante...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  <span>{editingExpenseId ? "Salvar alterações" : "Salvar Despesa"}</span>
                </>
              )}
            </button>
          }
        >
          <fieldset disabled={isUploadingReceipt} className="space-y-3.5 pt-1">
            {expenseError && <p role="alert" className="text-sm text-rose-800 bg-rose-50 rounded-xl p-3">{expenseError}</p>}
            {/* Card Valor da Despesa */}
            <div className="bg-slate-50/80 rounded-2xl py-4 px-4 text-center border border-slate-200/60 flex flex-col items-center justify-center shadow-2xs relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                VALOR DA DESPESA
              </span>
              <input 
                type="text"
                aria-label="Valor da despesa"
                inputMode="numeric"
                value={expMaskedValue}
                onChange={handleExpenseValueChange}
                className="text-3xl font-black text-slate-900 text-center w-full bg-transparent focus:outline-none tracking-tight selection:bg-slate-200"
                placeholder="R$ 0,00"
              />
              {isScanningReceipt && (
                <div className="mt-1.5 flex items-center justify-center">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-600 text-[11px] font-semibold border border-slate-200/80 shadow-2xs">
                    <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
                    <span>Analisando...</span>
                  </span>
                </div>
              )}
              {!isScanningReceipt && detectedReceiptInfo && (
                <div className="mt-1.5 flex items-center justify-center">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/70 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Sugestão de leitura — confira antes de usar</span>
                  </span>
                </div>
              )}
            </div>

            {detectedReceiptInfo && !isScanningReceipt && <div className="text-sm bg-sky-50 rounded-xl p-3 space-y-2">
              <p>Valor sugerido: {detectedReceiptInfo.total ? formatCurrencyBRL(detectedReceiptInfo.total) : 'Não identificado'}. {detectedReceiptInfo.merchant || ''}</p>
              <p>A leitura pode conter erros. Confira valor, descrição e categoria antes de salvar.</p>
              <button type="button" className="min-h-11 px-3 rounded-xl bg-white border border-sky-200" onClick={() => {
                if (detectedReceiptInfo.total && detectedReceiptInfo.total > 0) { setExpRawValue(detectedReceiptInfo.total); setExpMaskedValue(formatCurrencyBRL(detectedReceiptInfo.total)); }
                if (detectedReceiptInfo.category) setExpCategory(detectedReceiptInfo.category);
                if (detectedReceiptInfo.merchant) setExpTitle(detectedReceiptInfo.merchant.slice(0, 80));
                setDetectedReceiptInfo(null);
              }}>Usar sugestões da leitura</button>
            </div>}
            {/* Data da Despesa / Comprovante */}
            <div>
              <label htmlFor="expense-date" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Data da Despesa / Comprovante
              </label>
              <input 
                type="date"
                id="expense-date"
                aria-label="Data da despesa"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 shadow-2xs transition"
              />
            </div>

            {/* Descrição da Rubrica */}
            <div>
              <label htmlFor="expense-description" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Descrição da Despesa
              </label>
              <input 
                type="text"
                maxLength={80}
                id="expense-description" aria-label="Descrição da despesa"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value.slice(0, 80))}
                placeholder="Ex: Abastecimento Posto São Jorge, Almoço..."
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 shadow-2xs transition"
              />
            </div>

            {/* Categoria 2x2 Grid */}
            <div>
              <p id="expense-category-label" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Categoria
              </p>
              <div role="group" aria-labelledby="expense-category-label" className="grid grid-cols-2 gap-2">
                {[
                  { id: 'fuel', label: 'Combustível', icon: Fuel },
                  { id: 'utensils', label: 'Alimentação', icon: Utensils },
                  { id: 'bed', label: 'Hospedagem', icon: Bed },
                  { id: 'church', label: 'Liturgia / Outros', icon: Church },
                ].map(cat => {
                  const isSelected = expCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      aria-pressed={isSelected}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setExpCategory(cat.id as any);
                      }}
                      className={`h-11 px-3 rounded-xl flex items-center space-x-2 text-xs transition active:scale-[0.985] ${
                        isSelected 
                          ? 'bg-[#0B1B2B] text-white border-transparent font-bold shadow-xs' 
                          : 'bg-slate-50/70 text-slate-700 border border-slate-200 hover:border-slate-300 font-semibold shadow-2xs'
                      }`}
                    >
                      <cat.icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Foto do Cupom Fiscal / Comprovante */}
            <div>
              <p className="text-xs font-semibold text-slate-700 block mb-1.5">
                Comprovante / Cupom Fiscal
              </p>

              {expReceiptPreview ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between shadow-2xs">
                  <div 
                    onClick={handleOpenReceiptViewer}
                    className="flex items-center space-x-3 min-w-0 flex-1 pr-2 cursor-pointer group"
                    title="Toque para ampliar"
                  >
                    <div 
                      ref={receiptThumbnailRef}
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-2xs group-hover:border-slate-300 transition"
                    >
                      <img 
                        src={expReceiptPreview} 
                        alt="Cupom Fiscal" 
                        className="w-full h-full object-cover" 
                      />
                      {isScanningReceipt && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isScanningReceipt ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {isScanningReceipt ? 'Analisando...' : expReceiptFile ? 'Comprovante selecionado' : 'Comprovante salvo'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-600 block truncate mt-0.5 font-medium transition">
                        Toque para ampliar
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        receiptFileInputRef.current?.click();
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95 shadow-2xs"
                      title="Trocar comprovante"
                      aria-label="Trocar comprovante"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveReceiptFile}
                      title="Remover comprovante"
                      aria-label="Remover comprovante"
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition active:scale-95 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    receiptFileInputRef.current?.click();
                  }}
                  className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/90 hover:border-slate-300 rounded-2xl flex items-center space-x-3 cursor-pointer transition active:scale-[0.99] shadow-2xs group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:scale-105 transition shrink-0">
                    <Camera className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-bold text-slate-800 block leading-snug">
                      Fotografar ou Anexar Cupom
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-medium truncate">
                      Leitura automática do valor
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-slate-900 group-hover:border-slate-300 shadow-2xs shrink-0 transition">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              )}

              {/* Input de arquivo único e garantido para mobile */}
              <input 
                ref={receiptFileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleSelectReceiptFile} 
              />
            </div>


          </fieldset>
        </BottomSheet>

        {/* Modal de Prévia / Visualização do Comprovante (Morph Animado da Miniatura) */}
        {isReceiptViewerOpen && expReceiptPreview && createPortal((() => {
          const targetW = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.92, 440) : 400;
          const targetH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.74, 560) : 520;
          const targetT = typeof window !== 'undefined' ? Math.max(16, (window.innerHeight - targetH) / 2) : 80;
          const targetL = typeof window !== 'undefined' ? (window.innerWidth - targetW) / 2 : 20;

          const isExpanded = isReceiptViewerActive && !isReceiptViewerClosing;
          const rect = isExpanded
            ? { top: targetT, left: targetL, width: targetW, height: targetH, radius: 20 }
            : (receiptOriginRect
                ? { top: receiptOriginRect.top, left: receiptOriginRect.left, width: receiptOriginRect.width, height: receiptOriginRect.height, radius: 12 }
                : { top: targetT, left: targetL, width: targetW, height: targetH, radius: 20 }
              );

          return (
            <div data-lightbox="true" className="fixed inset-0 z-[220] pointer-events-auto">
              {/* Fundo escuro com transição suave */}
              <div 
                onClick={handleCloseReceiptViewer}
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 cursor-pointer"
                style={{ opacity: isExpanded ? 1 : 0 }}
              />

              {/* Barra superior flutuante (Título e Botão Fechar) */}
              <div 
                className="fixed top-5 inset-x-4 max-w-lg mx-auto z-[240] flex items-center justify-between pointer-events-auto transition-opacity duration-200"
                style={{ opacity: isExpanded ? 1 : 0, pointerEvents: isExpanded ? 'auto' : 'none' }}
              >
                <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg min-w-0 max-w-[80%]">
                  <span className="text-xs font-semibold block text-white truncate">
                    Comprovante Fiscal
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={handleCloseReceiptViewer}
                  className="w-9 h-9 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer transition active:scale-95 shadow-lg shrink-0"
                  title="Fechar visualização"
                  aria-label="Fechar visualização"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Imagem que expande a partir da miniatura e volta perfeitamente */}
              <div 
                style={{
                  position: 'fixed',
                  top: `${rect.top}px`,
                  left: `${rect.left}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  borderRadius: `${rect.radius}px`,
                  transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                  zIndex: 230
                }}
                onClick={handleCloseReceiptViewer}
                className="overflow-hidden shadow-2xl bg-black/90 cursor-pointer will-change-transform border border-white/10"
              >
                <img 
                  src={expReceiptPreview} 
                  alt="Comprovante Fiscal" 
                  className={`w-full h-full transition-all duration-300 ${isExpanded ? 'object-contain' : 'object-cover'}`}
                />
              </div>
            </div>
          );
        })(), document.body)}

        {/* Bottom Sheet: Anexar Foto */}
        <BottomSheet
          dismissDisabled={isUploadingPhoto}
          isOpen={isPhotoSheetOpen}
          onClose={() => setIsPhotoSheetOpen(false)}
          title="Anexar Evidência Fotográfica"
          subtitle="Tire uma foto ou selecione da galeria do aparelho"
          footer={
            <button 
              type="button"
              onClick={handleConfirmPhotoUpload}
              disabled={!photoFile || isUploadingPhoto}
              className={`w-full h-12 rounded-xl font-bold text-xs flex items-center justify-center transition shadow-xs active:scale-[0.985] ${
                photoFile 
                  ? 'bg-[#0B1B2B] hover:bg-[#132B45] text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isUploadingPhoto ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando foto...</span>
                </span>
              ) : (
                <span>Anexar Evidência</span>
              )}
            </button>
          }
        >
          <div className="space-y-4">
            {/* Área de Seleção de Foto Pontilhada */}
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden h-44 bg-slate-100 border border-slate-200">
                <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  aria-label="Remover foto selecionada" onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-rose-600 transition active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl py-8 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white shadow-2xs active:scale-[0.985]">
                <UploadCloud className="w-10 h-10 text-slate-400 stroke-[1.5] mb-2.5" />
                <span className="text-sm font-bold text-slate-700 mb-1">Tirar foto ou abrir galeria</span>
                <span className="text-xs text-slate-400 font-medium">JPG, PNG até 10MB</span>
                <input aria-label="Selecionar foto da galeria ou câmera" type="file" accept="image/*" onChange={handleSelectFile} className="sr-only" />
              </label>
            )}

            {/* Legenda da Foto */}
            <div>
              <label htmlFor="photo-caption" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                LEGENDA DA FOTO
              </label>
              <input 
                type="text"
                id="photo-caption" value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
                placeholder="Ex: Culto Noturno, Visita à Família..."
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 shadow-2xs transition"
              />
            </div>


          </div>
        </BottomSheet>

      </div>
    </div>
  );
}
