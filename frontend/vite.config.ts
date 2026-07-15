import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables from process.env and .env files
  const env = loadEnv(mode, process.cwd(), '');

  const port = parseInt(env.VITE_PORT || '5180');
  const target = env.VITE_API_URL || 'http://backend:3000';

  return {
    plugins: [react()],
    server: {
      port: port,
      host: true,
      watch: {
        usePolling: true,
      },
      hmr: {
        clientPort: port,
      },
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
        },
      },
    },
  };
});
