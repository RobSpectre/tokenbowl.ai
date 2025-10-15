import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        // Inject current timestamp into meta tag to force cache refresh
        const timestamp = new Date().toISOString()
        return html.replace(
          /<meta name="app-version" content="[^"]*">/,
          `<meta name="app-version" content="${timestamp}">`
        )
      }
    }
  ],
  // If deploying to https://username.github.io/repository-name/
  // base: '/tokenbowl.ai/',
  // If using a custom domain (tokenbowl.ai), leave as default
  base: '/',
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    proxy: {
      '/api/fantasynerds': {
        target: 'https://api.fantasynerds.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fantasynerds/, ''),
        secure: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Use timestamp in filename to ensure cache busting on every deploy
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  }
})
