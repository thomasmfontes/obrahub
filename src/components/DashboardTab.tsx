import { reportResumeLabel } from '../utils/reportPosition';
import React, { useMemo } from 'react';
import { 
  Bell, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Plus, 
  FileSpreadsheet,
  CalendarDays
} from 'lucide-react';
import type { RelatorioViagem } from '../types';
import { triggerHaptic, formatCurrencyBRL, calculateDaysBetween } from '../utils/formatters';

interface DashboardTabProps {
  relatorios?: RelatorioViagem[];
  relatorioAtivo: RelatorioViagem | null;
  missionarioName?: string;
  onStartNewReport: () => void;
  onResumeReport: (rel: RelatorioViagem) => void;
  onNavigateTab?: (tab: 'visao' | 'relatorios' | 'agenda' | 'membros') => void;
  indicadores?: any;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  notificationCount?: number;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  relatorios = [],
  relatorioAtivo,
  missionarioName,
  onStartNewReport,
  onResumeReport,
  onNavigateTab,
  onOpenNotifications,
  onOpenProfile,
  notificationCount = 0
}) => {
  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'IR';
    const clean = name.replace(/^(Pr\.|Miss\.|Ev\.|Dca\.|Dc\.|Ir\.|Irª\.)\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) return 'IR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateVal?: any): string | null => {
    if (!dateVal) return null;
    try {
      if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return null;
        return dateVal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }
      const str = String(dateVal);
      const clean = str.includes('T') ? str.split('T')[0] : str;
      const parts = clean.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }
      const d = new Date(str);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : str;
    } catch {
      return String(dateVal || '');
    }
  };

  // Estatísticas reais calculadas dinamicamente
  const stats = useMemo(() => {
    let totalValor = 0;
    let totalDias = 0;

    relatorios.forEach((r) => {
      totalValor += Number(r.dc_total_realizado) || 0;
      const dias = (r.nr_dias_campo && r.nr_dias_campo > 0)
        ? r.nr_dias_campo
        : calculateDaysBetween(r.t_data_saida, r.t_data_retorno);
      totalDias += dias;
    });

    return {
      total: relatorios.length,
      totalValor,
      totalDias
    };
  }, [relatorios]);

  const diasEmCampo = relatorioAtivo
    ? (relatorioAtivo.nr_dias_campo && relatorioAtivo.nr_dias_campo > 0
        ? relatorioAtivo.nr_dias_campo
        : calculateDaysBetween(relatorioAtivo.t_data_saida, relatorioAtivo.t_data_retorno))
    : 0;

  return (
    <div className="desktop-page desktop-dashboard flex-1 px-4 pt-5 safe-pb-dock space-y-3.5 overflow-y-auto overscroll-y-contain">
      {/* Header Limpo */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2.5">
          <img 
            src="/icon-192.png" 
            alt="ObraHub Logo" 
            className="w-10 h-10 rounded-2xl shadow-xs border border-slate-200/80 object-cover shrink-0 select-none" 
          />
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block leading-none">ObraHub</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 leading-tight">
              Visão Geral
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button 
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenNotifications?.();
            }}
            aria-label="Avisos e Notificações Push"
            title="Avisos e Notificações Push"
            className="relative w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition active:scale-95"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenProfile?.();
            }}
            aria-label={`Meu Perfil: ${missionarioName || 'Irmão do Ministério'}`}
            title={`Meu Perfil: ${missionarioName || 'Irmão do Ministério'} (Toque para gerenciar)`}
            className="group relative w-9 h-9 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center text-xs font-bold shadow-xs ring-2 ring-slate-100 hover:ring-sky-500 hover:scale-105 active:scale-95 transition-all select-none cursor-pointer"
          >
            {getInitials(missionarioName)}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>
        </div>
      </div>

      {/* Resumo Real Consolidado - Otimizado para Mobile */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          {/* Viagens */}
          <div className="px-1">
            <span className="text-xl font-bold text-slate-900 block tracking-tight leading-none">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
              Viagens
            </span>
          </div>

          {/* Dias em Campo */}
          <div className="px-1">
            <span className="text-xl font-bold text-slate-900 block tracking-tight leading-none">
              {stats.totalDias}d
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-1.5">
              Em campo
            </span>
          </div>

          {/* Total Prestado */}
          <div className="px-1 min-w-0" title={formatCurrencyBRL(stats.totalValor)}>
            <span className="text-xs sm:text-sm font-bold text-slate-900 block tracking-tight leading-none mt-1 truncate">
              {formatCurrencyBRL(stats.totalValor)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-2">
              Prestado
            </span>
          </div>
        </div>
      </div>

      {/* Atendimento Ativo OU Botão Direto de Novo Relatório */}
      {relatorioAtivo ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atendimento em Aberto
            </h2>
            <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />
              Rascunho
            </span>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-3">
            {/* Protocolo & Duração */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                #{relatorioAtivo.nm_documento_protocolo || 'RASCUNHO'}
              </span>
              {diasEmCampo > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {diasEmCampo} {diasEmCampo === 1 ? 'dia' : 'dias'}
                </span>
              )}
            </div>

            {/* Irmão & Localidade */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-slate-100">
                {getInitials(relatorioAtivo.nm_missionario)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {relatorioAtivo.nm_missionario || 'Irmão do Ministério'}
                </h3>
                <div className="flex items-center text-xs text-slate-500 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-sky-600 shrink-0" />
                  <span className="truncate">{relatorioAtivo.nm_polo_destino || 'Polo a definir'}</span>
                </div>
              </div>
            </div>

            {/* Período se disponível */}
            {(relatorioAtivo.t_data_saida || relatorioAtivo.t_data_retorno) && (
              <div className="pt-2 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                <span>
                  {formatDate(relatorioAtivo.t_data_saida) || '--'} até {formatDate(relatorioAtivo.t_data_retorno) || '--'}
                </span>
              </div>
            )}

            {/* Botão de Retomada */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onResumeReport(relatorioAtivo);
              }}
              className="w-full h-11 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-[0.98] shadow-xs"
            >
              <span>{reportResumeLabel(relatorioAtivo)}</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onStartNewReport();
            }}
            className="w-full h-10 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Iniciar Outro Relatório</span>
          </button>
        </div>
      ) : (
        /* Card Direto de Ação - Estilo Apple HIG, sem parágrafos longos */
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onStartNewReport();
          }}
          className="w-full bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition border border-white/10"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold leading-tight">Novo Relatório</span>
              <span className="block text-xs text-slate-300 mt-0.5">Prestação e itinerário</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Acessos Rápidos - Sem textos truncados */}
      {onNavigateTab && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavigateTab('relatorios');
            }}
            className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition active:scale-95 flex items-center space-x-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 truncate">Relatórios</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavigateTab('agenda');
            }}
            className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition active:scale-95 flex items-center space-x-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 truncate">Agenda</span>
          </button>
        </div>
      )}
    </div>
  );
};



