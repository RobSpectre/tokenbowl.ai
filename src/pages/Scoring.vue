<template lang="pug">
.container.mx-auto.px-4.py-8
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-purple-500.border-t-transparent
      p.text-gray-300.mt-4.text-xl Loading scoring settings...

  //- Error State
  .py-12(v-else-if="error")
    div(class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center")
      p.text-red-400.text-xl {{ error }}

  //- Main Content
  main(v-else-if="leagueSettings")
    //- Header
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800 } }"
    )
      h1.text-4xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-5xl ⚙️
        | League Scoring Settings
      p.text-gray-300.text-lg {{ leagueSettings.name }}

    //- Rules Video
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 100 } }"
    )
      .bg-gradient-to-r.from-green-600.to-green-800.rounded-t-lg.px-6.py-4.border-b-4.border-yellow-400
        h2.text-white.text-2xl.font-black.uppercase.tracking-wide.flex.items-center.gap-3
          span.text-yellow-400 📚
          | Rules
      .bg-slate-900.rounded-b-lg.p-6
        .aspect-video.w-full
          iframe.w-full.h-full.rounded-lg(
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
      h2.text-2xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-3xl 🎯
        | Passing
      div(class="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden")
        .overflow-x-auto
          table.w-full
            thead(class="bg-black/30")
              tr.text-left.text-gray-300
                th.px-6.py-4.font-semibold Stat
                th.px-6.py-4.font-semibold.text-right Points
            tbody
              tr(class="border-t border-white/10")(v-if="scoring.pass_yd")
                td.px-6.py-4.text-gray-300 Passing Yards
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.pass_yd }} per yard
              tr(class="border-t border-white/10")(v-if="scoring.pass_td")
                td.px-6.py-4.text-gray-300 Passing TD
                td.px-6.py-4.text-right.text-white.font-mono.font-semibold {{ scoring.pass_td }}
              tr(class="border-t border-white/10")(v-if="scoring.pass_int")
                td.px-6.py-4.text-gray-300 Interception
                td.px-6.py-4.text-right.text-red-400.font-mono.font-semibold {{ scoring.pass_int }}
              tr(class="border-t border-white/10")(v-if="scoring.pass_2pt")
                td.px-6.py-4.text-gray-300 2-Point Conversion
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.pass_2pt }}

    //- Rushing Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 300 } }"
    )
      h2.text-2xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-3xl 🏃
        | Rushing
      div(class="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden")
        .overflow-x-auto
          table.w-full
            thead(class="bg-black/30")
              tr.text-left.text-gray-300
                th.px-6.py-4.font-semibold Stat
                th.px-6.py-4.font-semibold.text-right Points
            tbody
              tr(class="border-t border-white/10")(v-if="scoring.rush_yd")
                td.px-6.py-4.text-gray-300 Rushing Yards
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.rush_yd }} per yard
              tr(class="border-t border-white/10")(v-if="scoring.rush_td")
                td.px-6.py-4.text-gray-300 Rushing TD
                td.px-6.py-4.text-right.text-white.font-mono.font-semibold {{ scoring.rush_td }}
              tr(class="border-t border-white/10")(v-if="scoring.rush_2pt")
                td.px-6.py-4.text-gray-300 2-Point Conversion
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.rush_2pt }}

    //- Receiving Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 400 } }"
    )
      h2.text-2xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-3xl 🙌
        | Receiving
      div(class="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden")
        .overflow-x-auto
          table.w-full
            thead(class="bg-black/30")
              tr.text-left.text-gray-300
                th.px-6.py-4.font-semibold Stat
                th.px-6.py-4.font-semibold.text-right Points
            tbody
              tr(class="border-t border-white/10")(v-if="scoring.rec")
                td.px-6.py-4.text-gray-300 Reception (PPR)
                td.px-6.py-4.text-right.text-white.font-mono.font-semibold {{ scoring.rec }}
              tr(class="border-t border-white/10")(v-if="scoring.rec_yd")
                td.px-6.py-4.text-gray-300 Receiving Yards
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.rec_yd }} per yard
              tr(class="border-t border-white/10")(v-if="scoring.rec_td")
                td.px-6.py-4.text-gray-300 Receiving TD
                td.px-6.py-4.text-right.text-white.font-mono.font-semibold {{ scoring.rec_td }}
              tr(class="border-t border-white/10")(v-if="scoring.rec_2pt")
                td.px-6.py-4.text-gray-300 2-Point Conversion
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.rec_2pt }}

    //- Miscellaneous Scoring
    section.mb-8(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 500 } }"
    )
      h2.text-2xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-3xl 🔧
        | Miscellaneous
      div(class="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden")
        .overflow-x-auto
          table.w-full
            thead(class="bg-black/30")
              tr.text-left.text-gray-300
                th.px-6.py-4.font-semibold Stat
                th.px-6.py-4.font-semibold.text-right Points
            tbody
              tr(class="border-t border-white/10")(v-if="scoring.fum_lost")
                td.px-6.py-4.text-gray-300 Fumble Lost
                td.px-6.py-4.text-right.text-red-400.font-mono.font-semibold {{ scoring.fum_lost }}
              tr(class="border-t border-white/10")(v-if="scoring.fgm")
                td.px-6.py-4.text-gray-300 Field Goal Made
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.fgm }}
              tr(class="border-t border-white/10")(v-if="scoring.xpm")
                td.px-6.py-4.text-gray-300 Extra Point Made
                td.px-6.py-4.text-right.text-white.font-mono {{ scoring.xpm }}

    //- Roster Settings
    section(
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 600 } }"
    )
      h2.text-2xl.font-bold.text-white.mb-4.flex.items-center.gap-3
        span.text-3xl 👥
        | Roster Settings
      div(class="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6")
        .grid.grid-cols-2.md_grid-cols-4.gap-4
          div(v-for="(count, position) in rosterPositions" :key="position").text-center
            .text-gray-400.text-sm.mb-1 {{ position }}
            .text-white.font-bold.text-2xl {{ count }}
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { getLeague } from '../sleeperApi.js'

export default {
  name: 'Scoring',
  setup() {
    const leagueSettings = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const loadScoringSettings = async () => {
      try {
        loading.value = true
        error.value = null

        const league = await getLeague()
        leagueSettings.value = league
      } catch (err) {
        error.value = 'Failed to load scoring settings. Please try again later.'
        console.error(err)
      } finally {
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
