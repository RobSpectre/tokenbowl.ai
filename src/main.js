import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { MotionPlugin } from '@vueuse/motion'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from './router.js'
import './style.css'

// Initialize Pinia with persistence
// Cache version is now managed in the store itself (see src/stores/league.js)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const head = createHead()

const app = createApp(App)
app.use(pinia)
app.use(head)
app.use(MotionPlugin)
app.use(router)
app.mount('#app')
