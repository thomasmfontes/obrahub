import fs from 'fs';

// 1. Update formatters.ts
let fmt = fs.readFileSync('src/utils/formatters.ts', 'utf8');

const oldFmt = `export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return \`\${h}h \${String(m).padStart(2, '0')}m\`;
  if (h > 0) return \`\${h}h\`;
  return \`\${m}m\`;
}`;

const newFmt = `export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return \`\${h}h \${String(m).padStart(2, '0')}m\`;
  return \`\${m}m\`;
}`;

fmt = fmt.replace(oldFmt, newFmt);
fmt = fmt.replace(oldFmt.replace(/\n/g, '\r\n'), newFmt.replace(/\n/g, '\r\n'));
fs.writeFileSync('src/utils/formatters.ts', fmt, 'utf8');

// 2. Update WizardStep2.tsx
let w2 = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');

// Fix handleHoursChange and handleBlurDuration
const oldHoursChange = `  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\\D/g, '').slice(0, 2);
    setLocalHours(digits);

    const nextDuration = formatPartsToDuration(digits, localMinutes);
    lastSyncTempoRef.current = nextDuration;
    setTempoTrajeto(nextDuration);

    if (digits.length === 2 && minutesInputRef.current) {
      minutesInputRef.current.focus();
    }
  };`;

const newHoursChange = `  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\\D/g, '').slice(0, 2);
    setLocalHours(digits);

    const nextDuration = formatPartsToDuration(digits, localMinutes || (digits ? '00' : ''));
    lastSyncTempoRef.current = nextDuration;
    setTempoTrajeto(nextDuration);

    if (digits.length === 2 && minutesInputRef.current) {
      minutesInputRef.current.focus();
    }
  };`;

w2 = w2.replace(oldHoursChange, newHoursChange);
w2 = w2.replace(oldHoursChange.replace(/\n/g, '\r\n'), newHoursChange.replace(/\n/g, '\r\n'));

const oldBlurDuration = `  const handleBlurDuration = () => {
    let h = localHours;
    let m = localMinutes;
    // Se tiver horas e minutos tiver 1 dígito ao sair do campo, formata como 0X
    if (m && m.length === 1 && h) {
      m = \`0\${m}\`;
      setLocalMinutes(m);
    }
    const finalDuration = formatPartsToDuration(h, m);
    lastSyncTempoRef.current = finalDuration;
    setTempoTrajeto(finalDuration);
    onBlurSave?.();
  };`;

const newBlurDuration = `  const handleBlurDuration = () => {
    let h = localHours;
    let m = localMinutes;
    if (h && !m) {
      m = '00';
      setLocalMinutes('00');
    } else if (m && m.length === 1 && h) {
      m = \`0\${m}\`;
      setLocalMinutes(m);
    }
    const finalDuration = formatPartsToDuration(h, m);
    lastSyncTempoRef.current = finalDuration;
    setTempoTrajeto(finalDuration);
    onBlurSave?.();
  };`;

w2 = w2.replace(oldBlurDuration, newBlurDuration);
w2 = w2.replace(oldBlurDuration.replace(/\n/g, '\r\n'), newBlurDuration.replace(/\n/g, '\r\n'));

// Ensure cleanKm strips .00
w2 = w2.replace(
  "const cleanKm = (kmPercorridos || '').replace(/\\D/g, '').slice(0, 6);",
  "const cleanKm = String(kmPercorridos || '').split('.')[0].replace(/\\D/g, '').slice(0, 6);"
);

fs.writeFileSync('src/components/WizardStep2.tsx', w2, 'utf8');
console.log('✅ formatters.ts e WizardStep2.tsx ajustados com sucesso!');
