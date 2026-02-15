import { defineConfig, loadEnv } from 'vite'
import type { ProxyOptions } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: {
      proxy: (() => {
        const proxies: Record<string, string | ProxyOptions> = {};
        if (supabaseUrl) {
          proxies['/api/supabase-functions'] = {
            target: supabaseUrl,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api\/supabase-functions/, '/functions/v1'),
            secure: true,
            configure: (proxyServer, req) => {
              proxyServer.on('proxyReq', (proxyReq: { setHeader: (n: string, v: string) => void }) => {
                const r = req as { headers?: { authorization?: string; apikey?: string } };
                const auth = r.headers?.authorization;
                if (auth) proxyReq.setHeader('Authorization', auth);
                const apikey = r.headers?.apikey;
                if (apikey) proxyReq.setHeader('apikey', apikey);
              });
            },
          };
        }
        const serpKey = env.VITE_SERPAPI_KEY;
        if (serpKey) {
          proxies['/api/shopping-search'] = {
            target: 'https://serpapi.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/shopping-search/, '/search.json'),
            configure: (proxyServer) => {
              proxyServer.on('proxyReq', (proxyReq: { path: string }) => {
                proxyReq.path += (proxyReq.path.includes('?') ? '&' : '?') + 'engine=google_shopping&api_key=' + encodeURIComponent(serpKey);
              });
            },
          };
        }
        return Object.keys(proxies).length ? proxies : undefined;
      })(),
    },
  }
})
