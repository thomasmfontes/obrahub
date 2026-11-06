import type { AgendaItem } from '../types';
import { normalizeDateToInput } from './formatters';

export function agendaReportFields(event: AgendaItem) {
  const participants = Number(event.nr_participantes_esperados);
  const hasParticipants = Number.isInteger(participants) && participants >= 1;
  return {
    missionario: event.nm_responsavel?.trim() || '',
    poloDestino: event.nm_local?.trim() || '',
    dataSaida: normalizeDateToInput(event.t_data_inicio),
    dataRetorno: normalizeDateToInput(event.t_data_fim),
    comitivaCount: hasParticipants ? participants : 1,
    objetivoPrimario: event.t_observacao?.trim() || '',
    source: { title: event.nm_titulo, missingParticipants: !hasParticipants }
  };
}
