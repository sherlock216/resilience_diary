// Service Worker가 설치되었을 때 호출되는 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

// Service Worker가 활성화되었을 때 호출되는 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});


self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);
  let data;
  data = event.data.json();

  const title = data.notification.title || '푸시 알림';
  const body = data.notification.body || event.data.text();
  const options = {
    body: body,
    icon: './image/144x144.png',
    badge: './image/144x144.png',
    vibrate: [200],
    actions: [
      {
        action: 'open_url',
        title: '웹사이트 열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ],
    data: {
      url: 'https://diary.nehub.info/dashboard.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[Service Worker] Notification shown:', title, options);
      })
      .catch(error => {
        console.error('[Service Worker] Error showing notification:', error);
      })
  );
});

//알림와서 클릭 시 main으로 바로 이동
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('dashboard.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://diary.nehub.info/dashboard.html');
      }
    })
  );
});