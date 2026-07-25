import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'logo.svg', 'icons/*.png'],
      manifest: {
        name: 'Future Lawyer — Study & Productivity',
        short_name: 'LawBeyond',
        description: 'All-in-one law student productivity app: planner, journal, habits, budget, streaks',
        theme_color: '#006D37',
        background_color: '#FFFBFE',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Streaks', short_name: 'Streaks', url: '/streaks', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Planner', short_name: 'Planner', url: '/planner', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
