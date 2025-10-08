<template lang="pug">
.bg-slate-950.min-h-screen
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading Episode...

  //- Error State
  .container.mx-auto.px-4.py-12(v-else-if="error")
    .bg-red-600.border-l-4.border-red-800.rounded.p-6.text-center
      p.text-white.text-xl.font-bold {{ error }}

  //- Main Content - Sports Broadcast Style
  main.container.mx-auto.px-4.py-8(v-else-if="episode")
    //- Back Button
    router-link(
      to="/slopup"
      class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-wider rounded-lg transition-all mb-6 shadow-lg"
    )
      svg.w-5.h-5(fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3")
        path(stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7")
      span Back to All Episodes

    //- Episode Header - Game Recap Style
    section.mb-8.relative.overflow-hidden
      .bg-gradient-to-r.from-orange-600.to-red-600.rounded-lg.px-8.py-8.relative
        //- Background pattern
        .absolute.inset-0.opacity-5(style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, white 15px, white 30px)")
        .relative.z-10
          .flex.items-center.gap-4.mb-4
            .bg-white.text-orange-600.w-20.h-20.rounded-full.flex.items-center.justify-center.text-4xl.border-4.border-white.shadow-2xl {{ episode.emoji }}
            div
              .bg-black.bg-opacity-30.inline-block.px-3.py-1.rounded.mb-2.backdrop-blur-sm
                .text-orange-200.text-xs.font-black.uppercase.tracking-widest Week {{ episode.week }} Full Breakdown
              h1(class="text-white text-3xl sm:text-5xl font-black uppercase tracking-tight drop-shadow-2xl") {{ episode.title }}

    //- Audio Player
    section.mb-8
      .bg-white.rounded-lg.p-6
        audio.w-full(
          controls
          :src="episode.audioUrl"
        )

    //- Full Transcript - Analysis Style
    section.mb-8
      .bg-gradient-to-br.from-slate-900.to-black.rounded-lg.p-8.border-2.border-orange-500
        .border-l-4.border-orange-500.pl-6.mb-4
          .text-orange-400.text-sm.font-black.uppercase.tracking-widest.mb-2 Complete Transcript
        .prose.prose-invert.max-w-none(v-html="episode.content")
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { getEpisodeBySlug, getEpisodeByWeek } from '../slopupEpisodes.js'

export default {
  name: 'SlopupDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const episode = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const loadEpisode = async () => {
      try {
        loading.value = true
        error.value = null

        const slug = route.params.slug

        // Check if slug is a number (old URL format) and redirect to new slug
        if (/^\d+$/.test(slug)) {
          const week = parseInt(slug)
          const episodeMetadata = getEpisodeByWeek(week)
          if (episodeMetadata) {
            router.replace(`/slopup/${episodeMetadata.slug}`)
            return
          }
        }

        // Get episode metadata from slug
        const episodeMetadata = getEpisodeBySlug(slug)

        if (!episodeMetadata) {
          error.value = 'Episode not found.'
          loading.value = false
          return
        }

        const week = episodeMetadata.week

        const mdResponse = await fetch(`/slopups/week_${week}_slopup.md`)
        const mdContent = await mdResponse.text()

        // Parse the markdown
        const htmlContent = marked.parse(mdContent)

        episode.value = {
          ...episodeMetadata,
          content: htmlContent,
          audioUrl: `/slopups/week_${week}_slopup.mp3`
        }

      } catch (err) {
        error.value = 'Failed to load episode. Please try again later.'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadEpisode()
    })

    return {
      episode,
      loading,
      error
    }
  }
}
</script>

<style scoped>
/* Prose styles for markdown content - Sports Broadcast Theme */
:deep(.prose) {
  color: #f1f5f9;
  font-size: 1.0625rem;
}

:deep(.prose h2) {
  color: #fb923c;
  font-size: 2rem;
  font-weight: 900;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid #fb923c;
  padding-left: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.prose h3) {
  color: #fdba74;
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

:deep(.prose p) {
  margin-bottom: 1.25rem;
  line-height: 1.8;
  color: #e2e8f0;
}

:deep(.prose strong) {
  color: #fbbf24;
  font-weight: 800;
}

:deep(.prose ul) {
  list-style-type: none;
  margin-left: 0;
  margin-bottom: 1.5rem;
}

:deep(.prose li) {
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
  position: relative;
  color: #e2e8f0;
}

:deep(.prose li::before) {
  content: "▸";
  position: absolute;
  left: 0;
  color: #fb923c;
  font-weight: bold;
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
