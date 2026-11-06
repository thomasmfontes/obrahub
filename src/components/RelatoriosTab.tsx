import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  X
} from 'lucide-react';
import type { RelatorioViagem } from '../types';
import { formatCurrencyBRL, triggerHaptic, calculateDaysBetween } from '../utils/formatters';

interface RelatoriosTabProps {
  relatorios: RelatorioViagem[];
  isLoading: boolean;
  loadUnavailable?: boolean;
  onStartNew: () => void;
  onResumeReport: (rep: RelatorioViagem) => void;
  onViewReport: (rep: RelatorioViagem) => void;
}

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({
  relatorios,
  isLoading,
  loadUnavailable = false,
  onStartNew,
  onResumeReport,
  onViewReport
}) => {
  const [filter, setFilter] = useState<'todos' | 'aberto' | 'concluido'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateVal?: any): string => {
    if (!dateVal) return '--';
    try {
      if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return '--';
        return dateVal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      }
      const str = String(dateVal);
      const clean = str.includes('T') ? str.split('T')[0] : str;
      const parts = clean.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      }
      return str;
    } catch {
      return '--';
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'IR';
    const clean = name.replace(/^(Pr\.|Miss\.|Ev\.|Dca\.|Dc\.|Ir\.|Irª\.)\s*/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) return 'IR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Contadores para as pílulas de filtro
  const counts = useMemo(() => {
    let abertos = 0;
    let concluidos = 0;
    relatorios.forEach((r) => {
      if (r.t_status === 'Concluído') concluidos++;
      else abertos++;
    });
    return { todos: relatorios.length, aberto: abertos, concluido: concluidos };
  }, [relatorios]);

  const filteredList = relatorios.filter((r) => {
    // Status filter
    if (filter === 'aberto' && r.t_status === 'Concluído') return false;
    if (filter === 'concluido' && r.t_status !== 'Concluído') return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchMissionario = (r.nm_missionario || '').toLowerCase().includes(term);
      const matchPolo = (r.nm_polo_destino || '').toLowerCase().includes(term);
      const matchProtocolo = (r.nm_documento_protocolo || '').toLowerCase().includes(term);
      return matchMissionario || matchPolo || matchProtocolo;
    }

    return true;
  });

  return (
    <div className="desktop-page flex-1 px-4 pt-5 safe-pb-dock space-y-4 overflow-y-auto overscroll-y-contain">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Relatórios
          </h1>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
            {isLoading || loadUnavailable ? '—' : counts.todos}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onStartNew();
          }}
          aria-label="Novo Relatório"
          className="w-10 h-10 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por irmão, localidade ou #protocolo..."
          className="w-full h-11 pl-10 pr-9 bg-white rounded-xl border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtros em Pílulas com Contadores */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'todos', label: 'Todos', count: counts.todos },
          { id: 'aberto', label: 'Em Aberto', count: counts.aberto },
          { id: 'concluido', label: 'Concluídos', count: counts.concluido },
        ].map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilter(f.id as any);
              }}
              className={`h-8 px-3.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-[#0B1B2B] text-white shadow-xs'
                  : 'bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {isLoading || loadUnavailable ? '—' : f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de Relatórios com Cards Mobile-Premium */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Clock className="w-6 h-6 mx-auto animate-spin text-slate-400" />
          <p className="text-xs font-medium">Carregando relatórios...</p>
        </div>
      ) : loadUnavailable && relatorios.length === 0 ? null : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/60 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Nenhum relatório encontrado</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchTerm ? 'Tente buscar com outros termos.' : 'Inicie uma prestação de contas tocando no botão acima.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="desktop-card-list space-y-3">
          {filteredList.map((rep) => {
            const isConcluido = rep.t_status === 'Concluído';
            const total = Number(rep.dc_total_realizado) || 0;
            const dias = (rep.nr_dias_campo && rep.nr_dias_campo > 0)
              ? rep.nr_dias_campo
              : calculateDaysBetween(rep.t_data_saida, rep.t_data_retorno);

            return (
              <div
                key={rep.id_relatorio || rep.nm_documento_protocolo}
                role="button"
                tabIndex={0}
                aria-label={`Relatório #${rep.nm_documento_protocolo || ''}, status: ${isConcluido ? 'Concluído' : 'Em Aberto'}`}
                onClick={() => {
                  triggerHaptic('light');
                  if (isConcluido) {
                    onViewReport(rep);
                  } else {
                    onResumeReport(rep);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHaptic('light');
                    if (isConcluido) {
                      onViewReport(rep);
                    } else {
                      onResumeReport(rep);
                    }
                  }
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.985] group space-y-3 focus-visible:outline-2 focus-visible:outline-[#0B1B2B]"
              >
                {/* Linha Superior: Protocolo & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/60 tracking-tight">
                    #{rep.nm_documento_protocolo}
                  </span>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1 shrink-0 ${
                    isConcluido 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                      : 'bg-amber-50 text-amber-800 border-amber-200/80'
                  }`}>
                    {isConcluido ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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

                {/* Corpo do Card: Avatar + Irmão Responsável + Localidade */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B1B2B] to-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ring-2 ring-slate-100">
                    {getInitials(rep.nm_missionario)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug truncate group-hover:text-sky-950 transition-colors">
                      {rep.nm_missionario || 'Irmão do Ministério'}
                    </h3>
                    <div className="flex items-center text-xs text-slate-500 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-sky-600 shrink-0" />
                      <span className="truncate font-medium text-slate-600">{rep.nm_polo_destino || 'Localidade a definir'}</span>
                    </div>
                  </div>
                </div>

                {/* Linha Inferior: Período com Dias e Valor em Destaque */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center text-slate-500 font-medium min-w-0 pr-2">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] truncate text-slate-600">
                      {formatDate(rep.t_data_saida)} — {formatDate(rep.t_data_retorno)}
                    </span>
                    {dias > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                        {dias}d
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-1">
                        {isConcluido ? 'Total Gasto' : 'Previsto'}
                      </span>
                      <span className="text-sm font-black text-slate-900 tracking-tight leading-none">
                        {formatCurrencyBRL(total)}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0B1B2B] group-hover:text-white transition shrink-0">
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
