import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const processEnv = { ...process.env, ...env };
    
    const lang = processEnv.APP_LANGUAGE || 'fr';

    console.log("BUILD CONFIG -> LANGUAGE:", lang);

    return {
      server: { port: 3000, host: '0.0.0.0' },
      plugins: [react()],
      define: {
        'import.meta.env.JELLYFIN_URL': JSON.stringify(processEnv.JELLYFIN_URL),
        'import.meta.env.APP_LANGUAGE': JSON.stringify(lang),
      },
      resolve: { alias: { '@': path.resolve(__dirname, '.') } }
    };
});
