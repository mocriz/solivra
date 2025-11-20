// client/vite.config.js
import {
  defineConfig
} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  VitePWA
} from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss({
      content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      srcObject: 'src/service-worker.js',
      strategies: 'injectManifest',
      manifest: {
        name: 'Solivra',
        short_name: 'Solivra',
        description: 'Transform your habits and track your progress with Solivra.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [{
            src: 'icons/android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: "192.168.1.11",
      port: 5173,
      protocol: "ws"
    },
  },
})
