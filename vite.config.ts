import { defineConfig, loadEnv } from 'vite'
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
      proxy: supabaseUrl
        ? {
          '/api/supabase-functions': {
            target: supabaseUrl,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/supabase-functions/, '/functions/v1'),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq, req) => {
                const auth = req.headers.authorization;
                if (auth) proxyReq.setHeader('Authorization', auth);
                const apikey = req.headers.apikey;
                if (apikey) proxyReq.setHeader('apikey', apikey);
              });
            },
          },
        }
        : undefined,
    },
  }
})
