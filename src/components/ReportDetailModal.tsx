import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Printer, 
  Navigation, 
  Fuel, 
  Utensils, 
  Bed, 
  Church, 
  BookOpen, 
  CheckCircle2,
  Mail,
  Send
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import type { RelatorioViagem, DespesaRubrica, DiarioAtividade, EvidenciaFotografica, DestinatarioNotificacao } from '../types';
import { formatCurrencyBRL, triggerHaptic, shareSummary, calculateDaysBetween, formatPillDate } from '../utils/formatters';
import { 
  getDespesasRelatorio, 
  getDiariosRelatorio, 
  getFotosPorRelatorio, 
  getDestinatariosNotificacao,
  gerarMailtoRelatorio 
} from '../services/neon';
import { reportLink } from '../utils/reportSharing';
import { BottomSheet } from './BottomSheet';
import { LoadFeedback } from './LoadFeedback';
import { loadResource, type LoadState } from '../utils/loadResource';
import { createPortal } from 'react-dom';

interface ReportDetailModalProps {
  initialSelectedEmails?: string[];
  report: RelatorioViagem | null;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, initialSelectedEmails }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'diario' | 'financeiro'>('geral');
  const [despesas, setDespesas] = useState<DespesaRubrica[]>([]);
  const [diarios, setDiarios] = useState<DiarioAtividade[]>([]);
  const [fotos, setFotos] = useState<EvidenciaFotografica[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<EvidenciaFotografica | null>(null);

  const [cachedReport, setCachedReport] = useState<RelatorioViagem | null>(report);
  const [destinatarios, setDestinatarios] = useState<DestinatarioNotificacao[]>([]);
  const [recipientState, setRecipientState] = useState<LoadState>('loading');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const hasRecipients = React.useRef(false);
  const recipientRequest = React.useRef(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [emailRequested, setEmailRequested] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (report) {
      setCachedReport(report);
      if (initialSelectedEmails) setSelectedEmails(initialSelectedEmails);
      setEmailRequested(false); setCopyStatus('idle');
    } else {
      setCachedReport(null);
    }
  }, [report]);

  const activeReport = report || cachedReport;

  const loadRecipients = async () => {
    if (recipientRequest.current) return;
    recipientRequest.current = true;
    setLoadingRecipients(true);
    try {
      const state = await loadResource('destinatarios', getDestinatariosNotificacao, hasRecipients.current, dests => {
        setDestinatarios(dests);
        const auto = dests.filter(d => d.t_envio_automatico).map(d => d.t_email);
        if (!hasRecipients.current) setSelectedEmails(initialSelectedEmails || auto);
      }, Array.isArray);
      if (state !== 'error') hasRecipients.current = true;
      setRecipientState(state);
    } finally {
      recipientRequest.current = false;
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (activeReport?.id_relatorio) {
      setIsLoading(true);
      Promise.all([
        getDespesasRelatorio(activeReport.id_relatorio),
        getDiariosRelatorio(activeReport.id_relatorio),
        getFotosPorRelatorio(activeReport.id_relatorio),
        loadRecipients()
      ])
        .then(([desp, diar, pic]) => {
          setDespesas(desp);
          setDiarios(diar);
          setFotos(pic);
        })
        .catch((err) => {
          console.warn("Erro ao buscar detalhes completos do relatório:", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeReport?.id_relatorio]);

  if (!activeReport) return null;

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'IR';
    const clean = name.replace(/^(Pr\.|Miss\.|Ev\.|Dca\.|Dc\.|Ir\.|Irª\.)\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) return 'IR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatPeriodDates = (start?: any, end?: any): string => {
    if (!start && !end) return '--';
    const fmt = (dVal?: any): string => {
      if (!dVal) return '';
      try {
        if (dVal instanceof Date) {
          if (isNaN(dVal.getTime())) return '';
          return dVal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }
        const str = String(dVal);
        const clean = str.includes('T') ? str.split('T')[0] : str;
        const parts = clean.split('-').map(Number);
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }
        const d = new Date(str);
        return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : str;
      } catch {
        return '';
      }
    };
    const s = fmt(start);
    const e = fmt(end);
    let year = '';
    try {
      if (end) {
        year = (end instanceof Date ? end.getFullYear() : new Date(end).getFullYear()).toString();
      } else if (start) {
        year = (start instanceof Date ? start.getFullYear() : new Date(start).getFullYear()).toString();
      }
    } catch {}
    if (s && e) return `${s} — ${e} ${year ? `(${year})` : ''}`.trim();
    return s || e || '--';
  };

  const formatDateShort = (dVal?: any): string => {
    if (!dVal) return '--';
    try {
      if (dVal instanceof Date) {
        if (isNaN(dVal.getTime())) return '--';
        return dVal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }
      const str = String(dVal);
      const clean = str.includes('T') ? str.split('T')[0] : str;
      const parts = clean.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }
      const d = new Date(str);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : str;
    } catch {
      return '--';
    }
  };

  const total = Number(activeReport.dc_total_realizado) || 0;
  const teto = Number(activeReport.dc_teto_pre_aprovado) || 0;
  const saldo = teto > 0 ? teto - total : 0;
  const diasMissao = (activeReport.nr_dias_campo && activeReport.nr_dias_campo > 0)
    ? activeReport.nr_dias_campo
    : (calculateDaysBetween(activeReport.t_data_saida, activeReport.t_data_retorno) || 1);
  const mediaDiaria = diasMissao > 0 ? total / diasMissao : 0;
  const percExecucao = teto > 0 ? (total / teto) * 100 : 0;
  const isConcluido = activeReport.t_status === 'Concluído';

  const handleShareWhatsApp = () => {
    shareSummary({
      protocolo: activeReport.nm_documento_protocolo,
      irmao: activeReport.nm_missionario || 'Irmão do Ministério',
      ministerio: activeReport.nm_ministerio_vinculado || 'Atendimento Ministerial',
      destino: activeReport.nm_polo_destino || 'Localidade não especificada',
      dataSaida: activeReport.t_data_saida,
      dataRetorno: activeReport.t_data_retorno,
      diasAtendimento: diasMissao,
      comitivaCount: activeReport.nr_integrantes_comitiva || 1,
      totalRealizado: total,
      tetoPreAprovado: teto,
      saldoRestante: saldo,
      despesas: despesas.map((d) => ({
        rubrica: d.nm_rubrica,
        valor: Number(d.dc_valor_despesa) || 0,
        comprovantes: d.nr_comprovantes_anexados
      })),
      declaracaoConfirmada: true
    });
  };

  const link = reportLink(activeReport.nm_documento_protocolo);
  const mailtoUrl = gerarMailtoRelatorio({
    destinatarios: selectedEmails, protocolo: activeReport.nm_documento_protocolo,
    missionario: activeReport.nm_missionario || 'Missionário', ministerio: activeReport.nm_ministerio_vinculado,
    polo: activeReport.nm_polo_destino || 'Polo de Atendimento',
    periodo: formatPeriodDates(activeReport.t_data_saida, activeReport.t_data_retorno),
    totalRealizado: total, tetoAutorizado: teto, saldoRestante: saldo,
    resumoObjetivo: activeReport.t_objetivo_primario
  });
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopyStatus('copied'); }
    catch { setCopyStatus('error'); }
  };

  const getRubricaIcon = (category: string) => {
    const Icon = category === 'fuel' ? Fuel : category === 'utensils' ? Utensils : category === 'bed' ? Bed : Church;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <>
      <BottomSheet wide
        isOpen={Boolean(report)}
        onClose={onClose}
        title={
          <div className="flex items-center space-x-2.5">
            <span className="font-mono text-base font-bold text-[#0B1B2B] tracking-tight">
              #{activeReport.nm_documento_protocolo}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1 ${
              isConcluido 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-amber-50 text-amber-800 border-amber-200/80'
            }`}>
              {isConcluido ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Concluído</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Em Aberto</span>
                </>
              )}
            </span>
          </div>
        }
        contentClassName="px-5 py-2.5 overflow-y-auto flex-1 space-y-3.5 overscroll-contain"
        footer={
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                window.print();
              }}
              className="h-11 bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 hover:bg-slate-50 transition active:scale-95 shadow-xs"
              title="Gerar PDF oficial A4"
            >
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsEmailModalOpen(true);
              }}
              className="h-11 bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 hover:bg-slate-50 transition active:scale-95 shadow-xs"
              title="Preparar e-mail do relatório"
            >
              <Mail className="w-4 h-4 text-sky-600 shrink-0" />
              <span>E-mail</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl flex items-center justify-center transition active:scale-95 shadow-xs"
              title="Compartilhar resumo via WhatsApp"
              aria-label="Compartilhar resumo via WhatsApp"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white" />
            </button>
          </div>
        }
      >
        {/* Segmented Control / Tabs */}
        <div className="bg-slate-100/90 p-1 rounded-xl flex shrink-0 border border-slate-200/50">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('geral');
            }}
            className={`flex-1 py-1.5 text-xs rounded-lg transition font-bold text-center ${
              activeTab === 'geral'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Visão Geral
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('diario');
            }}
            className={`flex-1 py-1.5 text-xs rounded-lg transition font-bold text-center flex items-center justify-center space-x-1.5 ${
              activeTab === 'diario'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Diário</span>
            {diarios.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition ${
                activeTab === 'diario' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {diarios.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('financeiro');
            }}
            className={`flex-1 py-1.5 text-xs rounded-lg transition font-bold text-center flex items-center justify-center space-x-1.5 ${
              activeTab === 'financeiro'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Financeiro</span>
            {despesas.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition ${
                activeTab === 'financeiro' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {despesas.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'geral' && (
          <div className="desktop-detail-grid space-y-3 animate-in fade-in duration-150">
            {/* Card Integrado do Atendimento */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
              {/* Irmão do Ministério */}
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B1B2B] to-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-slate-100 shadow-xs">
                  {getInitials(activeReport.nm_missionario)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                    {activeReport.nm_missionario || 'Irmão do Ministério'}
                  </h3>
                  {activeReport.nm_ministerio_vinculado && (
                    <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                      {activeReport.nm_ministerio_vinculado}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadados: Localidade, Período e Comitiva */}
              <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 text-xs">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-400 font-medium flex items-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-sky-600 shrink-0" />
                    Localidade
                  </span>
                  <span className="font-bold text-slate-800 text-right leading-tight">
                    {activeReport.nm_polo_destino || 'Não especificada'}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-medium flex items-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    Período
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-800">
                      {formatPeriodDates(activeReport.t_data_saida, activeReport.t_data_retorno)}
                    </span>
                    {diasMissao > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                        {diasMissao}d
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    Comitiva
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeReport.nr_integrantes_comitiva || 1} {activeReport.nr_integrantes_comitiva === 1 ? 'irmão' : 'irmãos'}
                  </span>
                </div>
              </div>

              {/* Objetivo da Missão */}
              {activeReport.t_objetivo_primario && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Objetivo da Missão
                  </span>
                  <p className="text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100/80 leading-relaxed font-normal">
                    {activeReport.t_objetivo_primario}
                  </p>
                </div>
              )}
            </div>

            {/* Card Resumo Financeiro */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Realizado
                  </span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatCurrencyBRL(total)}
                  </span>
                </div>
                {teto > 0 && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Teto Autorizado
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {formatCurrencyBRL(teto)}
                    </span>
                  </div>
                )}
              </div>

              {teto > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Saldo restante: <strong className={saldo >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatCurrencyBRL(saldo)}</strong>
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      percExecucao > 100 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80' 
                        : percExecucao > 80 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/80' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                    }`}>
                      {Math.round(percExecucao)}% utilizado
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-100">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        percExecucao > 100 
                          ? 'bg-rose-500' 
                          : percExecucao > 85 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percExecucao)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Atesto Discreto de Conformidade */}
            <div className="flex items-center space-x-2.5 px-3.5 py-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Atesto de Idoneidade Fiscal & Ministerial arquivado</span>
            </div>
          </div>
        )}

      {/* TAB 2: DIÁRIO DE BORDO */}
      {activeTab === 'diario' && (
        <div className="desktop-detail-grid space-y-3 animate-in fade-in duration-150">
          {diarios.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Nenhum diário registrado</p>
              <p className="text-xs text-slate-600">
                Os registros diários deste atendimento estarão listados aqui.
              </p>
            </div>
          ) : (
            diarios.map((d, idx) => {
              const diarioFotos = fotos.filter((f) => f.id_diario === d.id_diario);
              return (
                <div 
                  key={d.id_diario || idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#0B1B2B] text-white font-bold text-[10px]">
                        Dia {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {formatDateShort(d.t_data_registro)}
                      </span>
                    </div>

                    {d.t_deslocamento_ativo && (
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500">
                        <Navigation className="w-3 h-3 text-sky-600" />
                        <span>{d.dc_km_percorridos || 0} km</span>
                        {d.nr_tempo_minutos_trajeto ? (
                          <span>• {Math.floor(d.nr_tempo_minutos_trajeto / 60)}h{d.nr_tempo_minutos_trajeto % 60}m</span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Atividades */}
                  <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {d.t_resumo_atividades || 'Sem anotações detalhadas.'}
                  </p>

                  {/* Fotos do Dia */}
                  {diarioFotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {diarioFotos.map((f) => (
                        <div 
                          key={f.id_foto}
                          onClick={() => setSelectedPhotoPreview(f)}
                          className="relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100 group cursor-pointer aspect-video"
                        >
                          <img 
                            src={f.t_download_url} 
                            alt={f.t_titulo_legenda} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2">
                            <span className="text-[10px] font-medium text-white block truncate">
                              {f.t_titulo_legenda || 'Evidência em campo'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: FINANCEIRO */}
      {activeTab === 'financeiro' && (
        <div className="desktop-detail-grid space-y-3 animate-in fade-in duration-150">
          {/* Card de Resumo Financeiro */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Total de Despesas</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCurrencyBRL(total)}
                </span>
              </div>
              {mediaDiaria > 0 && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Média Diária</span>
                  <span className="text-xs font-bold text-slate-700">
                    {formatCurrencyBRL(mediaDiaria)}/dia
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lista Detalhada de Despesas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Despesas Lançadas ({despesas.length})
              </span>
              <span className="text-xs font-black text-slate-900">
                {formatCurrencyBRL(total)}
              </span>
            </div>

            {despesas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma despesa lançada nesta viagem.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {despesas.map((d) => (
                  <div key={d.id_despesa} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getRubricaIcon(d.t_icone_identificador)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          {d.nm_rubrica}
                        </span>
                        {d.nr_comprovantes_anexados && d.nr_comprovantes_anexados > 0 ? (
                          <span className="text-xs text-slate-600">
                            {d.nr_comprovantes_anexados} comprovante(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrencyBRL(Number(d.dc_valor_despesa) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Prévia de Foto Expandida */}
      {selectedPhotoPreview && (
        <div 
          onClick={() => setSelectedPhotoPreview(null)}
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="max-w-md w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-3">
            <div className="flex items-center justify-between text-white px-1">
              <span className="text-xs font-bold truncate">
                {selectedPhotoPreview.t_titulo_legenda || 'Evidência'}
              </span>
              <button 
                onClick={() => setSelectedPhotoPreview(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img 
              src={selectedPhotoPreview.t_download_url} 
              alt={selectedPhotoPreview.t_titulo_legenda} 
              className="w-full max-h-[60vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </BottomSheet>

    {/* MODAL DE TRANSMISSÃO POR E-MAIL */}
    <BottomSheet
      isOpen={isEmailModalOpen}
      onClose={() => setIsEmailModalOpen(false)}
      title={
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            Preparar e-mail
          </h3>
        </div>
      }
      contentClassName="px-5 py-3 overflow-y-auto flex-1 space-y-3.5 overscroll-contain"
      footer={
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(false)}
            className="flex-1 h-11 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition active:scale-95"
          >
            Cancelar
          </button>
          <a
            href={selectedEmails.length > 0 ? mailtoUrl : undefined}
            aria-disabled={selectedEmails.length === 0}
            role="link"
            tabIndex={selectedEmails.length === 0 ? -1 : 0}
            onClick={() => { if (selectedEmails.length > 0) setEmailRequested(true); }}
            className={`flex-1 min-h-11 px-2 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-xs ${selectedEmails.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Abrir e-mail para envio</span>
          </a>
        </div>
      }
    >
      <LoadFeedback items={[{ label: 'destinatários', state: recipientState }]} isLoading={loadingRecipients} onRetry={loadRecipients} />
      <div className="space-y-3 text-xs">
        {emailRequested && <p role="status" className="p-3 rounded-xl bg-sky-50 text-sky-900">Solicitamos a abertura do aplicativo de e-mail. O envio ainda depende de você. Se ele não abriu, copie o link abaixo ou tente abrir novamente.</p>}
        {selectedEmails.length === 0 && <p className="text-slate-600">Selecione um destinatário ou inclua um e-mail para preparar a mensagem.</p>}
        <div className="space-y-2">
          <label htmlFor="report-share-link" className="block font-semibold">Link do relatório</label>
          <input id="report-share-link" readOnly value={link} className="w-full h-11 border rounded-xl px-3 select-text" onFocus={event => event.currentTarget.select()} />
          <button type="button" onClick={copyLink} className="min-h-11 px-3 rounded-xl border font-semibold">Copiar link</button>
          {copyStatus !== 'idle' && <p role="status">{copyStatus === 'copied' ? 'Link copiado.' : 'Não foi possível copiar automaticamente. Selecione e copie o link no campo acima.'}</p>}
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          Confira os destinatários e abra a mensagem no seu aplicativo de e-mail. Você precisa enviar a mensagem por lá.
        </p>

        <div className="space-y-2">
          {destinatarios.map((d) => {
            const isChecked = selectedEmails.includes(d.t_email);
            return (
              <label 
                key={d.id_destinatario}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                  isChecked ? 'bg-slate-50 border-slate-300' : 'border-slate-100 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => {
                      triggerHaptic('light');
                      setSelectedEmails(prev => 
                        prev.includes(d.t_email) 
                          ? prev.filter(e => e !== d.t_email) 
                          : [...prev, d.t_email]
                      );
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#0B1B2B] focus:ring-[#0B1B2B]"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">{d.nm_destinatario}</span>
                    <span className="font-mono text-[10px] text-slate-500 block truncate">{d.t_email}</span>
                  </div>
                </div>
                {d.t_cargo_departamento && (
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium truncate max-w-[40%] text-right">
                    {d.t_cargo_departamento}
                  </span>
                )}
              </label>
            );
          })}

          {/* E-mails extras adicionados */}
          {selectedEmails.filter(e => !destinatarios.some(d => d.t_email === e)).map((extraEmail) => (
            <div 
              key={extraEmail}
              className="flex items-center justify-between p-3 rounded-xl border border-sky-200 bg-sky-50/60 text-xs"
            >
              <div className="flex items-center space-x-2 min-w-0 pr-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                  Avulso
                </span>
                <span className="font-mono text-[11px] text-slate-800 truncate">{extraEmail}</span>
              </div>
              <button
                type="button"
                title="Remover e-mail"
                onClick={() => setSelectedEmails(prev => prev.filter(e => e !== extraEmail))}
                className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar E-mail Extra */}
        <div className="pt-1 flex items-center space-x-2">
          <input
            type="email"
            placeholder="Outro e-mail para envio..."
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            className="flex-1 h-9 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]/20"
          />
          <button
            type="button"
            onClick={() => {
              if (!customEmail.trim() || !customEmail.includes('@')) return;
              const em = customEmail.trim().toLowerCase();
              if (!selectedEmails.includes(em)) {
                setSelectedEmails(prev => [...prev, em]);
              }
              setCustomEmail('');
            }}
            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition active:scale-95"
          >
            Incluir
          </button>
        </div>
      </div>
    </BottomSheet>

    {/* DOCUMENTO OFICIAL A4 PARA IMPRESSÃO / SALVAR EM PDF */}
    {report && createPortal(
      <div id="relatorio-impressao-a4" className="hidden print:block font-sans text-slate-900 bg-white">
        {/* CABEÇALHO OFICIAL */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-widest text-slate-500 uppercase">ObraHub</span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-semibold text-slate-400">Sistema de Gestão Ministerial</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
                Relatório de Missão & Prestação de Contas
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Documento de prestação de contas comprobatória para conferência e arquivo ministerial
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-100 border border-slate-300 font-mono font-bold text-sm px-3 py-1 rounded">
                #{activeReport.nm_documento_protocolo}
              </div>
              <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-end space-x-1.5">
                <span>Status:</span>
                <strong className={`font-bold ${isConcluido ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {activeReport.t_status || 'Concluído'}
                </strong>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* 1. DADOS GERAIS DA MISSÃO */}
        <div className="mb-6 print-break-inside-avoid">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 pb-1 mb-2 border-b border-slate-200">
            1. Dados da Missão & Equipe
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block font-medium">Missionário / Relator:</span>
              <strong className="text-slate-900 text-sm">{activeReport.nm_missionario || 'Não especificado'}</strong>
              {activeReport.nm_ministerio_vinculado && (
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  {activeReport.nm_ministerio_vinculado}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Polo / Localidade Atendida:</span>
              <strong className="text-slate-900 text-sm">{activeReport.nm_polo_destino || 'Não especificada'}</strong>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block font-medium">Período de Campo:</span>
              <strong className="text-slate-800">
                {formatPeriodDates(activeReport.t_data_saida, activeReport.t_data_retorno)}
              </strong>
              <span className="text-slate-600 ml-1.5 font-normal">({diasMissao} dias)</span>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block font-medium">Comitiva / Integrantes:</span>
              <strong className="text-slate-800">
                {activeReport.nr_integrantes_comitiva || 1} {activeReport.nr_integrantes_comitiva === 1 ? 'irmão' : 'irmãos'}
              </strong>
            </div>

            {activeReport.t_objetivo_primario && (
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block font-medium mb-1">Finalidade / Objetivo do Atendimento:</span>
                <p className="text-slate-800 leading-relaxed font-normal bg-white p-2.5 rounded border border-slate-200/60">
                  {activeReport.t_objetivo_primario}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. RESUMO FINANCEIRO EXECUTIVO */}
        <div className="mb-6 print-break-inside-avoid">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 pb-1 mb-2 border-b border-slate-200">
            2. Resumo Financeiro
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 border border-slate-200 rounded bg-slate-50/50">
              <span className="text-slate-500 block font-medium text-[11px]">Teto Pré-Aprovado</span>
              <strong className="text-base text-slate-900 block mt-1">
                {formatCurrencyBRL(teto)}
              </strong>
            </div>

            <div className="p-3 border-2 border-slate-900 rounded bg-slate-50">
              <span className="text-slate-500 block font-medium text-[11px]">Total Realizado (Gasto)</span>
              <strong className="text-base text-slate-900 block mt-1 font-black">
                {formatCurrencyBRL(total)}
              </strong>
            </div>

            <div className="p-3 border border-slate-200 rounded bg-slate-50/50">
              <span className="text-slate-500 block font-medium text-[11px]">Saldo Restante</span>
              <strong className={`text-base block mt-1 font-bold ${saldo >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {formatCurrencyBRL(saldo)}
              </strong>
            </div>

            <div className="p-3 border border-slate-200 rounded bg-slate-50/50">
              <span className="text-slate-500 block font-medium text-[11px]">Execução do Teto</span>
              <strong className="text-base text-slate-900 block mt-1">
                {Math.round(percExecucao)}%
              </strong>
            </div>
          </div>
        </div>

        {/* 3. DISCRIMINAÇÃO DAS DESPESAS */}
        <div className="mb-6 print-break-inside-avoid">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 pb-1 mb-2 border-b border-slate-200">
            3. Discriminação das Despesas por Rubrica
          </h2>
          {despesas.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 border border-dashed border-slate-200 rounded text-center">
              Nenhuma rubrica de despesa lançada para este atendimento.
            </p>
          ) : (
            <table className="w-full text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                  <th className="py-2 px-3">Rubrica / Finalidade</th>
                  <th className="py-2 px-3 text-center">Comprovantes Anexados</th>
                  <th className="py-2 px-3 text-right">Valor Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {despesas.map((d, idx) => (
                  <tr key={d.id_despesa || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {d.nm_rubrica}
                      {d.t_data_despesa && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({formatPillDate(d.t_data_despesa)})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600">
                      {d.nr_comprovantes_anexados ? `${d.nr_comprovantes_anexados} comprovante(s)` : 'Nenhum anexo'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrencyBRL(Number(d.dc_valor_despesa) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                    Total Geral de Despesas Comprovadas
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm font-black">
                    {formatCurrencyBRL(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 4. DIÁRIO DE BORDO & ATIVIDADES */}
        {diarios.length > 0 && (
          <div className="mb-6 print-break-inside-avoid">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 pb-1 mb-2 border-b border-slate-200">
              4. Diário de Atividades Ministeriais em Campo ({diarios.length} registros)
            </h2>
            <div className="space-y-3">
              {diarios.map((d, idx) => {
                const diarioFotos = fotos.filter((f) => f.id_diario === d.id_diario);
                return (
                  <div 
                    key={d.id_diario || idx}
                    className="p-3 border border-slate-200 rounded bg-white print-break-inside-avoid space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          Dia {idx + 1}
                        </span>
                        <strong className="text-slate-800">
                          {formatDateShort(d.t_data_registro)}
                        </strong>
                      </div>
                      {d.t_deslocamento_ativo && (
                        <span className="text-slate-500 font-medium text-[11px]">
                          Deslocamento: {d.dc_km_percorridos || 0} km {d.nr_tempo_minutos_trajeto ? `(${Math.floor(d.nr_tempo_minutos_trajeto / 60)}h${d.nr_tempo_minutos_trajeto % 60}m)` : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                      {d.t_resumo_atividades || 'Sem anotações detalhadas.'}
                    </p>

                    {diarioFotos.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">
                          Evidências Fotográficas ({diarioFotos.length}):
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {diarioFotos.map((f) => (
                            <div key={f.id_foto} className="border border-slate-200 rounded p-1 bg-slate-50 text-center">
                              <img 
                                src={f.t_download_url} 
                                alt={f.t_titulo_legenda || 'Foto'} 
                                className="w-full h-24 object-cover rounded" 
                              />
                              <p className="text-[9px] text-slate-600 truncate mt-1">
                                {f.t_titulo_legenda || 'Registro de campo'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. ATESTO DE CONFORMIDADE & ASSINATURAS */}
        <div className="mt-8 pt-4 border-t-2 border-slate-300 print-break-inside-avoid">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center mb-10">
            <p className="text-xs font-semibold text-slate-800">
              Atesto de Idoneidade Fiscal & Ministerial
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5 italic">
              "Declaro para os devidos fins ministeriais e legais que as informações, relatos de atividades e comprovantes de despesas apresentados neste relatório correspondem à fiel realidade das atividades realizadas em prol da Obra durante o período informado."
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs pt-4">
            <div>
              <div className="border-t border-slate-900 pt-1.5 font-bold text-slate-900">
                {activeReport.nm_missionario || 'Missionário Responsável'}
              </div>
              <p className="text-slate-500 text-[11px]">Missionário / Relator da Missão</p>
            </div>

            <div>
              <div className="border-t border-slate-900 pt-1.5 font-bold text-slate-900">
                Diretoria / Gestão Financeira
              </div>
              <p className="text-slate-500 text-[11px]">Conferência & Homologação Fiscal</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-10 pt-3 border-t border-slate-100">
            ObraHub Plataforma de Gestão • Documento protocolado sob o nº #{activeReport.nm_documento_protocolo}
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
};

