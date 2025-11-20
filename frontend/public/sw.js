// client/src/service-worker.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Gunakan manifest yang di-generate oleh Vite
precacheAndRoute(self.__WB_MANIFEST);

// Konfigurasi Background Sync
const bgSyncPlugin = new BackgroundSyncPlugin('relapse-sync-queue', {
  maxRetentionTime: 24 * 60 // Coba lagi selama 24 jam
});

// Terapkan strategi NetworkOnly dengan plugin background sync
// untuk endpoint /api/relapses
registerRoute(
  ({ url }) => url.pathname === '/api/relapses',
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);