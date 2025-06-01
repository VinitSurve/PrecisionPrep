import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5353,
    host: true,
    // Fix MIME types and cross-origin issues
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
    // Force the server to serve HTML properly
    middlewareMode: false
  },
  build: {
    sourcemap: true,
    // Ensure proper output paths
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    react({
      // Make sure the JSX refresh script works correctly
      jsxRuntime: 'automatic',
      fastRefresh: true
    }),
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
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
