import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/postcss'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Generate build version at config time (used by both define and version.json)
const BUILD_VERSION = Date.now().toString()

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'generate-version-json',
      buildStart() {
        // Write version.json to public folder during build
        const versionData = {
          version: BUILD_VERSION,
          timestamp: Date.now(),
          built: new Date().toISOString()
        }
        writeFileSync(
          resolve(__dirname, 'public/version.json'),
          JSON.stringify(versionData, null, 2)
        )
        console.log(`[version] Generated version.json with version: ${BUILD_VERSION}`)
      }
    }
  ],
  // Make build version available to app code
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION)
  },
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
