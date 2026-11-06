import React, { useState } from 'react';
import { 
  Calendar, 
  Fuel, 
  Utensils, 
  Bed, 
  Church, 
  Trash2, 
  Plus, 
  Check, 
  Loader2,
  Receipt,
  Info,
  Pencil,
  Eye,
  MoreVertical,
  X
} from 'lucide-react';
import type { DespesaRubrica, DestinatarioNotificacao } from '../types';
import { formatCurrencyBRL, triggerHaptic, formatPillDate, normalizeDateToInput } from '../utils/formatters';

interface WizardStep3Props {
  protocolo?: string;
  missionario?: string;
  poloDestino?: string;
  dataSaida?: string;
  dataRetorno?: string;
  comitivaCount?: number;
  totalRealizado: number;
  tetoPreAprovado: number;
  mediaDiaria: number;
  diasMissao: number;
  saldoRestante: number;
  percExecucao: number;
  despesas: DespesaRubrica[];
  onOpenExpenseSheet: () => void;
  onEditExpense: (expense: DespesaRubrica) => void;
  onDeleteExpense: (idDespesa: string) => void;
  declaracaoAceita: boolean;
  setDeclaracaoAceita: (val: boolean) => void;
  onBack: () => void;
  onFinalize: () => void;
  isSaving: boolean;
  destinatarios?: DestinatarioNotificacao[];
  selectedEmails?: string[];
  onToggleEmail?: (email: string) => void;
  onAddCustomEmail?: (email: string) => void;
  onRemoveCustomEmail?: (email: string) => void;
}

export const WizardStep3: React.FC<WizardStep3Props> = ({
  protocolo,
  missionario,
  poloDestino,
  dataSaida,
  dataRetorno,
  comitivaCount,
  totalRealizado,
  tetoPreAprovado,
  mediaDiaria,
  diasMissao,
  saldoRestante,
  percExecucao,
  despesas,
  onOpenExpenseSheet,
  onEditExpense,
  onDeleteExpense,
  declaracaoAceita,
  setDeclaracaoAceita,
  onBack,
  onFinalize,
  isSaving,
  destinatarios = [],
  selectedEmails = [],
  onToggleEmail,
  onAddCustomEmail,
  onRemoveCustomEmail
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Visualizador e animação de comprovantes (estilo morph iOS)
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

  // Agrupamento cronológico de despesas por data para um extrato financeiro limpo (timeline estilo Nubank/Apple)
  const groupedDespesas = React.useMemo(() => {
    const groups: { dateKey: string; label: string; despesas: DespesaRubrica[]; subtotal: number }[] = [];
    const map = new Map<string, { dateKey: string; label: string; despesas: DespesaRubrica[]; subtotal: number }>();

    despesas.forEach((d) => {
      const normalized = normalizeDateToInput(d.t_data_despesa);
      const key = normalized || 'sem-data';
      const label = normalized ? formatPillDate(normalized) : 'Outras despesas';

      let group = map.get(key);
      if (!group) {
        group = { dateKey: key, label, despesas: [], subtotal: 0 };
        map.set(key, group);
        groups.push(group);
      }
      group.despesas.push(d);
      group.subtotal += Number(d.dc_valor_despesa) || 0;
    });

    return groups.sort((a, b) => {
      if (a.dateKey === 'sem-data') return 1;
      if (b.dateKey === 'sem-data') return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [despesas]);

  return (
    <>
      <div className="desktop-wizard desktop-step-3 flex-1 px-4 py-5 space-y-4 overflow-y-auto overscroll-y-contain safe-pb-wizard max-w-lg mx-auto w-full">
        {/* Card 1: Prestação de Contas (Executivo / Sem visual de IA) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Prestação de Contas
            </span>
            {tetoPreAprovado > 0 ? (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                totalRealizado <= tetoPreAprovado 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60' 
                  : 'text-rose-700 bg-rose-50 border-rose-200/60'
              }`}>
                {totalRealizado <= tetoPreAprovado ? 'No Orçamento' : 'Excedeu Teto'}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border text-slate-700 bg-slate-100 border-slate-200/80">
                Sem Teto Fixo
              </span>
            )}
          </div>

          <div>
            <span className="text-3xl font-black text-slate-900 tracking-tight block">
              {formatCurrencyBRL(totalRealizado)}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Total executado em {diasMissao} {diasMissao === 1 ? 'dia' : 'dias'} de viagem
            </span>
          </div>

          {/* Grid de métricas financeiras */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            {tetoPreAprovado > 0 ? (
              <>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Teto Autorizado</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {formatCurrencyBRL(tetoPreAprovado)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Saldo Restante</span>
                  <span className={`text-xs font-bold block mt-0.5 ${
                    saldoRestante >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {formatCurrencyBRL(saldoRestante)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Média Diária</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">
                    {formatCurrencyBRL(mediaDiaria)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Média Diária</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {formatCurrencyBRL(mediaDiaria)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Comprovantes</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {despesas.length} {despesas.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Dias em Campo</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {diasMissao} {diasMissao === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Barra de progresso orçamentário ultrafina (apenas se houver teto pré-aprovado) */}
          {tetoPreAprovado > 0 && (
            <div className="space-y-1 pt-1">
              <div 
                role="progressbar"
                aria-valuenow={Math.round(percExecucao)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Percentual do teto utilizado"
                className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"
              >
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalRealizado <= tetoPreAprovado ? 'bg-[#0B1B2B]' : 'bg-rose-600'
                  }`}
                  style={{ width: `${Math.min(100, percExecucao)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>{Math.round(percExecucao)}% do orçamento utilizado</span>
                <span>{saldoRestante >= 0 ? 'Regular' : 'Ajuste pendente'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Lançamentos de Despesas (Extrato Limpo com Linhas Divisórias) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Despesas Lançadas
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {despesas.length} {despesas.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {despesas.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Nenhuma despesa lançada nesta missão.
            </div>
          ) : (
            <div className="space-y-3.5">
              {groupedDespesas.map((group) => (
                <div key={group.dateKey} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                  {/* Cabeçalho do Grupo por Data com Subtotal do Dia */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 px-0.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{group.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                      {formatCurrencyBRL(group.subtotal)}
                    </span>
                  </div>

                  {/* Lista de Itens do Dia */}
                  <div className="divide-y divide-slate-200/60">
                    {group.despesas.map((d) => {
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
                                    id={`receipt-badge-step3-${d.id_despesa}`}
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
                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white flex items-center justify-center ring-2 ring-white shadow-xs cursor-pointer transition"
                                  >
                                    <Receipt className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </button>
                                ) : (
                                  <div 
                                    title={`${receiptCount} comprovante(s) anexado(s)`}
                                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-2 ring-white"
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
                                  setActiveMenuId(activeMenuId === d.id_despesa ? null : d.id_despesa);
                                }}
                                aria-label={`Opções da despesa ${d.nm_rubrica}`}
                                title="Mais opções"
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition active:scale-95 ${
                                  activeMenuId === d.id_despesa
                                    ? 'bg-slate-200 text-slate-900'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                                }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuId === d.id_despesa && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-30" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
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
                                          const anchorEl = document.getElementById(`receipt-badge-step3-${d.id_despesa}`);
                                          setActiveMenuId(null);
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        triggerHaptic('light');
                                        onEditExpense(d);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Editar despesa</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        triggerHaptic('medium');
                                        onDeleteExpense(d.id_despesa);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Excluir</span>
                                    </button>
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
              ))}
            </div>
          )}

          {/* Botão de Adicionar Despesa Sólido e Executivo */}
          <button 
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenExpenseSheet();
            }}
            className="w-full h-11 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition active:scale-[0.985] border border-slate-200"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>Adicionar Despesa / Comprovante</span>
          </button>
        </div>

        {/* Card 3: Atesto de Idoneidade Fiscal & Ministerial */}
        <label
          className={`block w-full rounded-2xl p-5 border transition-all cursor-pointer select-none ${
            declaracaoAceita 
              ? 'bg-emerald-50/40 border-emerald-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)]' 
              : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300'
          }`}
        >
          <div className="flex items-start space-x-3.5">
            <input 
              type="checkbox" 
              id="declaracao-idoneidade"
              checked={declaracaoAceita} 
              onChange={e => setDeclaracaoAceita(e.target.checked)} 
              className="w-5 h-5 shrink-0 mt-0.5 accent-[#0B1B2B] rounded cursor-pointer" 
              aria-labelledby="declaration-title" 
              aria-describedby="declaration-description" 
            />
            <div className="space-y-1 flex-1">
              <h4 id="declaration-title" className="text-xs font-bold text-slate-900 block">
                Atesto de Idoneidade Fiscal & Ministerial
              </h4>
              <p id="declaration-description" className="text-[11px] text-slate-600 leading-relaxed font-normal">
                Atesto que as despesas acima registradas possuem idoneidade fiscal e destinaram-se exclusivamente ao atendimento das necessidades da Obra.
              </p>
            </div>
          </div>
        </label>

        {!declaracaoAceita && (
          <div className="desktop-span-all flex items-start space-x-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-800 text-[11px] font-medium leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>Você pode revisar agora. Para finalizar, será necessário marcar a declaração de idoneidade.</span>
          </div>
        )}
      </div>

      {/* Ações Fixas no Rodapé */}
      <div className="wizard-bottom-bar">
        <button 
          type="button"
          onClick={onFinalize}
          disabled={isSaving}
          className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-[0_4px_16px_rgba(11,27,43,0.25)] transition active:scale-[0.985] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <span>Revisar relatório</span>}
          <Check className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Modal de Prévia / Visualização de Comprovante (Morph Animado) */}
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

            {/* Imagem que expande a partir do menu/botão e volta perfeitamente */}
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
