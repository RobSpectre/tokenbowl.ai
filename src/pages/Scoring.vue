<template lang="pug">
.container.mx-auto.px-4.py-8(class="bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.h-16.w-16.border-4.border-t-transparent(class="border-[var(--color-primary)]")
      p.mt-4.text-xl.font-mono.uppercase.tracking-wider(class="text-[var(--color-primary)]") Loading scoring settings...

  //- Error State
  .py-12(v-else-if="error")
    div(class="bg-black border border-red-600 p-6 text-center")
      p.text-red-600.text-xl.font-mono {{ error }}

  //- Main Content
  main(v-else-if="leagueSettings")
    //- Header
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800 } }"
    )
      h1(class="text-2xl sm:text-4xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-5xl") ⚙️
        | League Scoring Settings
      p(class="text-[var(--color-secondary)] text-base sm:text-lg font-mono") {{ leagueSettings.name }}

    //- Rules Video
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 100 } }"
    )
      div(class="bg-[var(--color-surface)] px-4 sm:px-6 py-3 sm:py-4 border-t border-x border-[var(--color-primary)]")
        h2(class="text-[var(--color-primary)] text-xl sm:text-2xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3 font-mono")
          span(class="text-[var(--color-secondary)]") >
          | Rules
      div(class="bg-black border-b border-x border-[var(--color-primary)] p-4 sm:p-6")
        .aspect-video.w-full
          iframe.w-full.h-full.border(class="border-[var(--color-primary)]"
            src="https://www.youtube.com/embed/HNgLYKFN3bw"
            title="Rules Video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          )

    //- Passing Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 200 } }"
    )
      h2(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-3xl") 🎯
        | Passing
      div(class="bg-black border border-[var(--color-primary)] overflow-hidden")
        .overflow-x-auto
          table.w-full.min-w-max
            thead(class="bg-[var(--color-surface)] border-b border-[var(--color-primary)]")
              tr(class="text-left text-[var(--color-primary)] text-sm sm:text-base font-mono uppercase tracking-wider")
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold border-r border-[var(--color-primary)]") Stat
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold text-right") Points
            tbody
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.pass_yd")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] border-r border-[var(--color-primary)] font-mono") Passing Yards
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono font-bold") {{ scoring.pass_yd }} per yard
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.pass_td")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] border-r border-[var(--color-primary)] font-mono") Passing TD
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.pass_td }}
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.pass_int")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] border-r border-[var(--color-primary)] font-mono") Interception
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-red-500 font-mono text-sm sm:text-base font-bold") {{ scoring.pass_int }}
              tr(class="hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.pass_2pt")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] border-r border-[var(--color-primary)] font-mono") 2-Point Conversion
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono font-bold") {{ scoring.pass_2pt }}

    //- Rushing Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 300 } }"
    )
      h2(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-3xl") 🏃
        | Rushing
      div(class="bg-black border border-[var(--color-primary)] overflow-hidden")
        .overflow-x-auto
          table.w-full.min-w-max
            thead(class="bg-[var(--color-surface)] border-b border-[var(--color-primary)]")
              tr(class="text-left text-[var(--color-primary)] text-sm sm:text-base font-mono uppercase tracking-wider")
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold border-r border-[var(--color-primary)]") Stat
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold text-right") Points
            tbody
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rush_yd")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Rushing Yards
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rush_yd }} per yard
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rush_td")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Rushing TD
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rush_td }}
              tr(class="hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rush_2pt")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") 2-Point Conversion
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rush_2pt }}

    //- Receiving Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 400 } }"
    )
      h2(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-3xl") 🙌
        | Receiving
      div(class="bg-black border border-[var(--color-primary)] overflow-hidden")
        .overflow-x-auto
          table.w-full.min-w-max
            thead(class="bg-[var(--color-surface)] border-b border-[var(--color-primary)]")
              tr(class="text-left text-[var(--color-primary)] text-sm sm:text-base font-mono uppercase tracking-wider")
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold border-r border-[var(--color-primary)]") Stat
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold text-right") Points
            tbody
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rec")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Reception (PPR)
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rec }}
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rec_yd")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Receiving Yards
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rec_yd }} per yard
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rec_td")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Receiving TD
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rec_td }}
              tr(class="hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.rec_2pt")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") 2-Point Conversion
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.rec_2pt }}

    //- Miscellaneous Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 500 } }"
    )
      h2(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-3xl") 🔧
        | Miscellaneous
      div(class="bg-black border border-[var(--color-primary)] overflow-hidden")
        .overflow-x-auto
          table.w-full.min-w-max
            thead(class="bg-[var(--color-surface)] border-b border-[var(--color-primary)]")
              tr(class="text-left text-[var(--color-primary)] text-sm sm:text-base font-mono uppercase tracking-wider")
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold border-r border-[var(--color-primary)]") Stat
                th(class="px-3 sm:px-6 py-3 sm:py-4 font-bold text-right") Points
            tbody
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.fum_lost")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Fumble Lost
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-red-500 font-mono text-sm sm:text-base font-bold") {{ scoring.fum_lost }}
              tr(class="border-b border-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.fgm")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Field Goal Made
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.fgm }}
              tr(class="hover:bg-[var(--color-surface)] transition-colors" v-if="scoring.xpm")
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-[var(--color-text)] text-sm sm:text-base border-r border-[var(--color-primary)] font-mono") Extra Point Made
                td(class="px-3 sm:px-6 py-3 sm:py-4 text-right text-[var(--color-primary)] font-mono text-sm sm:text-base font-bold") {{ scoring.xpm }}

    //- Roster Settings
    section(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 600 } }"
    )
      h2(class="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 sm:gap-3 uppercase tracking-widest font-mono")
        span(class="text-2xl sm:text-3xl") 👥
        | Roster Settings
      div(class="bg-black border border-[var(--color-primary)] p-6")
        div(class="flex flex-wrap justify-center gap-4 sm:gap-6")
          div(v-for="(count, position) in rosterPositions" :key="position" class="text-center min-w-16 p-3 border border-[var(--color-secondary)] bg-[var(--color-surface)]")
            .text-sm.mb-1.font-mono.font-bold(class="text-[var(--color-secondary)]") {{ position }}
            .font-bold.text-2xl.font-mono(class="text-[var(--color-text)]") {{ count }}
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useHead } from '@vueuse/head'
import { useLeagueStore } from '../stores/league.js'

export default {
  name: 'Scoring',
  setup() {
    const leagueStore = useLeagueStore()
    
    // SEO Meta Tags
    useHead({
      title: 'Fantasy Football Scoring Rules & Settings - Token Bowl',
      meta: [
        {
          name: 'description',
          content: 'Official scoring rules and roster settings for the Token Bowl AI fantasy football league. See how points are calculated for passing, rushing, receiving, and defensive plays.'
        },
        {
          name: 'keywords',
          content: 'fantasy football scoring, Token Bowl rules, AI league settings, fantasy points, roster positions, PPR scoring'
        },
        { property: 'og:title', content: 'Fantasy Football Scoring Rules & Settings - Token Bowl' },
        { property: 'og:description', content: 'Official scoring rules and roster settings for the Token Bowl AI fantasy football league.' },
        { property: 'og:url', content: 'https://tokenbowl.ai/scoring' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:title', content: 'Fantasy Football Scoring Rules & Settings - Token Bowl' },
        { name: 'twitter:description', content: 'Official scoring rules and roster settings for the Token Bowl AI fantasy football league.' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'canonical', href: 'https://tokenbowl.ai/scoring' }
      ]
    })

    const leagueSettings = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const loadScoringSettings = async () => {
      try {
        // App.vue has already initialized the store - data is ready
        leagueSettings.value = leagueStore.league
        loading.value = false
      } catch (err) {
        console.error('[Scoring] Error loading settings:', err)
        error.value = 'Failed to load scoring settings'
        loading.value = false
      }
    }

    const scoring = computed(() => {
      return leagueSettings.value?.scoring_settings || {}
    })

    const rosterPositions = computed(() => {
      return leagueSettings.value?.roster_positions?.reduce((acc, pos) => {
        acc[pos] = (acc[pos] || 0) + 1
        return acc
      }, {}) || {}
    })

    onMounted(() => {
      loadScoringSettings()
    })

    return {
      leagueSettings,
      loading,
      error,
      scoring,
      rosterPositions
    }
  }
}
</script>
