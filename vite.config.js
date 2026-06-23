import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  base: '/Aplikacja/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Mój Świat',
        short_name: 'Mój Świat',
        description: 'Budżet, nawyki, modlitwa i więcej',
        theme_color: '#D4A574',
        background_color: '#14110D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Aplikacja/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
