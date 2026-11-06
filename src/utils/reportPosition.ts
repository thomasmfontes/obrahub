import type { RelatorioViagem } from '../types';
import { normalizeDateToInput } from './formatters';
import { validateTrip } from './tripValidation';

export type ReportPosition = { step: 'step1' | 'step2' | 'step3'; day: string };
type Identity = { protocolo: string };
const memory = new Map<string, ReportPosition>();
const key = (identity: Identity) => `obrahub_position_v1_${identity.protocolo}`;

export function saveReportPosition(identity: Identity, position: ReportPosition): void {
  memory.set(key(identity), position);
  try { localStorage.setItem(key(identity), JSON.stringify(position)); } catch { /* Keep position in this session. */ }
}

export function readReportPosition(identity: Identity): ReportPosition | null {
  try {
    const raw = localStorage.getItem(key(identity));
    if (raw) {
      const value = JSON.parse(raw);
      if (['step1', 'step2', 'step3'].includes(value?.step) && typeof value.day === 'string') return value;
    }
  } catch { /* Fall back to the current session. */ }
  return memory.get(key(identity)) || null;
}

export function clearReportPosition(identity: Identity): void {
  memory.delete(key(identity));
  try { localStorage.removeItem(key(identity)); } catch { /* Finalization remains confirmed. */ }
}

export function resolveReportPosition(report: RelatorioViagem): ReportPosition {
  const saved = readReportPosition({ protocolo: report.nm_documento_protocolo });
  const start = normalizeDateToInput(report.t_data_saida);
  const end = normalizeDateToInput(report.t_data_retorno);
  const valid = Object.keys(validateTrip({ missionario: report.nm_missionario || '', poloDestino: report.nm_polo_destino || '', dataSaida: start, dataRetorno: end })).length === 0;
  const savedDayValid = saved?.day && Object.keys(validateTrip({ missionario: 'Responsável', poloDestino: 'Destino', dataSaida: saved.day, dataRetorno: saved.day })).length === 0;
  const day = savedDayValid && saved!.day >= start && saved!.day <= end ? saved!.day : start;
  return { step: valid ? saved?.step || 'step1' : 'step1', day };
}

export function reportResumeLabel(report: RelatorioViagem): string {
  const position = resolveReportPosition(report);
  if (position.step === 'step2') return `Continuar no diário · ${position.day.split('-').reverse().join('/')}`;
  if (position.step === 'step3') return 'Continuar no financeiro';
  return 'Continuar preenchimento';
}
