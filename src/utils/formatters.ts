/**
 * Utilitários de formatação e microinterações no padrão iOS HIG
 */

/**
 * Aciona feedback tátil sutil (vibração háptica) em dispositivos móveis compatíveis
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(8);
      } else if (type === 'medium') {
        navigator.vibrate(15);
      } else if (type === 'success') {
        navigator.vibrate([10, 50, 15]);
      } else if (type === 'warning') {
        navigator.vibrate([20, 40, 20]);
      }
    } catch {
      // Ignora silenciosamente se o navegador bloquear vibração
    }
  }
}

/**
 * Formata um número para moeda brasileira (BRL)
 */
export function formatCurrencyBRL(val: number): string {
  if (isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Aplica máscara de moeda em tempo real enquanto o usuário digita números
 * Exemplo: usuário digita '1', '5', '0', '0' -> R$ 15,00 (raw: 15.00)
 */
export function parseCurrencyInput(value: string): { raw: number; formatted: string } {
  // Mantém apenas dígitos
  const cleanDigits = value.replace(/\D/g, '');
  if (!cleanDigits) {
    return { raw: 0, formatted: 'R$ 0,00' };
  }

  const rawNumber = parseInt(cleanDigits, 10) / 100;
  const formatted = formatCurrencyBRL(rawNumber);
  return { raw: rawNumber, formatted };
}

/**
 * Calcula a quantidade de dias no campo entre a saída e o retorno
 */
export function calculateDaysBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) || diffDays <= 0 ? 0 : diffDays;
}

/**
 * Normaliza qualquer valor de data (Date object, timestamp ISO, GMT string) para o formato YYYY-MM-DD
 * seguro para inputs HTML5 <input type="date"> e colunas DATE do PostgreSQL.
 */
export function normalizeDateToInput(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes('T')) return trimmed.split('T')[0];
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return '';
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para exibição elegante no iOS (ex: "05 de Outubro")
 */
export function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [ano, mes, dia] = dateStr.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formata para pílula resumida (ex: "05 Out")
 */
export function formatPillDate(dateVal: any): string {
  if (!dateVal) return '';
  try {
    if (dateVal instanceof Date) {
      const dia = String(dateVal.getDate()).padStart(2, '0');
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${dia} ${meses[dateVal.getMonth()]}`;
    }

    const str = String(dateVal);
    // Remove qualquer texto entre parênteses como (Horário Padrão de Brasília)
    const cleanStr = str.replace(/\s*\([^)]*\)/g, '').trim();

    // Se for string no formato YYYY-MM-DD
    const simpleParts = cleanStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (simpleParts) {
      const dia = simpleParts[3];
      const mesIndex = parseInt(simpleParts[2], 10) - 1;
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${dia} ${meses[mesIndex] || simpleParts[2]}`;
    }

    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${dia} ${meses[d.getMonth()]}`;
    }
    return str;
  } catch {
    return String(dateVal);
  }
}

export interface WhatsAppSummaryData {
  protocolo: string;
  irmao: string;
  ministerio?: string;
  destino: string;
  dataSaida?: string;
  dataRetorno?: string;
  diasAtendimento?: number;
  comitivaCount?: number;
  totalRealizado: number;
  tetoPreAprovado?: number;
  saldoRestante?: number;
  despesas?: Array<{ rubrica: string; valor: number; comprovantes?: number }>;
  declaracaoConfirmada?: boolean;
}

/**
 * Gera texto estruturado e humanizado para compartilhamento via WhatsApp com a Tesouraria / Ministério
 */
export function generateWhatsAppSummary(data: WhatsAppSummaryData): string {
  const lines: string[] = [];
  lines.push('🏛️ *OBRAHUB · PRESTAÇÃO DE CONTAS MINISTERIAL*');
  lines.push(`📋 *Protocolo:* #${data.protocolo}`);
  lines.push(`👤 *Irmão do Ministério:* ${data.irmao || 'Irmão Responsável'}`);
  if (data.ministerio) {
    lines.push(`🏢 *Ministério / Atendimento:* ${data.ministerio}`);
  }
  lines.push(`📍 *Localidade de Atendimento:* ${data.destino || 'Não especificada'}`);
  
  if (data.dataSaida && data.dataRetorno) {
    lines.push(`🗓️ *Período:* ${formatPillDate(data.dataSaida)} a ${formatPillDate(data.dataRetorno)} (${data.diasAtendimento || 1} dias)`);
  }
  if (data.comitivaCount) {
    lines.push(`👥 *Comitiva:* ${data.comitivaCount} irmão(s)`);
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💰 *RESUMO FINANCEIRO*');
  lines.push(`• *Total Executado:* ${formatCurrencyBRL(data.totalRealizado)}`);
  if (data.tetoPreAprovado !== undefined) {
    lines.push(`• *Teto Pré-Aprovado:* ${formatCurrencyBRL(data.tetoPreAprovado)}`);
  }
  if (data.saldoRestante !== undefined) {
    const status = data.saldoRestante >= 0 ? '(No Orçamento)' : '(Excedeu o Teto)';
    lines.push(`• *Saldo Restante:* ${formatCurrencyBRL(data.saldoRestante)} ${status}`);
  }

  if (data.despesas && data.despesas.length > 0) {
    lines.push('');
    lines.push('📑 *Detalhamento das Despesas:*');
    data.despesas.forEach((d) => {
      const docs = d.comprovantes ? ` (${d.comprovantes} doc)` : '';
      lines.push(`  ▪ ${d.rubrica}: ${formatCurrencyBRL(d.valor)}${docs}`);
    });
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('✅ *Declaração:* Despesas atestadas para fins ministeriais idôneos e registradas no sistema da Obra.');
  lines.push('');
  lines.push('A paz de Deus a todos os irmãos da Tesouraria e Ministério.');

  return lines.join('\n');
}

/**
 * Abre o WhatsApp diretamente com o texto pré-formatado para a Tesouraria / Ministério
 */
export function shareSummary(data: WhatsAppSummaryData): void {
  const text = generateWhatsAppSummary(data);
  triggerHaptic('success');

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

/**
 * Aplica máscara de distância em quilômetros (ex: "156 km")
 * Trata digitação e backspace suavemente.
 */
export function maskDistancia(val: string, prevVal?: string): string {
  if (!val) return '';

  let toProcess = val;
  // Se o usuário apagou com backspace sobre o sufixo "km"
  if (prevVal && val.length < prevVal.length && prevVal.toLowerCase().endsWith('km') && !val.toLowerCase().endsWith('km')) {
    toProcess = val.replace(/\s*\d\s*[km]*$/i, '');
  }

  const digits = toProcess.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return `${num.toLocaleString('pt-BR')} km`;
}

/**
 * Extrai o valor numérico bruto da distância (em km)
 */
export function parseDistanceRaw(val: string): number {
  if (!val) return 0;
  const digits = val.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Aplica máscara de tempo de trajeto padronizada (ex: "2h 30m" ou "45m")
 * Trata digitação progressiva, backspace e formatos comuns (230, 2:30, 2h30).
 */
export function maskTrajeto(val: string, prevVal?: string): string {
  if (!val) return '';

  let toProcess = val;
  // Se o usuário apagou com backspace sobre o sufixo "m"
  if (prevVal && val.length < prevVal.length && prevVal.toLowerCase().endsWith('m') && !val.toLowerCase().endsWith('m')) {
    toProcess = val.replace(/\s*\d\s*[m]*$/i, '');
  }

  const cleaned = toProcess.replace(/[^0-9hm: ]/gi, '');
  if (!cleaned) return '';

  // Se digitou formato com dois pontos (ex: 2:30)
  if (cleaned.includes(':')) {
    const [h, m] = cleaned.split(':');
    const hDig = h.replace(/\D/g, '');
    const mDig = m ? m.replace(/\D/g, '').slice(0, 2) : '';
    if (!hDig) return '';
    return `${hDig}h${mDig ? ` ${mDig}m` : ''}`;
  }

  // Se já possui 'h' explícito
  if (cleaned.toLowerCase().includes('h')) {
    const [hStr, mStr] = cleaned.split(/h/i);
    const hDig = hStr.replace(/\D/g, '');
    const mDig = mStr ? mStr.replace(/\D/g, '').slice(0, 2) : '';
    if (!hDig) return '';
    return `${hDig}h${mDig ? ` ${mDig}m` : ''}`;
  }

  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 1) return `${digits}h`;
  if (digits.length === 2) {
    const n = parseInt(digits, 10);
    if (n > 24) return `${digits}m`;
    return `${digits}h`;
  }
  if (digits.length === 3) {
    return `${digits[0]}h ${digits.slice(1)}m`;
  }
  const hPart = parseInt(digits.slice(0, digits.length - 2), 10);
  const mPart = digits.slice(-2);
  return `${hPart}h ${mPart}m`;
}

/**
 * Converte string de duração formatada ("2h 30m", "45m", "3h") para minutos inteiros
 */
export function parseTrajetoToMinutes(val: string): number {
  if (!val) return 0;
  const hMatch = val.match(/(\d+)\s*h/i);
  const mMatch = val.match(/(\d+)\s*m/i);
  let total = 0;
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  if (!hMatch && !mMatch) {
    if (val.includes(':')) {
      const [h, m] = val.split(':');
      total = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
    } else {
      const digits = val.replace(/\D/g, '');
      if (!digits) return 0;
      if (digits.length <= 2) {
        total = parseInt(digits, 10) * 60;
      } else {
        const h = parseInt(digits.slice(0, digits.length - 2), 10) || 0;
        const m = parseInt(digits.slice(-2), 10) || 0;
        total = h * 60 + m;
      }
    }
  }
  return total;
}

/**
 * Extrai as partes numéricas de horas e minutos de qualquer formato de duração
 * ("2h 30m", "02:30", "150m", etc.)
 */
export function parseDurationToParts(val: string): { hours: string; minutes: string } {
  if (!val) return { hours: '', minutes: '' };

  const hMatch = val.match(/(\d+)\s*h/i);
  const mMatch = val.match(/(\d+)\s*m/i);

  if (hMatch || mMatch) {
    const hours = hMatch ? hMatch[1] : '';
    const minutes = mMatch ? mMatch[1] : '';
    return { hours, minutes };
  }

  if (val.includes(':')) {
    const [h, m] = val.split(':');
    return {
      hours: h.replace(/\D/g, ''),
      minutes: m ? m.replace(/\D/g, '').slice(0, 2) : ''
    };
  }

  const digits = val.replace(/\D/g, '');
  if (!digits) return { hours: '', minutes: '' };
  if (digits.length <= 2) {
    return { hours: digits, minutes: '' };
  }
  return {
    hours: digits.slice(0, digits.length - 2),
    minutes: digits.slice(-2)
  };
}

/**
 * Converte componentes de horas e minutos em uma string de duração padronizada ("2h 30m")
 */
export function formatPartsToDuration(hours: string, minutes: string): string {
  const hDigits = hours.replace(/\D/g, '');
  const mDigits = minutes.replace(/\D/g, '');

  if (!hDigits && !mDigits) return '';

  if (!hDigits && mDigits) return `${mDigits}m`;
  if (hDigits && !mDigits) return `${hDigits}h`;
  return `${hDigits}h ${mDigits}m`;
}

/**
 * Formata minutos inteiros (ex: 150) para duração legível padronizada (ex: "2h 30m")
 */
export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

/**
 * Extrai as iniciais de um nome, desconsiderando títulos eclesiásticos
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'IR';
  const clean = name.replace(/^(Pr\.|Miss\.|Ev\.|Dca\.|Dc\.|Ir\.|Irª\.)\s*/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return 'IR';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formata máscara de telefone brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhoneMask(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}




