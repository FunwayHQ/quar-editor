import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'QUAR Editor',
        short_name: 'QUAR',
        description: 'Open Source 3D Design Platform',
        theme_color: '#7C3AED',
        background_color: '#0A0A0B',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      // Sprint Y: Force single Three.js instance
      'three': path.resolve(__dirname, './node_modules/three'),
      '@react-three/fiber': path.resolve(__dirname, './node_modules/@react-three/fiber'),
      '@react-three/drei': path.resolve(__dirname, './node_modules/@react-three/drei'),
      'zustand': path.resolve(__dirname, './node_modules/zustand'),
    },
    dedupe: ['react', 'react-dom', 'three', 'zustand', '@react-three/fiber', '@react-three/drei']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true,
      port: 5173
    },
    watch: {
      usePolling: true
    },
    force: true
  },
  optimizeDeps: {
    exclude: ['@playwright/test', 'playwright-core'], // Don't pre-bundle Playwright
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'zustand'
    ],
    force: true // Force re-optimization
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'], // Only src tests
    exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
    // Sprint Y: Single-threaded pool to prevent module duplication
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true  // Run all tests in single process
      }
    },
    // Force single Three.js instance
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'three': path.resolve(__dirname, './node_modules/three'),
        '@react-three/fiber': path.resolve(__dirname, './node_modules/@react-three/fiber'),
        '@react-three/drei': path.resolve(__dirname, './node_modules/@react-three/drei'),
        'zustand': path.resolve(__dirname, './node_modules/zustand'),
      },
      dedupe: ['react', 'react-dom', 'three', 'zustand', '@react-three/fiber', '@react-three/drei']
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'e2e/']
    }
  }
});
