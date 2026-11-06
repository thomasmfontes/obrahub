import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  Camera, 
  X, 
  ChevronRight, 
  Loader2, 
  BookOpen,
  Calendar,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  Receipt,
  Plus,
  Trash2,
  Pencil,
  Fuel,
  Utensils,
  Bed,
  Church,
  Eye,
  MoreVertical
} from 'lucide-react';
import type { EvidenciaFotografica, DespesaRubrica } from '../types';
import { 
  triggerHaptic, 
  formatPillDate, 
  formatLongDate,
  parseDurationToParts,
  formatPartsToDuration,
  formatCurrencyBRL,
  normalizeDateToInput,
  formatMinutesToDuration
} from '../utils/formatters';
import { refineDiaryWithGemini } from '../services/diaryAi';

interface WizardStep2Props {
  registeredDays: string[];
  dayIndexState: 'loading' | 'ready' | 'error';
  onRetryDayIndex: () => void;
  onRecordingChange?: (recording: boolean) => void;
  datePills: string[];
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  onSelectDay?: (day: string) => void;
  onBlurSave?: () => void;
  onSaveImmediately?: (overrides?: any) => void;
  deslocamentoAtivo: boolean;
  setDeslocamentoAtivo: (val: boolean) => void;
  kmPercorridos: string;
  setKmPercorridos: (val: string) => void;
  tempoTrajeto: string;
  setTempoTrajeto: (val: string) => void;
  resumoAtividades: string;
  setResumoAtividades: (val: string) => void;
  fotos: EvidenciaFotografica[];
  onOpenPhotoSheet: () => void;
  onDeletePhoto: (idFoto: string) => void;
  onBack: () => void;
  onNext: () => void;
  isSaving: boolean;
  despesas?: DespesaRubrica[];
  onOpenExpenseSheetForDay?: (day: string) => void;
  onEditExpense?: (expense: DespesaRubrica) => void;
  onDeleteExpense?: (idDespesa: string) => void;
}

export const WizardStep2: React.FC<WizardStep2Props> = ({
  registeredDays,
  dayIndexState,
  onRetryDayIndex,
  onRecordingChange,
  datePills,
  selectedDay,
  setSelectedDay,
  onSelectDay,
  onBlurSave,
  onSaveImmediately,
  deslocamentoAtivo,
  setDeslocamentoAtivo,
  kmPercorridos,
  setKmPercorridos,
  tempoTrajeto,
  setTempoTrajeto,
  resumoAtividades,
  setResumoAtividades,
  fotos,
  onOpenPhotoSheet,
  onDeletePhoto,
  onBack,
  onNext,
  isSaving,
  despesas = [],
  onOpenExpenseSheetForDay,
  onEditExpense,
  onDeleteExpense
}) => {
  const getDayDetails = (dayStr: string, idx: number) => {
    try {
      const parts = dayStr.split('-');
      if (parts.length === 3) {
        const ano = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10);
        const dia = parseInt(parts[2], 10);
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const d = new Date(ano, mes - 1, dia);
        return {
          diaIndex: `Dia ${idx + 1}`,
          diaNumero: String(dia).padStart(2, '0'),
          mesAbr: meses[mes - 1] || '',
          semana: diasSemana[d.getDay()] || ''
        };
      }
    } catch {}
    return {
      diaIndex: `Dia ${idx + 1}`,
      diaNumero: dayStr,
      mesAbr: '',
      semana: ''
    };
  };

  const selectedIdx = datePills.indexOf(selectedDay);
  const [week, setWeek] = useState(Math.max(0, Math.floor(selectedIdx / 7)));
  useEffect(() => { setWeek(Math.max(0, Math.floor(selectedIdx / 7))); }, [selectedDay]);
  const weeks = Math.ceil(datePills.length / 7);
  const visibleDays = datePills.slice(week * 7, (week + 1) * 7);
  const despesasDoDia = (despesas || []).filter(d => normalizeDateToInput(d.t_data_despesa) === normalizeDateToInput(selectedDay));
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);
  const [activeExpenseMenuId, setActiveExpenseMenuId] = useState<string | null>(null);

  // Visualizador e animação de expansão de fotos e comprovantes (estilo morph iOS)
  interface LightboxImage {
    url: string;
    title: string;
    subtitle?: string;
  }
  const [selectedViewerImage, setSelectedViewerImage] = useState<LightboxImage | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isImageViewerActive, setIsImageViewerActive] = useState(false);
  const [isImageViewerClosing, setIsImageViewerClosing] = useState(false);
  const [imageOriginRect, setImageOriginRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const handleOpenImageViewer = (
    image: LightboxImage, 
    origin?: HTMLElement | React.MouseEvent<HTMLElement> | null
  ) => {
    triggerHaptic('light');
    if (origin) {
      const el = 'currentTarget' in origin ? origin.currentTarget : origin;
      if (el && typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        setImageOriginRect({
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      } else {
        setImageOriginRect(null);
      }
    } else {
      setImageOriginRect(null);
    }
    setSelectedViewerImage(image);
    setIsImageViewerOpen(true);
    setIsImageViewerClosing(false);
    setIsImageViewerActive(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsImageViewerActive(true);
      });
    });
  };

  const handleCloseImageViewer = () => {
    if (isImageViewerClosing) return;
    triggerHaptic('light');
    setIsImageViewerActive(false);
    setIsImageViewerClosing(true);

    setTimeout(() => {
      setIsImageViewerOpen(false);
      setIsImageViewerClosing(false);
      setSelectedViewerImage(null);
      setImageOriginRect(null);
    }, 320);
  };

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'fuel':
        return <Fuel className="w-4 h-4 text-slate-700" />;
      case 'utensils':
        return <Utensils className="w-4 h-4 text-slate-700" />;
      case 'bed':
        return <Bed className="w-4 h-4 text-slate-700" />;
      default:
        return <Church className="w-4 h-4 text-slate-700" />;
    }
  };

  const getCategoryBadgeClass = (iconName?: string) => {
    switch (iconName) {
      case 'fuel':
        return 'bg-amber-50 border-amber-200/80';
      case 'utensils':
        return 'bg-emerald-50 border-emerald-200/80';
      case 'bed':
        return 'bg-blue-50 border-blue-200/80';
      default:
        return 'bg-indigo-50 border-indigo-200/80';
    }
  };

  const getCategoryLabel = (iconName?: string) => {
    switch (iconName) {
      case 'fuel':
        return 'Combustível';
      case 'utensils':
        return 'Alimentação';
      case 'bed':
        return 'Hospedagem';
      default:
        return 'Igreja / Outros';
    }
  };


  const [isListening, setIsListening] = useState(false);
  useEffect(() => {
    onRecordingChange?.(isListening);
    return () => onRecordingChange?.(false);
  }, [isListening, onRecordingChange]);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const formatSpeechTranscript = (raw: string): string => {
    if (!raw) return '';
    let cleaned = raw.trim();

    const replacements: [RegExp, string][] = [
      [/\bccb\b/gi, 'CCB'],
      [/\ba paz de deus\b/gi, 'A paz de Deus'],
      [/\birmao\b/gi, 'irmão'],
      [/\birmaos\b/gi, 'irmãos'],
      [/\birma\b/gi, 'irmã'],
      [/\birmas\b/gi, 'irmãs'],
      [/\banciao\b/gi, 'ancião'],
      [/\bdiacono\b/gi, 'diácono'],
      [/\bcooperador\b/gi, 'cooperador'],
      [/\b([0-9]+)\s*km\b/gi, '$1 km'],
    ];

    replacements.forEach(([pattern, replaceVal]) => {
      cleaned = cleaned.replace(pattern, replaceVal);
    });

    cleaned = cleaned.replace(/(^\s*|[.!?]\s+)([a-zà-ú])/g, (_match, sep, char) => {
      return sep + char.toUpperCase();
    });

    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  };

  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('O reconhecimento de voz nativo não está disponível neste navegador. Experimente acessar pelo Google Chrome ou Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      triggerHaptic('light');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      baseTextRef.current = resumoAtividades ? resumoAtividades.trim() : '';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic('medium');
      };

      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }

        const combined = baseTextRef.current 
          ? `${baseTextRef.current} ${sessionTranscript}` 
          : sessionTranscript;

        setResumoAtividades(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn('Erro de reconhecimento de voz:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        triggerHaptic('success');
        onSaveImmediately?.();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Falha ao iniciar reconhecimento de voz:', err);
      setIsListening(false);
    }
  };

  const [isFormattingAi, setIsFormattingAi] = useState(false);

  const handleFormatText = async () => {
    if (!resumoAtividades || isFormattingAi) return;
    triggerHaptic('light');
    setIsFormattingAi(true);

    try {
      const aiResult = await refineDiaryWithGemini(resumoAtividades);
      if (aiResult && aiResult.formattedText) {
        setResumoAtividades(aiResult.formattedText);

        const overrides: any = { resumoAtividades: aiResult.formattedText };

        // Se identificou km e o campo estiver vazio, preenche e ativa deslocamento
        if (aiResult.suggestedKm && !kmPercorridos) {
          const kmStr = String(Math.round(aiResult.suggestedKm));
          setKmPercorridos(kmStr);
          setDeslocamentoAtivo(true);
          overrides.kmPercorridos = kmStr;
          overrides.deslocamentoAtivo = true;
        }

        // Se identificou tempo de viagem e o campo estiver vazio, preenche
        if (aiResult.suggestedTempoMinutos && !tempoTrajeto) {
          const durationStr = formatMinutesToDuration(aiResult.suggestedTempoMinutos);
          setTempoTrajeto(durationStr);
          overrides.tempoTrajeto = durationStr;
        }

        onSaveImmediately?.(overrides);
        triggerHaptic('success');
        return;
      }
    } catch (e) {
      console.warn('Erro ao formatar diário com IA:', e);
    } finally {
      setIsFormattingAi(false);
    }

    // Fallback local: se a IA não estiver disponível, formata com regras locais de regex
    const formatted = formatSpeechTranscript(resumoAtividades);
    setResumoAtividades(formatted);
    onSaveImmediately?.({ resumoAtividades: formatted });
  };

  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);

  const cleanKm = String(kmPercorridos || '').split('.')[0].replace(/\D/g, '').slice(0, 6);

  // Estado local desacoplado para edição fluida e apagamento natural (backspace)
  const [localHours, setLocalHours] = useState(() => parseDurationToParts(tempoTrajeto).hours);
  const [localMinutes, setLocalMinutes] = useState(() => parseDurationToParts(tempoTrajeto).minutes);
  const lastSyncTempoRef = useRef(tempoTrajeto);

  // Sincroniza apenas quando tempoTrajeto vier de fora (ex: ao trocar de dia ou carregar do banco)
  useEffect(() => {
    if (tempoTrajeto !== lastSyncTempoRef.current) {
      lastSyncTempoRef.current = tempoTrajeto;
      const parts = parseDurationToParts(tempoTrajeto);
      setLocalHours(parts.hours);
      setLocalMinutes(parts.minutes);
    }
  }, [tempoTrajeto]);

  const handleKmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setKmPercorridos(digits);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setLocalHours(digits);

    // Salva exatamente o que foi digitado sem inventar '00' nos minutos
    const nextDuration = formatPartsToDuration(digits, localMinutes);
    lastSyncTempoRef.current = nextDuration;
    setTempoTrajeto(nextDuration);

    if (digits.length === 2 && minutesInputRef.current) {
      minutesInputRef.current.focus();
      minutesInputRef.current.select();
    }
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ':' || e.key === 'Enter') {
      e.preventDefault();
      minutesInputRef.current?.focus();
      minutesInputRef.current?.select();
    } else if (e.key === 'ArrowRight' && hoursInputRef.current?.selectionStart === localHours.length) {
      minutesInputRef.current?.focus();
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (parseInt(digits, 10) > 59) {
      digits = '59';
    }
    setLocalMinutes(digits);

    const nextDuration = formatPartsToDuration(localHours, digits);
    lastSyncTempoRef.current = nextDuration;
    setTempoTrajeto(nextDuration);
  };

  const handleMinutesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !localMinutes && hoursInputRef.current) {
      e.preventDefault();
      hoursInputRef.current.focus();
    } else if (e.key === 'ArrowLeft' && minutesInputRef.current?.selectionStart === 0 && hoursInputRef.current) {
      hoursInputRef.current.focus();
    }
  };

  const handleBlurDuration = () => {
    let h = localHours;
    let m = localMinutes;
    // Formata minutos de 1 dígito (ex: '5' -> '05') apenas se houver minutos preenchidos
    if (m && m.length === 1) {
      m = `0${m}`;
      setLocalMinutes(m);
    }
    const finalDuration = formatPartsToDuration(h, m);
    lastSyncTempoRef.current = finalDuration;
    setTempoTrajeto(finalDuration);
    onBlurSave?.();
  };

  return (
    <>
      <div className="desktop-wizard desktop-step-2 flex-1 px-4 py-5 space-y-4 overflow-y-auto overscroll-y-contain safe-pb-wizard max-w-lg mx-auto w-full">
        {/* Card: Itinerário da Viagem Estilo Calendário Apple */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Itinerário da Viagem
              </h3>
            </div>

            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedIdx >= 0 ? `Dia ${selectedIdx + 1} de ${datePills.length}` : `${datePills.length} dias`}
            </span>
          </div>

          {/* Faixa Horizontal de Dias com Design de Cartão Calendário */}
          {weeks > 1 && <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Semana anterior" disabled={week === 0 || isSaving || isListening} onClick={() => setWeek(value => value - 1)} className="min-h-11 px-3 rounded-xl border border-slate-200 text-xs disabled:opacity-40">Anterior</button>
            <span className="text-xs text-slate-700">Semana {week + 1} de {weeks}</span>
            <button type="button" aria-label="Próxima semana" disabled={week >= weeks - 1 || isSaving || isListening} onClick={() => setWeek(value => value + 1)} className="min-h-11 px-3 rounded-xl border border-slate-200 text-xs disabled:opacity-40">Próxima</button>
          </div>}
          <label className="block text-xs font-semibold text-slate-700" htmlFor="diary-day">Ir para um dia da viagem</label>
          <input id="diary-day" type="date" min={datePills[0]} max={datePills[datePills.length - 1]} value={selectedDay} disabled={isSaving || isListening} onChange={event => {
            const day = event.target.value;
            if (datePills.includes(day)) (onSelectDay || setSelectedDay)(day);
          }} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
          {dayIndexState === 'loading' && <p role="status" className="text-xs text-slate-600">Consultando dias com diário salvo…</p>}
          {dayIndexState === 'error' && <div className="text-xs text-amber-900"><p>Não foi possível consultar quais dias têm diário salvo.</p><button type="button" onClick={onRetryDayIndex} className="min-h-11 underline">Tentar novamente</button></div>}
          <p className="text-xs text-slate-600">● Diário salvo · ○ Sem diário salvo{dayIndexState !== 'ready' ? ' · ? Situação indisponível' : ''}</p>
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {visibleDays.map((day, idx) => {
              const isSelected = selectedDay === day;
              const details = getDayDetails(day, week * 7 + idx);
              const saved = registeredDays.includes(day);
              return (
                <button 
                  key={day}
                  aria-pressed={isSelected}
                  aria-label={`${formatLongDate(day)} — ${saved ? 'Diário salvo' : dayIndexState === 'ready' ? 'Sem diário salvo' : 'Situação indisponível'}`}
                  type="button"
                  disabled={isSaving || isListening}
                  onClick={() => {
                    triggerHaptic('light');
                    if (onSelectDay) {
                      onSelectDay(day);
                    } else {
                      setSelectedDay(day);
                    }
                  }}
                  className={`w-14 py-2 rounded-xl transition-all duration-150 active:scale-95 shrink-0 flex flex-col items-center justify-center space-y-0.5 ${
                    isSelected 
                      ? 'bg-[#0B1B2B] text-white shadow-xs' 
                      : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {details.semana}
                  </span>
                  <span className={`text-base font-black leading-tight ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}>
                    {details.diaNumero}
                  </span>
                  <span className={`text-[9px] font-bold uppercase ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {details.mesAbr}
                  </span>
                  <span aria-hidden="true" className="text-xs">{saved ? '●' : dayIndexState === 'ready' ? '○' : '?'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-800">Editando: {formatLongDate(selectedDay)}</p>

        {/* Card 1: Deslocamento no Dia */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Deslocamento no Dia
              </h3>
            </div>

            {/* Switch Toggle Apple HIG */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                const nextVal = !deslocamentoAtivo;
                setDeslocamentoAtivo(nextVal);
                onSaveImmediately?.({ deslocamentoAtivo: nextVal });
              }}
              role="switch" aria-checked={deslocamentoAtivo} aria-label="Deslocamento no dia"
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                deslocamentoAtivo ? 'bg-[#0B1B2B]' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                deslocamentoAtivo ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Inputs executivos e profissionais de Distância e Duração */}
          {deslocamentoAtivo && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
              {/* Campo 1: Distância com sufixo fixo 'km' */}
              <div className="space-y-1.5">
                <label htmlFor="diary-km" className="text-xs font-semibold text-slate-700 block">
                  Distância Percorrida
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    id="diary-km" value={cleanKm}
                    onChange={handleKmChange}
                    onBlur={onBlurSave}
                    placeholder="0"
                    className="w-full h-11 pl-3.5 pr-11 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition outline-none placeholder:text-slate-300 shadow-2xs"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center">
                    <span className="text-xs font-bold text-slate-400">
                      km
                    </span>
                  </div>
                </div>
              </div>

              {/* Campo 2: Tempo de Trajeto Segmentado Profissional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Tempo de Trajeto
                </label>
                <div 
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      if (!localHours) hoursInputRef.current?.focus();
                      else minutesInputRef.current?.focus();
                    }
                  }}
                  className="h-11 bg-white border border-slate-200 rounded-xl flex items-center px-3 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900/10 transition shadow-2xs cursor-text"
                >
                  <div className="flex items-center space-x-1 flex-1 justify-center">
                    <input 
                      aria-label="Tempo de trajeto em horas" 
                      ref={hoursInputRef}
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="--"
                      maxLength={2}
                      value={localHours}
                      onChange={handleHoursChange}
                      onKeyDown={handleHoursKeyDown}
                      onBlur={handleBlurDuration}
                      className="w-6 text-center text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent placeholder:text-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-400 select-none pointer-events-none">h</span>
                  </div>

                  <span className="text-slate-300 font-bold select-none text-xs sm:text-sm mx-1">:</span>

                  <div className="flex items-center space-x-1 flex-1 justify-center">
                    <input 
                      aria-label="Tempo de trajeto em minutos" 
                      ref={minutesInputRef}
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="--"
                      maxLength={2}
                      value={localMinutes}
                      onChange={handleMinutesChange}
                      onKeyDown={handleMinutesKeyDown}
                      onBlur={handleBlurDuration}
                      className="w-6 text-center text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none bg-transparent placeholder:text-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-400 select-none pointer-events-none">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            <div className="py-4 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              Nenhuma despesa ou comprovante lançado nesta data.
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
              <div className="divide-y divide-slate-200/60">
                {despesasDoDia.map(d => {
                  const hasReceipt = Boolean(
                    (d.nr_comprovantes_anexados && d.nr_comprovantes_anexados > 0) ||
                    (d.t_comprovante_storage_urls && d.t_comprovante_storage_urls.length > 0)
                  );
                  const receiptCount = d.nr_comprovantes_anexados || d.t_comprovante_storage_urls?.length || 0;
                  const receiptUrl = d.t_comprovante_storage_urls && d.t_comprovante_storage_urls.length > 0 
                    ? d.t_comprovante_storage_urls[0] 
                    : null;

                  return (
                    <div key={d.id_despesa} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center">
                            {getCategoryIcon(d.t_icone_identificador)}
                          </div>
                          {hasReceipt && (
                            receiptUrl ? (
                              <button
                                id={`receipt-badge-step2-${d.id_despesa}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenImageViewer({
                                    url: receiptUrl,
                                    title: d.nm_rubrica,
                                    subtitle: `Comprovante • ${formatCurrencyBRL(Number(d.dc_valor_despesa))}`
                                  }, e.currentTarget);
                                }}
                                title="Toque para visualizar comprovante"
                                aria-label="Visualizar comprovante"
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white flex items-center justify-center ring-2 ring-white shadow-2xs cursor-pointer transition"
                              >
                                <Receipt className="w-2.5 h-2.5 stroke-[2.5]" />
                              </button>
                            ) : (
                              <div 
                                title={`${receiptCount} comprovante(s) anexado(s)`}
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white shadow-2xs"
                              >
                                <Receipt className="w-2 h-2 stroke-[2.5]" />
                              </div>
                            )
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 block truncate">
                            {d.nm_rubrica}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">
                            {getCategoryLabel(d.t_icone_identificador)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono tracking-tight">
                          {formatCurrencyBRL(Number(d.dc_valor_despesa))}
                        </span>

                        <div className="relative">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('light');
                              setActiveExpenseMenuId(activeExpenseMenuId === d.id_despesa ? null : d.id_despesa);
                            }}
                            aria-label={`Opções da despesa ${d.nm_rubrica}`}
                            title="Mais opções"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition active:scale-95 ${
                              activeExpenseMenuId === d.id_despesa
                                ? 'bg-slate-200 text-slate-900'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                            }`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeExpenseMenuId === d.id_despesa && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveExpenseMenuId(null);
                                }} 
                              />
                              <div 
                                className="absolute right-0 top-8 z-40 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {receiptUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const anchorEl = document.getElementById(`receipt-badge-step2-${d.id_despesa}`);
                                      setActiveExpenseMenuId(null);
                                      handleOpenImageViewer({
                                        url: receiptUrl,
                                        title: d.nm_rubrica,
                                        subtitle: `Comprovante • ${formatCurrencyBRL(Number(d.dc_valor_despesa))}`
                                      }, anchorEl || e.currentTarget);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50/80 flex items-center space-x-2 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Ver comprovante</span>
                                  </button>
                                )}
                                {onEditExpense && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveExpenseMenuId(null);
                                      triggerHaptic('light');
                                      onEditExpense(d);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Editar despesa</span>
                                  </button>
                                )}
                                {onDeleteExpense && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveExpenseMenuId(null);
                                      triggerHaptic('medium');
                                      onDeleteExpense(d.id_despesa);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button 
            type="button" 
            onClick={() => {
              triggerHaptic('light');
              onOpenExpenseSheetForDay?.(selectedDay);
            }}
            className="w-full h-11 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition active:scale-[0.985] border border-slate-200"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>Adicionar Despesa / Comprovante</span>
          </button>
        </div>

        {/* Card 2: Atividades Ministeriais */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Relatos
              </h3>
            </div>

            {/* Ações Inteligentes: Formatar Texto com IA & Narração por Voz */}
            <div className="flex items-center space-x-1.5">
              {resumoAtividades && resumoAtividades.trim().length > 3 && (
                <button
                  type="button"
                  onClick={handleFormatText}
                  disabled={isFormattingAi}
                  title="Aprimorar redação e extrair dados"
                  className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 flex items-center space-x-1.5 text-xs font-semibold transition active:scale-95 shadow-2xs animate-in fade-in duration-150 disabled:opacity-60"
                >
                  {isFormattingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                      <span>Refinando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>Aprimorar</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleVoice}
                aria-label={isListening ? 'Parar gravação de voz' : 'Narrar por voz'}
                title={isListening ? 'Parar gravação de voz' : 'Narrar por voz'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 ${
                  isListening
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 shadow-2xs'
                }`}
              >
                {isListening ? (
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-5 h-5 rounded-full bg-rose-400/40 animate-ping" />
                    <MicOff className="w-4 h-4 text-rose-600 relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-4 h-4 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            {isListening && <p role="status" className="text-xs text-rose-700 mb-2">Gravação em andamento. Pare a gravação antes de trocar o dia ou a etapa.</p>}
            <textarea aria-label="Relatos das atividades do dia" 
              rows={4}
              value={resumoAtividades}
              onChange={(e) => setResumoAtividades(e.target.value)}
              onBlur={onBlurSave}
              placeholder="Relate as congregações atendidas, cultos realizados, atendimentos materiais e visitas efetuadas no dia..."
              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition outline-none resize-none leading-relaxed shadow-2xs"
            />
          </div>
        </div>

        {/* Card 3: Evidências Fotográficas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Evidências Fotográficas
              </h3>
            </div>

            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {fotos.map((f) => (
              <div 
                key={f.id_foto} 
                onClick={(e) => handleOpenImageViewer({
                  url: f.t_download_url,
                  title: f.t_titulo_legenda || 'Evidência Fotográfica',
                  subtitle: 'Registro fotográfico de campo'
                }, e)}
                className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 group shadow-2xs border border-slate-200/80 cursor-pointer active:scale-[0.98] transition-all"
                title="Toque para ampliar a foto"
              >
                <img 
                  src={f.t_download_url} 
                  alt={f.t_titulo_legenda} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onDeletePhoto(f.id_foto);
                  }}
                  aria-label="Excluir foto"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-rose-600 transition active:scale-90 shadow-sm z-10 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 pointer-events-none">
                  <span className="text-white text-[11px] font-medium truncate block">
                    {f.t_titulo_legenda}
                  </span>
                </div>
              </div>
            ))}

            {/* Botão de Adicionar Foto Elegante */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenPhotoSheet();
              }}
              className="aspect-[4/3] rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition active:scale-[0.98] space-y-1.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Camera className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-center px-1">
                <span className="text-xs font-bold text-slate-800 block">Anexar Foto</span>
                <span className="text-[10px] text-slate-400 block">Galeria ou Câmera</span>
              </div>
            </button>
          </div>
        </div>


      </div>

      {/* Ações Fixas no Rodapé */}
      <div className="wizard-bottom-bar">
        <button 
          type="button"
          onClick={onNext}
          disabled={isSaving || isListening}
          className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-[0_4px_16px_rgba(11,27,43,0.25)] transition active:scale-[0.985] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <span>Continuar para Financeiro</span>}
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Modal de Prévia / Visualização de Foto e Comprovante (Morph Animado) */}
      {isImageViewerOpen && selectedViewerImage && (() => {
        const targetW = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.92, 440) : 400;
        const targetH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.74, 560) : 520;
        const targetT = typeof window !== 'undefined' ? Math.max(16, (window.innerHeight - targetH) / 2) : 80;
        const targetL = typeof window !== 'undefined' ? (window.innerWidth - targetW) / 2 : 20;

        const isExpanded = isImageViewerActive && !isImageViewerClosing;
        const rect = isExpanded
          ? { top: targetT, left: targetL, width: targetW, height: targetH, radius: 20 }
          : (imageOriginRect
              ? { top: imageOriginRect.top, left: imageOriginRect.left, width: imageOriginRect.width, height: imageOriginRect.height, radius: 12 }
              : { top: targetT, left: targetL, width: targetW, height: targetH, radius: 20 }
            );

        return (
          <div className="fixed inset-0 z-[120] pointer-events-auto">
            {/* Fundo escuro com transição suave */}
            <div 
              onClick={handleCloseImageViewer}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 cursor-pointer"
              style={{ opacity: isExpanded ? 1 : 0 }}
            />

            {/* Barra superior flutuante (Título e Botão Fechar) */}
            <div 
              className="fixed top-5 inset-x-4 max-w-lg mx-auto z-[140] flex items-center justify-between pointer-events-auto transition-opacity duration-200"
              style={{ opacity: isExpanded ? 1 : 0, pointerEvents: isExpanded ? 'auto' : 'none' }}
            >
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg min-w-0 max-w-[80%] flex flex-col">
                <span className="text-xs font-semibold block text-white truncate">
                  {selectedViewerImage.title || 'Visualização'}
                </span>
                {selectedViewerImage.subtitle && (
                  <span className="text-[10px] text-slate-300 block truncate font-medium">
                    {selectedViewerImage.subtitle}
                  </span>
                )}
              </div>
              <button 
                type="button"
                onClick={handleCloseImageViewer}
                className="w-9 h-9 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer transition active:scale-95 shadow-lg shrink-0"
                title="Fechar visualização"
                aria-label="Fechar visualização"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Imagem que expande a partir da miniatura ou botão e volta perfeitamente */}
            <div 
              style={{
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                borderRadius: `${rect.radius}px`,
                transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 130
              }}
              onClick={handleCloseImageViewer}
              className="overflow-hidden shadow-2xl bg-black/90 cursor-pointer will-change-transform border border-white/10"
            >
              <img 
                src={selectedViewerImage.url} 
                alt={selectedViewerImage.title} 
                className={`w-full h-full transition-all duration-300 ${isExpanded ? 'object-contain' : 'object-cover'}`}
              />
            </div>
          </div>
        );
      })()}
    </>
  );
};
