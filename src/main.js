import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import router from './router.js'
import './style.css'

// Cache version management - increment when making breaking changes
const CACHE_VERSION = 5 // v5: Local JSON for top 500 players + promise tracking + zero duplicate API calls
const CACHE_KEY = 'tokenbowl-league'

// Check and clear old cache before Pinia initializes
try {
  const stored = localStorage.getItem(CACHE_KEY)
  if (stored) {
    const data = JSON.parse(stored)
    if (data.cacheVersion !== CACHE_VERSION) {
      console.log(`Cache version mismatch (stored: ${data.cacheVersion}, current: ${CACHE_VERSION}). Clearing cache...`)
      localStorage.removeItem(CACHE_KEY)
    }
  }
} catch (error) {
  console.error('Error checking cache version:', error)
  localStorage.removeItem(CACHE_KEY)
}

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(MotionPlugin)
app.use(router)
app.mount('#app')
