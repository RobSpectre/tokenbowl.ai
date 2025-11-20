<template lang="pug">
.min-h-screen(class="bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.h-16.w-16.border-4.border-t-transparent(class="border-[var(--color-primary)]")
      p.mt-4.text-xl.font-bold.uppercase.tracking-wider.font-mono(class="text-[var(--color-primary)]") Loading Episode...

  //- Error State
  .container.mx-auto.px-4.py-12(v-else-if="error")
    div(class="bg-black border border-red-600 p-6 text-center")
      p.text-red-600.text-xl.font-bold.font-mono {{ error }}

  //- Main Content - Sports Broadcast Style
  main.container.mx-auto.px-4.py-8(v-else-if="episode")
    //- Back Button
    router-link(
      to="/slopup"
      class="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black text-[var(--color-primary)] font-bold uppercase tracking-wider transition-all mb-6 font-mono"
    )
      span <
      span Back to All Episodes

    //- Episode Header - Game Recap Style
    section.mb-8.relative.overflow-hidden
      div(class="bg-[var(--color-surface)] border-y border-[var(--color-primary)] px-8 py-8 relative")
        .relative.z-10
          .flex.items-center.gap-4.mb-4
            div(class="bg-black text-[var(--color-primary)] w-20 h-20 flex items-center justify-center text-4xl border border-[var(--color-primary)]") {{ episode.emoji }}
            div
              div(class="border border-[var(--color-secondary)] bg-black inline-block px-3 py-1 mb-2")
                div(class="text-[var(--color-secondary)] text-xs font-bold uppercase tracking-widest font-mono") Week {{ episode.week }} Full Breakdown
              h1(class="text-[var(--color-primary)] text-3xl sm:text-5xl font-bold uppercase tracking-tight font-mono") {{ episode.title }}

    //- Audio Player
    section.mb-8
      div(class="bg-black border border-[var(--color-primary)] p-6")
        audio.w-full(
          controls
          :src="episode.audioUrl"
        )

    //- Full Transcript - Analysis Style
    section.mb-8
      div(class="bg-black p-8 border border-[var(--color-primary)]")
        div(class="border-l-2 border-[var(--color-secondary)] pl-6 mb-4")
          div(class="text-[var(--color-secondary)] text-sm font-bold uppercase tracking-widest mb-2 font-mono") Complete Transcript
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
/* Prose styles for markdown content - Terminal Theme */
:deep(.prose) {
  color: var(--color-text);
  font-size: 1.0625rem;
  font-family: var(--font-mono);
}

:deep(.prose h2) {
  color: var(--color-primary);
  font-size: 2rem;
  font-weight: 900;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid var(--color-primary);
  padding-left: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.prose h3) {
  color: var(--color-secondary);
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
  color: var(--color-text);
}

:deep(.prose strong) {
  color: var(--color-accent);
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
  color: var(--color-text);
}

:deep(.prose li::before) {
  content: ">";
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-weight: bold;
}

/* Audio player styling */
audio {
  border-radius: 0;
  border: 1px solid var(--color-primary);
  background: var(--color-surface);
  color-scheme: dark;
}

audio::-webkit-media-controls-panel {
  background-color: var(--color-surface);
  border-radius: 0;
}

audio::-webkit-media-controls-play-button,
audio::-webkit-media-controls-mute-button {
  filter: invert(1);
}
</style>
