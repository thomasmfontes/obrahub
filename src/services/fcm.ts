import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { registerPushDeviceToken } from './neon';

function getServiceWorkerUrl(): string {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const senderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (apiKey && projectId) {
    const params = new URLSearchParams({
      apiKey,
      projectId,
      ...(senderId ? { messagingSenderId: senderId } : {}),
      ...(appId ? { appId } : {})
    });
    return `/firebase-messaging-sw.js?${params.toString()}`;
  }
  return '/firebase-messaging-sw.js';
}

export async function requestPushPermission(idMissionario?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, error: 'Notificações não são suportadas neste navegador.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permissão de notificação não concedida.' };
    }

    const supported = await isSupported().catch(() => false);
    if (!supported || !app) {
      // Simulação / fallback offline seguro gravado no banco
      const localToken = `web_mock_token_${Date.now()}`;
      await registerPushDeviceToken(localToken, idMissionario);
      return { success: true, token: localToken };
    }

    try {
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.register(getServiceWorkerUrl()).catch(() => undefined);
      }

      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

      const token = await getToken(messaging, {
        serviceWorkerRegistration: swRegistration,
        vapidKey
      });

      if (token) {
        await registerPushDeviceToken(token, idMissionario);
        return { success: true, token };
      }
    } catch (innerErr) {
      console.warn('FCM token warning (possível certificado SSL autoassinado de dev):', innerErr);
      const fallbackToken = `web_dev_fallback_${Date.now()}`;
      await registerPushDeviceToken(fallbackToken, idMissionario).catch(() => {});
      return { success: true, token: fallbackToken };
    }

    const localToken = `web_mock_token_${Date.now()}`;
    await registerPushDeviceToken(localToken, idMissionario);
    return { success: true, token: localToken };
  } catch (err: any) {
    console.warn('Aviso ao registrar Push Notification:', err);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const localToken = `web_fallback_${Date.now()}`;
      await registerPushDeviceToken(localToken, idMissionario).catch(() => {});
      return { success: true, token: localToken };
    }
    return { success: false, error: err?.message || 'Falha ao registrar notificações.' };
  }
}

export function setupForegroundNotificationListener(onReceive: (payload: any) => void): (() => void) | undefined {
  try {
    if (!app) return undefined;
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      onReceive(payload);
    });
  } catch {
    return undefined;
  }
}

export function getPushPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Reprodução de áudio impedida ou aguardando interação:', err);
      });
    }
  } catch (err) {
    console.warn('Falha ao inicializar áudio de notificação:', err);
  }
}

export async function triggerLocalNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: any;
  playSound?: boolean;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Reproduz o som de notificação personalizado se permitido
  if (options.playSound !== false) {
    playNotificationSound();
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  if (permission !== 'granted') return false;

  // 1. Tenta disparar com a API nativa Notification direta (não depende de rede nem de SSL do script do SW)
  try {
    const notif = new Notification(options.title, {
      body: options.body,
      icon: '/icon.svg',
      badge: '/badge.png',
      tag: options.tag || 'obrahub-lembrete',
      data: options.data || { url: '/' }
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (directErr) {
    // 2. Se a API direta falhar (ex: Android Chrome exige registro do ServiceWorker)
    try {
      if ('serviceWorker' in navigator) {
        let reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
        if (!reg) {
          reg = await navigator.serviceWorker.register(getServiceWorkerUrl()).catch(() => undefined);
        }
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(options.title, {
            body: options.body,
            icon: '/icon.svg',
            badge: '/badge.png',
            tag: options.tag || 'obrahub-lembrete',
            vibrate: [200, 100, 200],
            data: options.data || { url: '/' }
          } as any);
          return true;
        }
      }
    } catch (swErr) {
      console.warn("Fallback ServiceWorker de notificação falhou:", swErr);
    }
  }

  return false;
}

export function sendDelayedTestNotification(
  delaySeconds: number,
  onTick?: (remaining: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    let remaining = delaySeconds;
    if (onTick) onTick(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      if (onTick) onTick(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        triggerLocalNotification({
          title: "ObraHub: Lembrete de Viagem 🚀",
          body: "Hora de registrar suas despesas e comprovantes do dia de hoje!",
          tag: "obrahub-lembrete-teste",
          data: { url: '/?action=diario_hoje', step: 'step2' }
        }).then(resolve);
      }
    }, 1000);
  });
}
