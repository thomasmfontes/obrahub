import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const useSsl = process.env.VITE_NO_SSL !== 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(useSsl ? [basicSsl()] : [])],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            return 'vendor-libs';
          }
          if (id.includes('municipios.json') || id.includes('internacional.json')) {
            return 'data-localidades';
          }
        }
      }
    }
  }
});
