import { validateTrip, type TripFields } from '../utils/tripValidation';
import React, { useState, useCallback, useRef } from 'react';
import { 
  User, 
  MapPin, 
  Building2, 
  Globe,
  Calendar, 
  Users, 
  FileText, 
  ChevronRight, 
  ArrowRight,
  Loader2,
  Wallet,
  Plus,
  Minus
} from 'lucide-react';
import type { Missionario, PoloMissionario } from '../types';
import { triggerHaptic, formatCurrencyBRL, parseCurrencyInput } from '../utils/formatters';
import { CustomSelect } from './CustomSelect';
import { buscarLocalidades } from '../services/localidades';

interface WizardStep1Props {
  agendaSource?: { title: string; missingParticipants: boolean } | null;
  missionario: string;
  setMissionario: (val: string) => void;
  poloDestino: string;
  setPoloDestino: (val: string) => void;
  dataSaida: string;
  setDataSaida: (val: string) => void;
  dataRetorno: string;
  setDataRetorno: (val: string) => void;
  diasMissao: number;
  comitivaCount: number;
  setComitivaCount: (val: number) => void;
  objetivoPrimario: string;
  setObjetivoPrimario: (val: string) => void;
  tetoPreAprovado: number;
  setTetoPreAprovado: (val: number) => void;
  temTetoPreAprovado: boolean;
  setTemTetoPreAprovado: (val: boolean) => void;
  isSaving: boolean;
  onNext: () => void;
  onBack: () => void;
  onSaveDraft?: () => void;
  onBlurSave?: () => void;
  membros?: Missionario[];
  polos?: PoloMissionario[];
}

export const WizardStep1: React.FC<WizardStep1Props> = ({
  agendaSource,
  missionario,
  setMissionario,
  poloDestino,
  setPoloDestino,
  dataSaida,
  setDataSaida,
  dataRetorno,
  setDataRetorno,
  diasMissao,
  comitivaCount,
  setComitivaCount,
  objetivoPrimario,
  setObjetivoPrimario,
  tetoPreAprovado,
  setTetoPreAprovado,
  temTetoPreAprovado,
  setTemTetoPreAprovado,
  isSaving,
  onNext,
  onBack,
  onSaveDraft,
  onBlurSave,
  membros = [],
  polos = []
}) => {
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const fields = { missionario, poloDestino, dataSaida, dataRetorno };
  const errors = attemptedNext ? validateTrip(fields) : {};
  const formRef = useRef<HTMLDivElement>(null);
  const handleNext = () => {
    if (isNavigating || isSaving) return;
    setAttemptedNext(true);
    const invalid = validateTrip(fields);
    const first = Object.keys(invalid)[0] as keyof TripFields | undefined;
    if (first) {
      triggerHaptic('warning');
      formRef.current?.querySelector<HTMLElement>(`#trip-${first}`)?.focus();
      return;
    }
    triggerHaptic('medium');
    setIsNavigating(true);
    setTimeout(() => {
      onNext();
      setTimeout(() => setIsNavigating(false), 500);
    }, 240);
  };
  const fieldError = (field: keyof TripFields) => errors[field]
    ? <p id={`trip-${field}-error`} className="text-xs text-red-700" role="alert">{errors[field]}</p>
    : null;

  const membroOptions = membros.map(m => ({
    value: m.nm_missionario,
    label: m.nm_missionario,
    description: m.t_cargo_tipo || 'Ministério CCB'
  }));

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
    <>
      <div ref={formRef} className="desktop-wizard desktop-step-1 flex-1 px-4 py-5 space-y-4 overflow-y-auto overscroll-y-contain safe-pb-wizard max-w-lg mx-auto w-full">
        {agendaSource && (
          <div className="desktop-span-all rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-2 text-sm text-sky-950">
            <p className="font-semibold">Dados da agenda: {agendaSource.title}</p>
            <p>Confira os dados desta viagem e ajuste o que for necessário. Complete os campos que não foram informados na agenda. As alterações aqui são salvas no relatório.</p>
            {agendaSource.missingParticipants && <p>A comitiva não foi informada na agenda. Confira o valor inicial de 1 integrante.</p>}
          </div>
        )}
        <p className="text-sm text-slate-600">Campos marcados com * são obrigatórios para continuar. Você pode salvar um rascunho incompleto.</p>
        {/* Bloco 1: Identificação Ministerial */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Identificação Ministerial
            </h3>
          </div>

          {/* Campo Irmão do Ministério (Select2 pesquisável com tagging) */}
          <div className="space-y-1.5">
            <label id="trip-missionario-label" htmlFor="trip-missionario" className="text-xs font-semibold text-slate-700 block">
              Irmão do Ministério Responsável *
            </label>
            <CustomSelect
              id="trip-missionario"
              labelledBy="trip-missionario-label"
              describedBy={errors.missionario ? "trip-missionario-error" : undefined}
              invalid={Boolean(errors.missionario)}
              value={missionario}
              onChange={(val) => setMissionario(val)}
              options={membroOptions}
              placeholder="Selecione ou busque o irmão..."
              searchPlaceholder="Digite o nome do irmão..."
              allowCreate={true}
              searchable={true}
            />
            {fieldError("missionario")}
          </div>

          {/* Campo Destino / Localidade (Consulta Real IBGE + Exterior) */}
          <div className="space-y-1.5">
            <label id="trip-poloDestino-label" htmlFor="trip-poloDestino" className="text-xs font-semibold text-slate-700 block">
              Destino da Viagem / Localidade *
            </label>
            <CustomSelect
              id="trip-poloDestino"
              labelledBy="trip-poloDestino-label"
              describedBy={errors.poloDestino ? "trip-poloDestino-error" : undefined}
              invalid={Boolean(errors.poloDestino)}
              value={poloDestino}
              onChange={(val) => setPoloDestino(val)}
              filterFn={handleBuscarLocalidades}
              placeholder="Selecione ou busque a localidade..."
              searchPlaceholder="Buscar cidade (Brasil/Exterior) ou país..."
              allowCreate={true}
              searchable={true}
            />
            {fieldError("poloDestino")}
          </div>
        </div>

        {/* Bloco 2: Período do Atendimento */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Período da Viagem
              </h3>
            </div>

            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              {diasMissao > 0 ? `${diasMissao} ${diasMissao === 1 ? 'dia' : 'dias'}` : 'Período a definir'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data Saída */}
            <div className="space-y-1.5">
              <label htmlFor="trip-dataSaida" className="text-xs font-semibold text-slate-700 block">
                Data de Saída *
              </label>
              <input 
                type="date"
                id="trip-dataSaida"
                aria-required="true"
                aria-invalid={Boolean(errors.dataSaida)}
                aria-describedby={errors.dataSaida ? "trip-dataSaida-error" : undefined}
                value={dataSaida}
                onChange={(e) => setDataSaida(e.target.value)}
                onBlur={onBlurSave}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition outline-none shadow-2xs"
              />
              {fieldError("dataSaida")}
            </div>

            {/* Data Retorno */}
            <div className="space-y-1.5">
              <label htmlFor="trip-dataRetorno" className="text-xs font-semibold text-slate-700 block">
                Data de Retorno *
              </label>
              <input 
                type="date"
                id="trip-dataRetorno"
                aria-required="true"
                aria-invalid={Boolean(errors.dataRetorno)}
                aria-describedby={errors.dataRetorno ? "trip-dataRetorno-error" : undefined}
                value={dataRetorno}
                onChange={(e) => setDataRetorno(e.target.value)}
                onBlur={onBlurSave}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition outline-none shadow-2xs"
              />
              {fieldError("dataRetorno")}
            </div>
          </div>
        </div>

        {/* Bloco 3: Integrantes da Comitiva */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Integrantes na Comitiva
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Tamanho da equipe para reservas e diárias
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800">
                {comitivaCount === 1 ? '1 irmão viajando' : `${comitivaCount} irmãos na comitiva`}
              </span>
              <span className="text-[11px] text-slate-500">
                {comitivaCount === 1 ? 'Missão individual' : 'Comitiva ministerial'}
              </span>
            </div>

            {/* Stepper Ergonômico com Botões Mais Confortáveis */}
            <div className="flex items-center space-x-2.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setComitivaCount(Math.max(1, comitivaCount - 1));
                }}
                disabled={comitivaCount <= 1}
                className="w-9 h-9 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition active:scale-95 cursor-pointer outline-none focus:outline-none"
                aria-label="Diminuir integrantes"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="w-7 text-center text-sm font-bold text-slate-900 tabular-nums">
                {comitivaCount}
              </span>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setComitivaCount(comitivaCount + 1);
                }}
                className="w-9 h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer outline-none focus:outline-none"
                aria-label="Aumentar integrantes"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Bloco 4: Teto Orçamentário / Verba da Viagem */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Teto Orçamentário / Verba
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Limite autorizado pela administração ou tesouraria
                </p>
              </div>
            </div>
          </div>

          {/* Seletor Segmented: Com Teto vs Sem Teto */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                if (!temTetoPreAprovado) {
                  triggerHaptic('light');
                  setTemTetoPreAprovado(true);
                  if (!tetoPreAprovado || tetoPreAprovado <= 0) setTetoPreAprovado(5000);
                }
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-colors duration-150 flex items-center justify-center space-x-1.5 cursor-pointer outline-none focus:outline-none ${
                temTetoPreAprovado
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Com Teto Definido</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (temTetoPreAprovado) {
                  triggerHaptic('light');
                  setTemTetoPreAprovado(false);
                }
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-colors duration-150 flex items-center justify-center space-x-1.5 cursor-pointer outline-none focus:outline-none ${
                !temTetoPreAprovado
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Sem Teto (Livre)</span>
            </button>
          </div>

          {temTetoPreAprovado ? (
            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="trip-teto" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Valor Autorizado (R$)
                </label>
                <input
                  id="trip-teto"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyBRL(tetoPreAprovado)}
                  onChange={(e) => {
                    const parsed = parseCurrencyInput(e.target.value);
                    setTetoPreAprovado(parsed.raw);
                  }}
                  onBlur={onBlurSave}
                  placeholder="R$ 5.000,00"
                  className="w-full h-11 px-3.5 text-base font-bold text-slate-900 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>

              {/* 4 Sugestões Rápidas em Grid Perfeito (Sem barra de rolagem horizontal) */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium block">Valores sugeridos:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1500, 3000, 5000, 8000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setTetoPreAprovado(val);
                      }}
                      className={`h-9 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center outline-none focus:outline-none ${
                        tetoPreAprovado === val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {formatCurrencyBRL(val).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-500 text-xs leading-relaxed">
              As despesas da missão serão contabilizadas normalmente e somadas na prestação de contas, sem indicador de limite ou saldo restante.
            </div>
          )}
        </div>

        {/* Bloco 4: Objetivo do Atendimento */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 stroke-[2]" />
              </div>
              <label htmlFor="trip-objetivo" className="text-sm font-bold text-slate-900 leading-tight">
                Objetivo do Atendimento (opcional)
              </label>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {objetivoPrimario.length > 300 ? `${objetivoPrimario.length} caracteres` : `${objetivoPrimario.length}/300`}
            </span>
          </div>

          <textarea id="trip-objetivo" 
            rows={3}
            maxLength={Math.max(300, objetivoPrimario.length)}
            value={objetivoPrimario}
            onChange={(e) => setObjetivoPrimario(e.target.value)}
            onBlur={onBlurSave}
            placeholder="Descreva o propósito da viagem ministerial (atendimentos de cultos, reuniões com a administração, visitas à irmandade, etc.)..."
            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition outline-none resize-none leading-relaxed shadow-2xs"
          />
        </div>
      </div>

      {/* Ações Fixas no Rodapé */}
      <div className="wizard-bottom-bar">
        <button 
          type="button"
          onClick={handleNext}
          disabled={isSaving || isNavigating}
          className="relative overflow-hidden w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold rounded-2xl text-xs flex items-center justify-center shadow-[0_4px_16px_rgba(11,27,43,0.25)] transition active:scale-[0.985] disabled:opacity-75 cursor-pointer group"
        >
          {isSaving ? (
            <div className="flex items-center justify-center space-x-1.5">
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
              <span>Salvando...</span>
            </div>
          ) : (
            <>
              {/* Conteúdo padrão */}
              <div 
                className={`flex items-center justify-center space-x-1.5 transition-all duration-200 ease-out ${
                  isNavigating 
                    ? 'opacity-0 scale-95 -translate-x-3 pointer-events-none' 
                    : 'opacity-100 scale-100 translate-x-0'
                }`}
              >
                <span>Continuar para Diário</span>
                <ChevronRight className="w-4 h-4 ml-0.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>

              {/* Seta animada suave no centro ao clicar */}
              {isNavigating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <ArrowRight className="w-5 h-5 text-white stroke-[2.5] animate-arrow-slide-center" />
                </div>
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
};
