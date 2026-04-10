import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localWorkerUrl = env.VITE_LOCAL_WORKER_URL || 'http://127.0.0.1:8787';

  return {
    plugins: [react(), tailwindcss()],
    base: mode === 'production' ? '/suncheon-machinery-reader/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target: localWorkerUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
