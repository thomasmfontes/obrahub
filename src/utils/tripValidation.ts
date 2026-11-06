export type TripFields = {
  missionario: string;
  poloDestino: string;
  dataSaida: string;
  dataRetorno: string;
};
export type TripErrors = Partial<Record<keyof TripFields, string>>;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTrip(fields: TripFields): TripErrors {
  const errors: TripErrors = {};
  if (!fields.missionario.trim()) errors.missionario = 'Informe o irmão responsável.';
  if (!fields.poloDestino.trim()) errors.poloDestino = 'Informe o destino da viagem.';
  if (!validDate(fields.dataSaida)) errors.dataSaida = 'Informe uma data de saída válida.';
  if (!validDate(fields.dataRetorno)) errors.dataRetorno = 'Informe uma data de retorno válida.';
  if (!errors.dataSaida && !errors.dataRetorno && fields.dataRetorno < fields.dataSaida) {
    errors.dataRetorno = 'O retorno deve ser igual ou posterior à saída.';
  }
  return errors;
}
