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
  Loader2,
  Wallet
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
  const fields = { missionario, poloDestino, dataSaida, dataRetorno };
  const errors = attemptedNext ? validateTrip(fields) : {};
  const formRef = useRef<HTMLDivElement>(null);
  const handleNext = () => {
    setAttemptedNext(true);
    const invalid = validateTrip(fields);
    const first = Object.keys(invalid)[0] as keyof TripFields | undefined;
    if (first) {
      triggerHaptic('warning');
      formRef.current?.querySelector<HTMLElement>(`#trip-${first}`)?.focus();
      return;
    }
    onNext();
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

        {/* Bloco 3: Comitiva & Orçamento da Viagem */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          {/* Integrantes na Comitiva */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Integrantes na Comitiva
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {comitivaCount === 1 ? '1 irmão viajando' : `${comitivaCount} irmãos na comitiva`}
                </span>
              </div>
            </div>

            {/* Stepper Ergonômico */}
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setComitivaCount(Math.max(1, comitivaCount - 1));
                }}
                className="w-8 h-8 bg-white rounded-lg shadow-2xs text-slate-800 font-bold flex items-center justify-center transition active:scale-90 text-sm hover:bg-slate-50"
                aria-label="Diminuir"
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-bold text-slate-900">
                {comitivaCount}
              </span>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setComitivaCount(comitivaCount + 1);
                }}
                className="w-8 h-8 bg-white rounded-lg shadow-2xs text-slate-800 font-bold flex items-center justify-center transition active:scale-90 text-sm hover:bg-slate-50"
                aria-label="Aumentar"
              >
                +
              </button>
            </div>
          </div>

          {/* Divisor & Teto Orçamentário */}
          <div className="border-t border-slate-100 pt-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Teto / Verba da Viagem
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {temTetoPreAprovado ? 'Limite autorizado pela administração' : 'Viagem sem teto fixado (livre)'}
                  </span>
                </div>
              </div>

              {/* Segmented Control Compacto */}
              <div className="flex p-0.5 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setTemTetoPreAprovado(true);
                    if (!tetoPreAprovado || tetoPreAprovado <= 0) setTetoPreAprovado(5000);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    temTetoPreAprovado
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Com Teto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setTemTetoPreAprovado(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    !temTetoPreAprovado
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Livre
                </button>
              </div>
            </div>

            {/* Campo de Valor e Sugestões sem Scrollbar */}
            {temTetoPreAprovado && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <div className="relative">
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

                {/* 4 Sugestões Rápidas em Grid Perfeito (Sem barra de rolagem cortando) */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[1500, 3000, 5000, 8000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setTetoPreAprovado(val);
                      }}
                      className={`h-8 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center ${
                        tetoPreAprovado === val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {`R$ ${(val / 1000).toLocaleString('pt-BR')}k`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          disabled={isSaving}
          className="w-full h-12 bg-[#0B1B2B] hover:bg-[#132B45] text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-[0_4px_16px_rgba(11,27,43,0.25)] transition active:scale-[0.985] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <span>Continuar para Diário</span>}
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </>
  );
};
