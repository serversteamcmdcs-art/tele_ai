import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'https://tele-ai-17ok.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://tele-ai-17ok.onrender.com',
        ws: true,
      },
      '/uploads': {
        target: 'https://tele-ai-17ok.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
