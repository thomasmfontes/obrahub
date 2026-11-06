// Service Worker para Firebase Cloud Messaging (ObraHub)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parâmetros dinâmicos passados via query string na chamada de registro
const params = new URLSearchParams(self.location.search);
const apiKey = params.get('apiKey');
const projectId = params.get('projectId');
const messagingSenderId = params.get('messagingSenderId');
const appId = params.get('appId');

if (apiKey && projectId) {
  try {
    firebase.initializeApp({
      apiKey,
      projectId,
      messagingSenderId: messagingSenderId || undefined,
      appId: appId || undefined
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'ObraHub: Hora de fechar o dia!';
      const options = {
        body: payload.notification?.body || 'Lembre-se de registrar suas atividades e despesas de hoje.',
        icon: '/icon.svg',
        badge: '/badge.png',
        sound: '/sounds/notification.mp3',
        vibrate: [200, 100, 200],
        data: payload.data || {}
      };

      self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.warn("FCM Service Worker inicializado em modo offline:", e);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('postMessage' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
