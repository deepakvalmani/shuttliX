import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // ── Path aliases ─────────────────────────────────────
  resolve: {
    alias: {
      '@':           resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages':      resolve(__dirname, 'src/pages'),
      '@hooks':      resolve(__dirname, 'src/hooks'),
      '@services':   resolve(__dirname, 'src/services'),
      '@store':      resolve(__dirname, 'src/store'),
      '@utils':      resolve(__dirname, 'src/utils'),
      '@styles':     resolve(__dirname, 'src/styles'),
    },
  },

  // ── Dev server proxy ─────────────────────────────────
  server: {
    proxy: {
      '/api':       { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    },
  },

  // ── Build optimisations ───────────────────────────────
  build: {
    target:    'es2020',
    sourcemap: false,          // enable in staging: sourcemap: 'hidden'
    minify:    'esbuild',
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting — keeps initial bundle lean
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Map library (large)
          'vendor-leaflet': ['leaflet'],
          // Socket
          'vendor-socket': ['socket.io-client'],
          // UI utilities
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'zustand', 'axios'],
        },
      },
    },
  },

  // ── Preview server ────────────────────────────────────
  preview: {
    port: 4173,
  },
});
