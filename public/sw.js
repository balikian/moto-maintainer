// SwingArm's service worker: shows push notifications (the daily reminders
// from lib/reminderJob.ts, and More's test) and opens SwingArm when one is
// tapped. It doesn't cache anything; the app still needs a connection.
// Registered by app/hooks/usePush.ts. Served with no-cache (next.config.ts),
// so changes here reach riders on their next visit.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(message.title || 'SwingArm', {
      body: message.body || '',
      tag: message.tag || undefined,
      icon: '/icons/icon-192.png',
      // Android's status bar icon: white on transparent.
      badge: '/icons/badge-96.png',
      data: { url: message.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      // Bring an open SwingArm window forward instead of opening another.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        try {
          await open.navigate(url);
        } catch {
          // Windows this worker doesn't control can't be navigated; focusing is enough.
        }
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
