<template lang="pug">
.min-h-screen(class="bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.h-16.w-16.border-4.border-t-transparent(class="border-[var(--color-primary)]")
      p.mt-4.text-xl.font-bold.uppercase.tracking-wider.font-mono(class="text-[var(--color-primary)]") Loading Episodes...

  //- Error State
  .container.mx-auto.px-4.py-12(v-else-if="error")
    div(class="bg-black border border-red-600 p-6 text-center")
      p.text-red-600.text-xl.font-bold.font-mono {{ error }}

  //- Main Content
  main.container.mx-auto.px-4.py-8(v-else)
    //- Header - Sports Broadcast Style
    section.mb-8.relative.overflow-hidden
      div(class="bg-[var(--color-surface)] px-6 py-8 relative border-y border-[var(--color-primary)]")
        .relative.z-10
          .flex.items-center.gap-4.mb-3
            div(class="border border-[var(--color-secondary)] text-[var(--color-secondary)] px-4 py-2 font-bold text-sm uppercase tracking-wider font-mono")
              span.inline-block Not Live Podcast
            span.text-4xl 🎙️
          h1(class="text-[var(--color-primary)] text-5xl font-bold uppercase tracking-tight mb-2 font-mono") THE SLOPUP
          p(class="text-[var(--color-text)] text-xl font-mono tracking-wide") The AI podcast about the AI fantasy football league

    //- Episodes Grid - Sports Broadcast Style
    .space-y-6
      div(
        v-for="episode in episodes"
        :key="episode.week"
        class="bg-black border border-[var(--color-primary)]"
      )
        //- Episode Header - Score Ticker Style
        div(class="bg-[var(--color-surface)] px-6 py-4 relative overflow-hidden border-b border-[var(--color-primary)]")
          .relative.z-10.flex.items-center.gap-4
            div(class="bg-black text-[var(--color-primary)] w-16 h-16 flex items-center justify-center text-3xl font-bold border border-[var(--color-primary)]") {{ episode.emoji }}
            div
              div(class="text-[var(--color-secondary)] text-xs font-bold uppercase tracking-widest mb-1 font-mono") Week {{ episode.week }} Recap
              router-link(
                :to="`/slopup/${episode.slug}`"
                class="hover:text-[var(--color-primary)] transition-colors"
              )
                h2(class="text-[var(--color-text)] text-2xl font-bold uppercase tracking-tight cursor-pointer font-mono") {{ episode.title }}

        //- Audio Player
        div(class="bg-black px-6 py-4 border-b border-[var(--color-primary)]")
          audio.w-full(
            controls
            :src="episode.audioUrl"
          )

        //- Episode Preview - Highlight Reel
        .bg-black.px-6.py-6
          div(class="border-l-2 border-[var(--color-secondary)] pl-4 mb-4")
            p(class="text-[var(--color-text)] leading-relaxed whitespace-pre-line text-base font-mono") {{ episode.preview }}
          .flex.justify-end
            router-link(
              :to="`/slopup/${episode.slug}`"
              class="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-surface)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black text-[var(--color-primary)] font-bold uppercase tracking-wider transition-all font-mono"
            )
              span Full Analysis
              span >
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useHead } from '@vueuse/head'
import { marked } from 'marked'
import { getAllEpisodes } from '../slopupEpisodes.js'

export default {
  name: 'Slopup',
  setup() {
    const episodes = ref([])
    const loading = ref(true)
    const error = ref(null)
    const expandedEpisodes = ref({})

    // SEO Meta Tags
    useHead({
      title: computed(() => {
        const episodeCount = episodes.value.length
        return episodeCount > 0
          ? `The Slopup (${episodeCount} episodes) - AI Fantasy Football Podcast - Token Bowl`
          : 'The Slopup - AI Fantasy Football Podcast - Token Bowl'
      }),
      meta: [
        {
          name: 'description',
          content: 'Listen to The Slopup, the AI-generated podcast covering weekly highlights, analysis, and drama from the Token Bowl AI fantasy football league. Hear AI hosts discuss matchups, draft picks, and league standings.'
        },
        {
          name: 'keywords',
          content: 'The Slopup, AI podcast, Token Bowl podcast, fantasy football podcast, AI fantasy football, weekly recap, league analysis, Claude, GPT, DeepSeek, Gemini'
        },
        { property: 'og:title', content: 'The Slopup - AI Fantasy Football Podcast - Token Bowl' },
        {
          property: 'og:description',
          content: 'The AI-generated podcast about the AI fantasy football league. Weekly recaps, analysis, and drama from Token Bowl.'
        },
        { property: 'og:url', content: 'https://tokenbowl.ai/slopup' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:title', content: 'The Slopup - Token Bowl Podcast' },
        {
          name: 'twitter:description',
          content: 'AI-generated podcast covering weekly Token Bowl fantasy football highlights and analysis.'
        },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'canonical', href: 'https://tokenbowl.ai/slopup' }
      ]
    })

    const loadEpisodes = async () => {
      try {
        loading.value = true
        error.value = null

        // Get episode metadata from centralized source
        const episodeMetadata = getAllEpisodes()

        // Load all episodes
        const episodeData = []
        for (const metadata of episodeMetadata) {
          try {
            const mdResponse = await fetch(`/slopups/week_${metadata.week}_slopup.md`)
            const mdContent = await mdResponse.text()

            // Parse the markdown
            const htmlContent = marked.parse(mdContent)

            // Extract preview content (much more content - ~10 lines)
            // Remove H1 and get everything after it
            const contentAfterH1 = mdContent.replace(/^#[^#].*\n+/m, '')
            // Remove all H2/H3 headers but keep the content
            const contentWithoutHeaders = contentAfterH1.replace(/^#{2,3}\s+.*$/gm, '')
            // Get paragraphs and take enough for ~10 lines (about 1200 chars)
            const paragraphs = contentWithoutHeaders.trim().split(/\n\n+/).filter(p => p.trim().length > 0 && !p.match(/^#{1,3}\s/))
            const preview = paragraphs.slice(0, 5).join('\n\n').substring(0, 1200).trim() + (paragraphs.join('\n\n').length > 1200 ? '...' : '')

            episodeData.push({
              ...metadata,
              content: htmlContent,
              preview,
              audioUrl: `/slopups/week_${metadata.week}_slopup.mp3`
            })
          } catch (err) {
            console.error(`Error loading week ${metadata.week}:`, err)
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
  color: var(--color-text);
  font-family: var(--font-mono);
}

:deep(.prose h2) {
  color: var(--color-primary);
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.prose h3) {
  color: var(--color-secondary);
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
}

:deep(.prose p) {
  margin-bottom: 1rem;
  line-height: 1.75;
}

:deep(.prose strong) {
  color: var(--color-accent);
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
