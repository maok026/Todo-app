const CACHE_NAME = 'todo-app-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// キャッシュ優先、なければネットワークから取得
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// ── プッシュ通知スケジューリング ──
let notifyEnabled = false;
let notifyTimer = null;
const notifiedKeys = new Set();

const NOTIFY_SCHEDULE = [
  { hour: 7,  body: '今日も一日頑張りましょう！タスクを確認してスタートしよう' },
  { hour: 12, body: '進捗はいかがですか？午後もコツコツ積み上げよう' },
  { hour: 20, body: '今日の頑張りを記録しましょう！チェックを忘れずに' },
];

function checkNotifications() {
  if (!notifyEnabled) return;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  NOTIFY_SCHEDULE.forEach(({ hour, body }) => {
    const key = `${dateStr}-${hour}`;
    if (now.getHours() === hour && now.getMinutes() === 0 && !notifiedKeys.has(key)) {
      notifiedKeys.add(key);
      self.registration.showNotification('Todoアプリ', {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        data: { url: './' }
      });
    }
  });
}

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'NOTIFY_ON') {
    notifyEnabled = true;
    if (!notifyTimer) notifyTimer = setInterval(checkNotifications, 60000);
    checkNotifications();
  }
  if (event.data.type === 'NOTIFY_OFF') {
    notifyEnabled = false;
    if (notifyTimer) { clearInterval(notifyTimer); notifyTimer = null; }
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('./');
    })
  );
});
