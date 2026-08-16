import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const processEnv = { ...process.env, ...env };
    
    const lang = processEnv.APP_LANGUAGE || 'fr';
    const tmdbApiKey = processEnv.TMDB_API_KEY || '';

    console.log("BUILD CONFIG -> LANGUAGE:", lang);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/tmdb': {
            target: 'https://api.themoviedb.org',
            changeOrigin: true,
            secure: true,
            rewrite: requestPath => {
              const [pathname, search = ''] = requestPath.split('?');
              const params = new URLSearchParams(search);
              if (tmdbApiKey) params.set('api_key', tmdbApiKey);
              const query = params.toString();
              return `${pathname.replace(/^\/tmdb/, '/3')}${query ? `?${query}` : ''}`;
            },
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'import.meta.env.JELLYFIN_URL': JSON.stringify(processEnv.JELLYFIN_URL),
        'import.meta.env.APP_LANGUAGE': JSON.stringify(lang),
      },
      resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    };
});
