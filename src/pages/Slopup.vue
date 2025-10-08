<template lang="pug">
.bg-slate-950.min-h-screen
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading Episodes...

  //- Error State
  .container.mx-auto.px-4.py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content
  main.container.mx-auto.px-4.py-8(v-else)
    //- Header - Sports Broadcast Style
    section.mb-8.relative.overflow-hidden
      .bg-gradient-to-r.from-red-600.via-orange-600.to-red-700.px-6.py-8.relative
        //- Diagonal stripe pattern overlay
        .absolute.inset-0.opacity-10(style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)")
        .relative.z-10
          .flex.items-center.gap-4.mb-3
            .bg-white.text-red-600.px-4.py-2.font-black.text-sm.uppercase.tracking-wider.transform.-skew-x-12
              span.inline-block.transform.skew-x-12 Not Live Podcast
            span.text-6xl 🎙️
          h1.text-white.text-5xl.font-black.uppercase.tracking-tight.mb-2.drop-shadow-2xl THE SLOPUP
          p.text-white.text-xl.font-bold.tracking-wide The AI podcast about the AI fantasy football league

    //- Episodes Grid - Sports Broadcast Style
    .space-y-6
      div(
        v-for="episode in episodes"
        :key="episode.week"
        class="bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg overflow-hidden border-4 border-orange-500 shadow-2xl"
      )
        //- Episode Header - Score Ticker Style
        .bg-gradient-to-r.from-orange-600.to-red-600.px-6.py-4.relative.overflow-hidden
          //- Animated background pattern
          .absolute.inset-0.opacity-5(style="background: repeating-linear-gradient(90deg, transparent, transparent 20px, white 20px, white 40px)")
          .relative.z-10.flex.items-center.gap-4
            .bg-white.text-orange-600.w-16.h-16.rounded-full.flex.items-center.justify-center.text-3xl.font-black.border-4.border-white.shadow-lg {{ episode.emoji }}
            div
              .text-orange-200.text-xs.font-black.uppercase.tracking-widest.mb-1 Week {{ episode.week }} Recap
              h2.text-white.text-2xl.font-black.uppercase.tracking-tight {{ episode.title }}

        //- Audio Player
        .bg-white.px-6.py-4
          audio.w-full(
            controls
            :src="episode.audioUrl"
          )

        //- Episode Preview - Highlight Reel
        .bg-slate-900.px-6.py-6
          .border-l-4.border-orange-500.pl-4.mb-4
            p.text-gray-200.leading-relaxed.whitespace-pre-line.text-base {{ episode.preview }}
          .flex.justify-end
            router-link(
              :to="`/slopup/${episode.week}`"
              class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black uppercase tracking-wider rounded-lg transition-all transform hover:scale-105 shadow-lg"
            )
              span Full Analysis
              svg.w-5.h-5(fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3")
                path(stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7")
</template>

<script>
import { ref, onMounted } from 'vue'
import { marked } from 'marked'

export default {
  name: 'Slopup',
  setup() {
    const episodes = ref([])
    const loading = ref(true)
    const error = ref(null)
    const expandedEpisodes = ref({})

    const loadEpisodes = async () => {
      try {
        loading.value = true
        error.value = null

        // Custom episode titles and emojis
        const episodeTitles = {
          1: 'Week 1 - Josh Allen vs. The Algorithm',
          2: 'Week 2 - The 78-Point Disaster',
          3: 'Week 3 - 0.28 Points and Infinite Regret',
          4: 'Week 4 - The 2-Catch Catastrophe',
          5: 'Week 5 - The Calm Before the Injury Storm'
        }

        const episodeEmojis = {
          1: '⚔️',
          2: '💥',
          3: '😱',
          4: '💔',
          5: '🚑'
        }

        // Load all episodes (weeks 1-5)
        const episodeData = []
        for (let week = 1; week <= 5; week++) {
          try {
            const mdResponse = await fetch(`/slopups/week_${week}_slopup.md`)
            const mdContent = await mdResponse.text()

            // Parse the markdown
            const htmlContent = marked.parse(mdContent)

            // Use custom episode title and emoji
            const title = episodeTitles[week] || `Week ${week} Recap`
            const emoji = episodeEmojis[week] || '🎙️'

            // Extract preview content (much more content - ~10 lines)
            // Remove H1 and get everything after it
            const contentAfterH1 = mdContent.replace(/^#[^#].*\n+/m, '')
            // Remove all H2/H3 headers but keep the content
            const contentWithoutHeaders = contentAfterH1.replace(/^#{2,3}\s+.*$/gm, '')
            // Get paragraphs and take enough for ~10 lines (about 1200 chars)
            const paragraphs = contentWithoutHeaders.trim().split(/\n\n+/).filter(p => p.trim().length > 0 && !p.match(/^#{1,3}\s/))
            const preview = paragraphs.slice(0, 5).join('\n\n').substring(0, 1200).trim() + (paragraphs.join('\n\n').length > 1200 ? '...' : '')

            episodeData.push({
              week,
              title,
              emoji,
              content: htmlContent,
              preview,
              audioUrl: `/slopups/week_${week}_slopup.mp3`
            })
          } catch (err) {
            console.error(`Error loading week ${week}:`, err)
          }
        }

        // Sort by week descending (newest first)
        episodes.value = episodeData.sort((a, b) => b.week - a.week)

      } catch (err) {
        error.value = 'Failed to load episodes. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const toggleExpand = (week) => {
      expandedEpisodes.value[week] = !expandedEpisodes.value[week]
    }

    onMounted(() => {
      loadEpisodes()
    })

    return {
      episodes,
      loading,
      error,
      expandedEpisodes,
      toggleExpand
    }
  }
}
</script>

<style scoped>
/* Prose styles for markdown content */
:deep(.prose) {
  color: #e2e8f0;
}

:deep(.prose h2) {
  color: #f1f5f9;
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

:deep(.prose h3) {
  color: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose p) {
  margin-bottom: 1rem;
  line-height: 1.75;
}

:deep(.prose strong) {
  color: #fbbf24;
  font-weight: 700;
}

:deep(.prose ul) {
  list-style-type: disc;
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

:deep(.prose li) {
  margin-bottom: 0.5rem;
}

/* Audio player styling */
audio {
  border-radius: 0.5rem;
  background: #ffffff;
}

audio::-webkit-media-controls-panel {
  background-color: #ffffff;
}
</style>
