import fs from 'fs';

// 1. Fix WizardStep2.tsx
let w2 = fs.readFileSync('src/components/WizardStep2.tsx', 'utf8');
const dupW2 = `  const despesasDoDia = (despesas || []).filter(d => d.t_data_despesa === selectedDay);
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);
  const despesasDoDia = (despesas || []).filter(d => d.t_data_despesa === selectedDay);
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);`;

const singleW2 = `  const despesasDoDia = (despesas || []).filter(d => d.t_data_despesa === selectedDay);
  const totalDespesasDia = despesasDoDia.reduce((sum, d) => sum + (Number(d.dc_valor_despesa) || 0), 0);`;

w2 = w2.replace(dupW2, singleW2);
w2 = w2.replace(dupW2.replace(/\n/g, '\r\n'), singleW2.replace(/\n/g, '\r\n'));
fs.writeFileSync('src/components/WizardStep2.tsx', w2, 'utf8');

// 2. Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove duplicate state
const dupState = `  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);
  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);`;

const singleState = `  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);`;

app = app.replace(dupState, singleState);
app = app.replace(dupState.replace(/\n/g, '\r\n'), singleState.replace(/\n/g, '\r\n'));

// Remove duplicate handleEnablePush and fix idMissionario
const dupPush = `  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const res = await requestPushPermission(idMissionario || undefined);
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
  };

  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const res = await requestPushPermission(idMissionario || undefined);
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

const singlePush = `  const handleEnablePush = async () => {
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

app = app.replace(dupPush, singlePush);
app = app.replace(dupPush.replace(/\n/g, '\r\n'), singlePush.replace(/\n/g, '\r\n'));

// Also replace any remaining single handleEnablePush that references idMissionario
app = app.replace(
  'const res = await requestPushPermission(idMissionario || undefined);',
  'const activeMissionarioId = membros.find(m => m.nm_missionario === missionario)?.id_missionario;\n      const res = await requestPushPermission(activeMissionarioId);'
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✅ Duplicatas corrigidas com sucesso!');
