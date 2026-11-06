import fs from 'fs';

// Normalize and deduplicate App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Remove duplicate state declarations
const targetState = `  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);`;

const firstStateIdx = app.indexOf(targetState);
if (firstStateIdx !== -1) {
  const secondStateIdx = app.indexOf(targetState, firstStateIdx + targetState.length);
  if (secondStateIdx !== -1) {
    app = app.substring(0, secondStateIdx) + app.substring(secondStateIdx + targetState.length);
  }
}

// 2. Fix handleEnablePush
const pushFunc = `  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const activeMissionarioId = membros.find(m => m.nm_missionario === missionario)?.id_missionario;
      const res = await requestPushPermission(activeMissionarioId);
      if (res.success) {
        setIsPushEnabled(true);
        showNotification("Lembretes noturnos às 20h ativados com sucesso!", "success");
      } else {
        showNotification(res.error || "Permissão de notificação não concedida.", "warning");
      }
    } catch {
      showNotification("Não foi possível registrar o dispositivo para push.", "error");
    } finally {
      setIsRegisteringPush(false);
    }
  };`;

// Remove all occurrences of handleEnablePush first
const regexHandlePush = /  const handleEnablePush = async \(\) => {[\s\S]*?finally {[\s\S]*?setIsRegisteringPush\(false\);[\s\S]*?};\n/g;
app = app.replace(regexHandlePush, '');

// Insert it cleanly before handleOpenExpenseSheet
app = app.replace('  // Abre Bottom Sheet para adicionar despesa', pushFunc + '\n\n  // Abre Bottom Sheet para adicionar despesa');

fs.writeFileSync('src/App.tsx', app, 'utf8');

// Normalize and deduplicate WizardStep2.tsx
let w2 = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8').replace(/\r\n/g, '\n');
const targetW2 = `  const despesasDoDia = (despesas || []).filter(d => d.t_data_despesa === selectedDay);
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);`;

const firstW2Idx = w2.indexOf(targetW2);
if (firstW2Idx !== -1) {
  const secondW2Idx = w2.indexOf(targetW2, firstW2Idx + targetW2.length);
  if (secondW2Idx !== -1) {
    w2 = w2.substring(0, secondW2Idx) + w2.substring(secondW2Idx + targetW2.length);
  }
}

fs.writeFileSync('src/components/WizardStep2.tsx', w2, 'utf8');
console.log('✅ Normalização e deduplicação aplicadas com sucesso!');
