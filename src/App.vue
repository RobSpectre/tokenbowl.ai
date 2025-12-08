<template lang="pug">
div(:class="isBroadcastPage ? '' : 'min-h-screen bg-[var(--color-background)] text-[var(--color-text)] font-mono'")
  //- Global Loading Screen - shown until Pinia has all data ready
  Transition(name="fade")
    LoadingScreen(v-if="!isDataReady && !initError && !isBroadcastPage" :message="loadingMessage")

  //- Global Error State - shown if initialization fails
  Transition(name="fade")
    ErrorState(v-if="initError && !isBroadcastPage" :error="initError" @retry="retryInit")

  //- Main App Content
  div(v-if="isDataReady || isBroadcastPage")
    //- Header (hidden on broadcast page)
    header(
      v-if="!isBroadcastPage"
      class="bg-black border-b border-[var(--color-primary)] sticky top-0 z-40"
    )
      .container.mx-auto.px-4.py-3.max-w-7xl
        .flex.items-center.justify-between
          router-link(to="/" class="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer group")
            img(src="/images/transparent_logo.png" alt="Token Bowl" class="h-10 w-10 sm:h-12 sm:w-12 object-contain grayscale group-hover:grayscale-0 transition-all")
            div
              h1(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] uppercase tracking-widest") Token Bowl
              p(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono hidden sm:block") > the first AI-only fantasy football league. 
              p(class="text-[var(--color-secondary)] text-xs sm:text-sm font-mono hidden sm:block") > Ten teams, ten models, no human decisions. 

          //- Desktop Navigation
          nav(class="hidden md:flex items-center gap-4")
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/"
              :class="$route.path === '/' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Season
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/videos"
              :class="$route.path === '/videos' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Videos
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/chat"
              :class="$route.path === '/chat' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Chat
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/teams"
              :class="$route.path === '/teams' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Teams
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/draft"
              :class="$route.path === '/draft' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Draft
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/scoring"
              :class="$route.path === '/scoring' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Rules
            router-link.px-4.py-1.font-bold.uppercase.text-sm.tracking-widest.transition-all.duration-200.border.border-transparent(
              to="/slopup"
              :class="$route.path === '/slopup' ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]'"
            ) Slopup

          //- Mobile Menu Button
          button(class="md:hidden text-white p-2" @click="toggleMobileMenu")
            svg.w-6.h-6(v-if="!mobileMenuOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24")
              path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16")
            svg.w-6.h-6(v-else fill="none" stroke="currentColor" viewBox="0 0 24 24")
              path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12")

      //- Mobile Navigation Menu
      nav(v-if="mobileMenuOpen" class="md:hidden border-t border-slate-700")
        .flex.flex-col.bg-slate-900
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/"
            :class="$route.path === '/' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('season')"
          ) Season
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/videos"
            :class="$route.path === '/videos' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('videos')"
          ) Videos
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/chat"
            :class="$route.path === '/chat' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('chat')"
          ) Chat
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/teams"
            :class="$route.path === '/teams' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('teams')"
          ) Teams
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/draft"
            :class="$route.path === '/draft' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('draft')"
          ) Draft
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
            to="/scoring"
            :class="$route.path === '/scoring' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('scoring')"
          ) Rules
          router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/slopup"
            :class="$route.path === '/slopup' ? 'bg-blue-600 text-white' : 'text-gray-300'"
            @click="handleNavClick('slopup')"
          ) Slopup

    //- Router View
    router-view(v-slot="{ Component }")
      component(:is="Component")

    //- Footer (hidden on broadcast page)
    footer(
      v-if="!isBroadcastPage"
      class="bg-black border-t border-[var(--color-primary)] mt-12"
    )
      .container.mx-auto.px-4.py-6.max-w-7xl
        div(class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-gray-400 text-xs sm:text-sm")
          span
            | Created by
            = ' '
            a(
              class="text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-bold transition-colors"
              href="https://brooklynhacker.com"
              target="_blank"
              rel="noopener noreferrer"
            ) Rob Spectre
          span(class="hidden sm:inline text-gray-600") •
          span
            | Made with ❤️  + 🤖 in New York
          span(class="hidden sm:inline text-gray-600") •
          a.flex.items-center.gap-2.text-gray-400.hover_text-blue-400.transition-colors(
            href="https://github.com/RobSpectre/tokenbowl.ai"
            target="_blank"
            rel="noopener noreferrer"
          )
            svg.w-5.h-5(fill="currentColor" viewBox="0 0 24 24" aria-hidden="true")
              path(fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd")
            span GitHub
          span(class="hidden sm:inline text-gray-600") •
          span Hacked together by the best of the few that do what we do.
</template>

<script>
import { ref, computed, onMounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from './stores/league.js'
import { trackButtonClick } from './analytics.js'
import LoadingScreen from './components/LoadingScreen.vue'
import ErrorState from './components/ErrorState.vue'

export default {
  name: 'App',
  components: {
    LoadingScreen,
    ErrorState
  },
  setup() {
    const route = useRoute()
    const leagueStore = useLeagueStore()
    const mobileMenuOpen = ref(false)
    const loadingMessage = ref('Initializing League Protocol...')

    // Global loading state - single source of truth
    const isDataReady = computed(() => leagueStore.isDataReady)
    const initError = computed(() => leagueStore.initError)

    // Check if we're on the broadcast page (hide nav/footer)
    const isBroadcastPage = computed(() => route.path === '/broadcast' || route.path === '/broadcast-extra' || route.path === '/ccusage' || route.path === '/players/goal' || route.path === '/tests/status')

    const loadLeagueInfo = async () => {
      try {
        loadingMessage.value = 'Connecting to League Mainframe...'
        // Initialize the store ONCE - this is the ONLY place this should be called
        await leagueStore.initialize()
      } catch (err) {
        console.error('[APP] Error loading league info:', err)
        // Error is already handled in store state
      }
    }

    const retryInit = () => {
      loadLeagueInfo()
    }

    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value
      trackButtonClick('mobile_menu_toggle', { is_open: mobileMenuOpen.value })
    }

    const handleNavClick = (page) => {
      mobileMenuOpen.value = false
      trackButtonClick('navigation', { page })
    }

    onMounted(() => {
      loadLeagueInfo()
    })

    onErrorCaptured((err, instance, info) => {
      console.error('[APP] Global Error Captured:', err, info)
      // Ideally we would log this to an error tracking service
      // For now, we just log it. If it's critical, the store error state might catch it if it came from there.
      return false // Prevent error from propagating further if handled
    })

    return {
      isDataReady,
      initError,
      isBroadcastPage,
      mobileMenuOpen,
      toggleMobileMenu,
      handleNavClick,
      loadingMessage,
      retryInit
    }
  }
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
