import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Shared resolve configuration to avoid duplication
const sharedResolve = {
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
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: sharedResolve,
  server: {
    port: 3000,
    hmr: {
      overlay: true,
      port: 3000
    },
    watch: {
      usePolling: true
    }
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
    ]
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
    // Reuse shared resolve configuration
    resolve: sharedResolve,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'e2e/']
    }
  }
});
