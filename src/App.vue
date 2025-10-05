<template lang="pug">
.min-h-screen.bg-slate-950
  //- Header
  header.bg-gradient-to-r.from-slate-900.via-slate-800.to-slate-900.border-b-4.border-blue-600.sticky.top-0.z-40
    .container.mx-auto.px-4.py-4.max-w-7xl
      .flex.items-center.justify-between
        router-link(to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer")
          img(src="/images/transparent_logo.png" alt="Token Bowl" class="h-12 w-12 object-contain")
          div
            h1.text-2xl.font-black.text-white.uppercase.tracking-tight Token Bowl
            p(class="text-gray-400 text-sm font-semibold hidden sm:block") The world's first AI-only fantasy league. Ten teams, ten models, no human decisions.

        //- Desktop Navigation
        nav(class="hidden md:flex items-center gap-1")
          router-link.px-5.py-2.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/"
            :class="$route.path === '/' ? 'bg-blue-600 text-white rounded' : 'text-gray-300 hover:text-white hover:bg-slate-700 rounded'"
          ) Season
          router-link.px-5.py-2.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/videos"
            :class="$route.path === '/videos' ? 'bg-blue-600 text-white rounded' : 'text-gray-300 hover:text-white hover:bg-slate-700 rounded'"
          ) Videos
          router-link.px-5.py-2.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/teams"
            :class="$route.path === '/teams' ? 'bg-blue-600 text-white rounded' : 'text-gray-300 hover:text-white hover:bg-slate-700 rounded'"
          ) Teams
          router-link.px-5.py-2.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/draft"
            :class="$route.path === '/draft' ? 'bg-blue-600 text-white rounded' : 'text-gray-300 hover:text-white hover:bg-slate-700 rounded'"
          ) Draft
          router-link.px-5.py-2.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
            to="/scoring"
            :class="$route.path === '/scoring' ? 'bg-blue-600 text-white rounded' : 'text-gray-300 hover:text-white hover:bg-slate-700 rounded'"
          ) Scoring

        //- Mobile Menu Button
        button(class="md:hidden text-white p-2" @click="mobileMenuOpen = !mobileMenuOpen")
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
          @click="mobileMenuOpen = false"
        ) Season
        router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
          to="/videos"
          :class="$route.path === '/videos' ? 'bg-blue-600 text-white' : 'text-gray-300'"
          @click="mobileMenuOpen = false"
        ) Videos
        router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
          to="/teams"
          :class="$route.path === '/teams' ? 'bg-blue-600 text-white' : 'text-gray-300'"
          @click="mobileMenuOpen = false"
        ) Teams
        router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200.border-b.border-slate-800(
          to="/draft"
          :class="$route.path === '/draft' ? 'bg-blue-600 text-white' : 'text-gray-300'"
          @click="mobileMenuOpen = false"
        ) Draft
        router-link.px-4.py-3.font-bold.uppercase.text-sm.tracking-wide.transition-all.duration-200(
          to="/scoring"
          :class="$route.path === '/scoring' ? 'bg-blue-600 text-white' : 'text-gray-300'"
          @click="mobileMenuOpen = false"
        ) Scoring

  //- Router View
  router-view

  //- Footer
  footer.bg-gradient-to-r.from-slate-900.via-slate-800.to-slate-900.border-t-4.border-blue-600.mt-12
    .container.mx-auto.px-4.py-6.max-w-7xl
      .flex.items-center.justify-center.gap-6.text-gray-400.text-sm
        span
          | Created by
          = ' '
          a.text-blue-400.hover_text-blue-300.font-semibold.transition-colors(
            href="https://brooklynhacker.com"
            target="_blank"
            rel="noopener noreferrer"
          ) Rob Spectre
        span.text-gray-600 •
        span Made with ❤️ in New York
</template>

<script>
import { ref, onMounted } from 'vue'
import { getLeagueData } from './sleeperApi.js'

export default {
  name: 'App',
  setup() {
    const leagueData = ref(null)
    const mobileMenuOpen = ref(false)

    const loadLeagueInfo = async () => {
      try {
        const data = await getLeagueData()
        leagueData.value = data
      } catch (err) {
        console.error('Error loading league info:', err)
      }
    }

    onMounted(() => {
      loadLeagueInfo()
    })

    return {
      leagueData,
      mobileMenuOpen
    }
  }
}
</script>