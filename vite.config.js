import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle size visualizer
    visualizer({
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    // Target modern browsers
    target: 'es2015',

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },

    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Firebase services
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],

          // Internationalization
          'i18n-vendor': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector'
          ],

          // Charts library (heavy)
          'charts': ['recharts'],

          // Export libraries (heavy)
          'export': ['xlsx', 'jspdf', 'jspdf-autotable'],

          // Email service
          'email': ['@emailjs/browser']
        }
      }
    },

    // Chunk size warning limit (KB)
    chunkSizeWarningLimit: 500,

    // Source maps for production debugging (optional)
    sourcemap: false
  },

  // Development server configuration
  server: {
    port: 5173,
    open: true
  }
});
