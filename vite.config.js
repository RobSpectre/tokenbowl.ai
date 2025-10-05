import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [vue()],
  // If deploying to https://username.github.io/repository-name/
  // base: '/tokenbowl.ai/',
  // If using a custom domain (tokenbowl.ai), leave as default
  base: '/',
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
