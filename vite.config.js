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
      includeAssets: ['PrecisionPrep.png', 'robots.txt', 'manifest.webmanifest'],
      manifest: {
        name: 'PrecisionPrep Timer Tracker',
        short_name: 'PrecisionPrep',
        theme_color: '#3F51B5',
        background_color: '#F5F5F5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/PrecisionPrep.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/PrecisionPrep.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Improve caching strategy
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
