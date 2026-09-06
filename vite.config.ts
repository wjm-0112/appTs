import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base:'./' + HashRouter：兼容后续 GitHub Pages 静态部署
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    outDir: process.env.OUT_DIR || 'site',
    emptyOutDir: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          idb: ['idb']
        }
      }
    }
  }
});
