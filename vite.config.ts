import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Autosol/", // IMPORTANTE: Esto permite que funcione en GitHub Pages
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});