import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Building2,
  Globe,
  Users, 
  Droplet, 
  Award, 
  Plane, 
  Briefcase, 
  Plus, 
  Minus,
  Search, 
  X, 
  FileSpreadsheet, 
  Pencil, 
  Trash2, 
  Loader2, 
  Check 
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import type { AgendaItem, Missionario, PoloMissionario } from '../types';
import { triggerHaptic, normalizeDateToInput } from '../utils/formatters';
import { getAgendaItems, saveAgendaItem, deleteAgendaItem } from '../services/neon';
import { loadResource, type LoadState } from '../utils/loadResource';
import { LoadFeedback } from './LoadFeedback';
import { BottomSheet } from './BottomSheet';
import { CustomSelect } from './CustomSelect';
import { buscarLocalidades } from '../services/localidades';

interface AgendaTabProps {
  onPlanMission: (event: AgendaItem) => void;
  onShowNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  membros?: Missionario[];
  polos?: PoloMissionario[];
}

export const AgendaTab: React.FC<AgendaTabProps> = ({ 
  onPlanMission, 
  onShowNotification,
  membros = [],
  polos = []
}) => {
  const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const hasAgendaData = React.useRef(false);
  const loadingAgenda = React.useRef(false);
  const [filter, setFilter] = useState<'todos' | 'viagem' | 'liturgia' | 'reuniao'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // BottomSheet de Detalhes
  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
  const [activeEventDetail, setActiveEventDetail] = useState<AgendaItem | null>(null);

  useEffect(() => {
    if (selectedEvent) {
      setActiveEventDetail(selectedEvent);
    }
  }, [selectedEvent]);

  const displayEvent = selectedEvent || activeEventDetail;

  // BottomSheet de Cadastro / Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipo, setFormTipo] = useState<'viagem' | 'batismo' | 'ceia' | 'reuniao'>('viagem');
  const [formDataInicio, setFormDataInicio] = useState('');
  const [formDataFim, setFormDataFim] = useState('');
  const [formLocal, setFormLocal] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formParticipantes, setFormParticipantes] = useState<number>(4);
  const [formObservacao, setFormObservacao] = useState('');

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

  // Carrega a agenda real do Neon
  const loadAgenda = async () => {
    if (loadingAgenda.current) return;
    loadingAgenda.current = true;
    setIsLoading(true);
    try {
      const state = await loadResource('agenda', getAgendaItems, hasAgendaData.current, setAgendaList, Array.isArray);
      if (state !== 'error') hasAgendaData.current = true;
      setLoadState(state);
    } finally {
      loadingAgenda.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, []);

  // Contadores para as pílulas de filtro
  const counts = useMemo(() => {
    let viagem = 0;
    let liturgia = 0;
    let reuniao = 0;
    agendaList.forEach((ev) => {
      if (ev.t_tipo === 'viagem') viagem++;
      else if (ev.t_tipo === 'batismo' || ev.t_tipo === 'ceia') liturgia++;
      else if (ev.t_tipo === 'reuniao') reuniao++;
    });
    return { todos: agendaList.length, viagem, liturgia, reuniao };
  }, [agendaList]);

  const filteredEvents = agendaList.filter((ev) => {
    // Filtro de Categoria
    if (filter === 'viagem' && ev.t_tipo !== 'viagem') return false;
    if (filter === 'liturgia' && ev.t_tipo !== 'batismo' && ev.t_tipo !== 'ceia') return false;
    if (filter === 'reuniao' && ev.t_tipo !== 'reuniao') return false;

    // Filtro de Busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = (ev.nm_titulo || '').toLowerCase().includes(term);
      const matchLocal = (ev.nm_local || '').toLowerCase().includes(term);
      const matchResp = (ev.nm_responsavel || '').toLowerCase().includes(term);
      return matchTitle || matchLocal || matchResp;
    }

    return true;
  });

  const getEventBadge = (tipo: string) => {
    switch (tipo) {
      case 'viagem':
        return {
          icon: <Plane className="w-3.5 h-3.5" />,
          label: 'Viagem',
          bg: 'bg-sky-50 text-sky-800 border-sky-200/80'
        };
      case 'batismo':
        return {
          icon: <Droplet className="w-3.5 h-3.5" />,
          label: 'Batismo',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
        };
      case 'ceia':
        return {
          icon: <Award className="w-3.5 h-3.5" />,
          label: 'Santa Ceia',
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80'
        };
      default:
        return {
          icon: <Briefcase className="w-3.5 h-3.5" />,
          label: 'Reunião',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
        };
    }
  };

  const formatDisplayDate = (val: any) => {
    const normalized = normalizeDateToInput(val);
    if (!normalized) return '--';
    try {
      const [year, month, day] = normalized.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return normalized;
    }
  };

  const formatDisplayDateRange = (inicio?: any, fim?: any) => {
    const i = formatDisplayDate(inicio);
    if (!fim) return i;
    const f = formatDisplayDate(fim);
    if (f === '--' || f === i) return i;

    try {
      const [iDay, iMonth, iYear] = i.split('/');
      const [fDay, fMonth, fYear] = f.split('/');
      if (iYear && fYear && iYear === fYear) {
        if (iMonth === fMonth) {
          return `${iDay} a ${fDay}/${fMonth}/${iYear}`;
        }
        return `${iDay}/${iMonth} a ${fDay}/${fMonth}/${iYear}`;
      }
    } catch {
      // fallback
    }
    return `${i} a ${f}`;
  };

  const formatEventDate = (dateVal: any) => {
    try {
      const clean = normalizeDateToInput(dateVal);
      if (!clean) return { day: '--', month: '--' };
      const parts = clean.split('-');
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return {
        day: String(day).padStart(2, '0'),
        month: months[monthIndex] || 'OUT'
      };
    } catch {
      return { day: '--', month: '--' };
    }
  };

  const handleOpenNew = () => {
    triggerHaptic('medium');
    const hoje = normalizeDateToInput(new Date());
    const dataFim = normalizeDateToInput(new Date(Date.now() + 7 * 86400000));
    
    setEditingId(null);
    setFormTitulo('');
    setFormTipo('viagem');
    setFormDataInicio(hoje);
    setFormDataFim(dataFim);
    setFormLocal('');
    setFormResponsavel(membros.length > 0 ? membros[0].nm_missionario : '');
    setFormParticipantes(4);
    setFormObservacao('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: AgendaItem) => {
    triggerHaptic('light');
    setSelectedEvent(null);
    setEditingId(item.id_agenda);
    setFormTitulo(item.nm_titulo);
    setFormTipo(item.t_tipo);
    setFormDataInicio(normalizeDateToInput(item.t_data_inicio));
    setFormDataFim(normalizeDateToInput(item.t_data_fim));
    setFormLocal(item.nm_local);
    setFormResponsavel(item.nm_responsavel);
    setFormParticipantes(item.nr_participantes_esperados || 1);
    setFormObservacao(item.t_observacao || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      onShowNotification('Informe o título do atendimento.', 'warning');
      return;
    }
    if (!formLocal.trim()) {
      onShowNotification('Informe a localidade ou congregação.', 'warning');
      return;
    }

    setIsSaving(true);
    triggerHaptic('medium');

    try {
      await saveAgendaItem({
        id_agenda: editingId || undefined,
        nm_titulo: formTitulo.trim().slice(0, 150),
        t_tipo: formTipo,
        t_data_inicio: formDataInicio,
        t_data_fim: formDataFim || undefined,
        nm_local: formLocal.trim(),
        nm_responsavel: formResponsavel.trim() || 'Irmão Responsável',
        nr_participantes_esperados: Number(formParticipantes) || 1,
        t_observacao: formObservacao.trim() || undefined,
        t_status: 'confirmado'
      });

      onShowNotification(
        editingId ? 'Atendimento atualizado com sucesso!' : 'Atendimento agendado com sucesso!',
        'success'
      );
      setIsFormOpen(false);
      await loadAgenda();
    } catch (err) {
      console.error('Erro ao salvar escala:', err);
      onShowNotification('Não foi possível salvar a escala no Neon.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    triggerHaptic('medium');
    try {
      await deleteAgendaItem(id);
      onShowNotification('Atendimento removido da agenda.', 'info');
      setDeletingId(null);
      setSelectedEvent(null);
      await loadAgenda();
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      onShowNotification('Erro ao excluir item da agenda.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareWhatsApp = (item: AgendaItem) => {
    triggerHaptic('light');
    const msg = `*Escala Ministerial CCB*\n\n` +
      `📅 *Evento:* ${item.nm_titulo}\n` +
      `📍 *Local:* ${item.nm_local}\n` +
      `👤 *Responsável:* ${item.nm_responsavel}\n` +
      `📆 *Data:* ${formatDisplayDateRange(item.t_data_inicio, item.t_data_fim)}\n` +
      `👥 *Participantes:* ${item.nr_participantes_esperados || 0} irmãos\n` +
      `📝 *Obs:* ${item.t_observacao || 'Sem observações adicionais.'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleBuscarLocalidades = useCallback((query: string) => {
    const results = buscarLocalidades(query, 35);
    return results.map(loc => ({
      value: loc.value,
      label: loc.label,
      description: loc.description,
      icon: loc.tipo === 'internacional'
        ? <Globe className="w-3.5 h-3.5 text-indigo-600" />
        : <Building2 className="w-3.5 h-3.5 text-slate-400" />
    }));
  }, []);

  return (
    <div className="desktop-page flex-1 px-4 pt-5 safe-pb-dock space-y-4 overflow-y-auto overscroll-y-contain">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Agenda
          </h1>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
            {!hasAgendaData.current ? '—' : counts.todos}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          aria-label="Agendar Atendimento"
          className="w-10 h-10 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          id="agenda-search"
          aria-label="Buscar por escala, localidade ou irmão"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por escala, localidade ou irmão..."
          className="w-full h-11 pl-10 pr-9 bg-white rounded-xl border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Limpar busca"
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
          { id: 'todos', label: 'Toda Agenda', count: counts.todos },
          { id: 'viagem', label: 'Viagens', count: counts.viagem },
          { id: 'liturgia', label: 'Batismos & Ceias', count: counts.liturgia },
          { id: 'reuniao', label: 'Alinhamentos', count: counts.reuniao },
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
              className={`h-8 px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center space-x-1.5 shrink-0 ${
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
                {!hasAgendaData.current ? '—' : f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de Eventos da Agenda (Cards Mobile-Premium) */}
      <LoadFeedback items={[{ label: 'agenda', state: loadState }]} isLoading={isLoading} onRetry={loadAgenda} />
      {isLoading && !hasAgendaData.current ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
          <p className="text-xs font-medium">Carregando escalas da agenda...</p>
        </div>
      ) : loadState === 'error' && agendaList.length === 0 ? null : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/60 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchTerm ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento agendado'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
              {searchTerm ? 'Tente buscar com outros termos.' : 'Agende viagens de atendimento, batismos, santas ceias ou alinhamentos ministeriais no botão acima.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              type="button"
              onClick={handleOpenNew}
              className="mt-2 h-10 px-4 bg-[#0B1B2B] hover:bg-[#132B45] text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Primeiro Atendimento</span>
            </button>
          )}
        </div>
      ) : (
        <div className="desktop-card-list space-y-3">
          {filteredEvents.map((item) => {
            const { day, month } = formatEventDate(item.t_data_inicio);
            const isConfirmed = item.t_status === 'confirmado';
            const badge = getEventBadge(item.t_tipo);

            return (
              <div
                key={item.id_agenda}
                role="button"
                tabIndex={0}
                aria-label={`Atendimento: ${item.nm_titulo}, Local: ${item.nm_local}, Data: ${day} de ${month}`}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedEvent(item);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHaptic('light');
                    setSelectedEvent(item);
                  }
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.985] cursor-pointer group flex items-start space-x-3.5 focus-visible:outline-2 focus-visible:outline-[#0B1B2B]"
              >
                {/* Badge de Data Estilo Calendário Apple */}
                <div className="w-12 h-14 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-slate-300 transition-colors">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider leading-none">
                    {month}
                  </span>
                  <span className="text-xl font-black text-slate-900 leading-none mt-1">
                    {day}
                  </span>
                </div>

                {/* Detalhes do Evento */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Linha Superior de Tags */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1 shrink-0 ${
                      isConfirmed 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                        : 'bg-amber-50 text-amber-800 border-amber-200/80'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span>{isConfirmed ? 'Confirmado' : 'Em Planejamento'}</span>
                    </span>
                    
                    <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center space-x-1 shrink-0 ${badge.bg}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Título do Evento */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-950 transition-colors">
                    {item.nm_titulo}
                  </h3>

                  {/* Localidade */}
                  <div className="flex items-center text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-sky-600 shrink-0" />
                    <span className="truncate font-medium text-slate-600">{item.nm_local}</span>
                  </div>

                  {/* Rodapé: Responsável & Participantes */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600">
                    <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                      {item.nm_responsavel}
                    </span>
                    {item.nr_participantes_esperados ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] inline-flex items-center space-x-1 shrink-0">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{item.nr_participantes_esperados} {item.nr_participantes_esperados === 1 ? 'irmão' : 'irmãos'}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          BOTTOM SHEET COM DETALHES DO ATENDIMENTO (INTERATIVO)
      ======================================================== */}
      {displayEvent && (
        <BottomSheet
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={displayEvent.nm_titulo}
          footer={
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenEdit(displayEvent)}
                className="h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => setDeletingId(displayEvent.id_agenda)}
                className="h-11 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Excluir</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4 pt-1">
            {/* Status e Categoria */}
            <div className="flex items-center space-x-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${
                displayEvent.t_status === 'confirmado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${displayEvent.t_status === 'confirmado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{displayEvent.t_status === 'confirmado' ? 'Atendimento Confirmado' : 'Em Planejamento'}</span>
              </span>

              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${getEventBadge(displayEvent.t_tipo).bg}`}>
                {getEventBadge(displayEvent.t_tipo).icon}
                <span>{getEventBadge(displayEvent.t_tipo).label}</span>
              </span>
            </div>

            {/* Informações detalhadas */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-3">
              {/* Localidade */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Localidade
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {displayEvent.nm_local}
                  </p>
                </div>
              </div>

              {/* Data & Comitiva */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-xl p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Período</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {formatDisplayDateRange(displayEvent.t_data_inicio, displayEvent.t_data_fim)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Comitiva</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {displayEvent.nr_participantes_esperados || 0} {displayEvent.nr_participantes_esperados === 1 ? 'irmão' : 'irmãos'}
                  </p>
                </div>
              </div>

              {/* Irmão Responsável */}
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/60 shadow-2xs flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {displayEvent.nm_responsavel ? displayEvent.nm_responsavel.substring(0, 2).toUpperCase() : 'CC'}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Irmão Responsável
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {displayEvent.nm_responsavel || 'Não informado'}
                  </p>
                </div>
              </div>

              {/* Observações */}
              {displayEvent.t_observacao && (
                <div className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Observações & Atendimentos
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {displayEvent.t_observacao}
                  </p>
                </div>
              )}
            </div>

            {/* Ações Rápidas */}
            <div className="space-y-2 pt-1">
              {displayEvent.t_tipo === 'viagem' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    onPlanMission(displayEvent);
                  }}
                  className="w-full h-11 bg-[#0B1B2B] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.99]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Iniciar Relatório Desta Viagem</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleShareWhatsApp(displayEvent)}
                className="w-full h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.99]"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>Compartilhar Escala</span>
              </button>


            </div>
          </div>
        </BottomSheet>
      )}

      {/* ========================================================
          BOTTOM SHEET: FORMULÁRIO DE CADASTRO / EDIÇÃO DE ESCALA
      ======================================================== */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Editar Escala' : 'Agendar Atendimento'}
        footer={
          <button
            type="submit"
            form="agenda-form-sheet"
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
                <span>{editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}</span>
              </>
            )}
          </button>
        }
      >
        <form id="agenda-form-sheet" onSubmit={handleSaveForm} className="space-y-3.5 pt-1">
          <div>
            <label htmlFor="agenda-titulo" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Título da Escala <span className="text-rose-500">*</span>
            </label>
            <input
              id="agenda-titulo"
              type="text"
              required
              maxLength={150}
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value.slice(0, 150))}
              placeholder="Ex: Atendimento Ministerial · Polo Sertão"
              className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="agenda-tipo" id="label-agenda-tipo" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Tipo de Atendimento <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                id="agenda-tipo"
                labelledBy="label-agenda-tipo"
                value={formTipo}
                onChange={(val) => setFormTipo(val as any)}
                options={[
                  { value: 'viagem', label: 'Viagem', icon: <Plane className="w-3.5 h-3.5 text-sky-600" /> },
                  { value: 'batismo', label: 'Batismo', icon: <Droplet className="w-3.5 h-3.5 text-emerald-600" /> },
                  { value: 'ceia', label: 'Santa Ceia', icon: <Award className="w-3.5 h-3.5 text-amber-600" /> },
                  { value: 'reuniao', label: 'Reunião', icon: <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> }
                ]}
              />
            </div>

            <div>
              <label htmlFor="agenda-participantes-count" id="label-agenda-participantes" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Participantes
              </label>
              <div 
                id="agenda-participantes-count"
                role="group"
                aria-labelledby="label-agenda-participantes"
                className="flex items-center h-11 bg-slate-50/70 border border-slate-200 rounded-xl px-1"
              >
                <button
                  type="button"
                  aria-label="Diminuir participantes"
                  onClick={() => setFormParticipantes(Math.max(1, formParticipantes - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center font-bold transition active:scale-95 shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 text-center font-semibold text-xs text-slate-800 select-none">
                  {formParticipantes} <span className="text-[11px] font-normal text-slate-500">irmãos</span>
                </div>
                <button
                  type="button"
                  aria-label="Aumentar participantes"
                  onClick={() => setFormParticipantes(Math.min(500, formParticipantes + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center font-bold transition active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="agenda-local" id="label-agenda-local" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Localidade ou País <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              id="agenda-local"
              labelledBy="label-agenda-local"
              value={formLocal}
              onChange={(val) => setFormLocal(val)}
              filterFn={handleBuscarLocalidades}
              placeholder="Selecione ou busque a localidade..."
              searchPlaceholder="Buscar cidade (Brasil/Exterior) ou país..."
              allowCreate={true}
              searchable={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="agenda-data-inicio" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Data de Início <span className="text-rose-500">*</span>
              </label>
              <input
                id="agenda-data-inicio"
                type="date"
                required
                value={formDataInicio}
                onChange={(e) => setFormDataInicio(e.target.value)}
                className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="agenda-data-fim" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Data de Término
              </label>
              <input
                id="agenda-data-fim"
                type="date"
                value={formDataFim}
                onChange={(e) => setFormDataFim(e.target.value)}
                className="w-full h-11 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="agenda-responsavel" id="label-agenda-responsavel" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Irmão Responsável
            </label>
            <CustomSelect
              id="agenda-responsavel"
              labelledBy="label-agenda-responsavel"
              value={formResponsavel}
              onChange={(val) => setFormResponsavel(val)}
              options={membros.map((m) => ({
                value: m.nm_missionario,
                label: m.nm_missionario,
                description: m.t_cargo_tipo
              }))}
              placeholder="Selecione ou busque o irmão responsável"
              searchPlaceholder="Digite o nome do irmão..."
              allowCreate={true}
              searchable={true}
            />
          </div>

          <div>
            <label htmlFor="agenda-observacao" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Observações adicionais
            </label>
            <textarea
              id="agenda-observacao"
              rows={2}
              value={formObservacao}
              onChange={(e) => setFormObservacao(e.target.value)}
              placeholder="Necessidades da localidade, congregações a visitar, preparativos..."
              className="w-full p-3 bg-slate-50/70 focus:bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs resize-none"
            />
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
            aria-labelledby="modal-delete-agenda-title"
            aria-describedby="modal-delete-agenda-desc"
            className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto" aria-hidden="true">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-delete-agenda-title" className="text-sm font-bold text-slate-900">Excluir atendimento?</h3>
              <p id="modal-delete-agenda-desc" className="text-xs text-slate-500 mt-1">
                Este compromisso será removido permanentemente da agenda de escalas.
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
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
