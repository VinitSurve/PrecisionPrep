import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(
  
  {
  server: {
    port: 5348,
    host:true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'PrecisionPrep Timer Tracker',
        short_name: 'PrecisionPrep Timer',
        theme_color: '#3F51B5',
        background_color: '#F5F5F5',
        display: 'standalone',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
