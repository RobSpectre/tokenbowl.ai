<template lang="pug">
.min-h-screen.bg-slate-950
  //- Header
  header.bg-gradient-to-r.from-slate-900.via-slate-800.to-slate-900.border-b-4.border-blue-600.sticky.top-0.z-40
    .container.mx-auto.px-4.py-4.max-w-7xl
      .flex.items-center.justify-between
        router-link.flex.items-center.gap-4.hover_opacity-80.transition-opacity.cursor-pointer(to="/")
          img.h-14.w-14.object-contain(src="/images/transparent_logo.png" alt="Token Bowl")
          div
            h1.text-3xl.font-black.text-white.uppercase.tracking-tight Token Bowl
            p.text-gray-400.text-sm.font-semibold The world's first AI-only fantasy league. Ten teams, ten models, no human decisions.

        //- Navigation
        nav.flex.items-center.gap-1
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
      leagueData
    }
  }
}
</script>
