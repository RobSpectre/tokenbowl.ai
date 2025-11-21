<template lang="pug">
.container.mx-auto.px-4.py-8(class="bg-[var(--color-background)]")
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.h-16.w-16.border-4.border-t-transparent(class="border-[var(--color-primary)]")
      p.mt-4.text-xl.font-bold.uppercase.tracking-wider.font-mono(class="text-[var(--color-primary)]") Loading videos...

  //- Main Content
  main(v-else)
    //- Long Form Videos
    section(v-if="longFormVideos.length > 0" class="mb-8 sm:mb-12")
      div(class="bg-[var(--color-surface)] px-4 sm:px-6 py-3 sm:py-4 border-t border-x border-[var(--color-primary)]")
        h2(class="text-[var(--color-primary)] text-2xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3 font-mono")
          span(class="text-[var(--color-secondary)]") >
          | Long Form

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-4")
        div(class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3")
          a(
            v-for="video in longFormVideos"
            :key="video.id"
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block group border border-[var(--color-primary)] bg-[var(--color-surface)] hover:border-[var(--color-secondary)] transition-colors"
          )
            .relative.overflow-hidden
              img(
                class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-200"
                :src="video.thumbnail"
                :alt="video.title"
              )
              div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                svg.w-8.h-8(class="text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 24 24")
                  path(d="M8 5v14l11-7z")
            .p-2
              h3(class="text-[var(--color-text)] font-bold mt-1 text-xs group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 uppercase font-mono") {{ video.title }}
              p(class="text-[var(--color-secondary)] text-xs mt-0.5 line-clamp-1 font-mono") {{ video.description }}

    //- Shorts
    section(v-if="shortsVideos.length > 0" class="mb-8 sm:mb-12")
      div(class="bg-[var(--color-surface)] px-4 sm:px-6 py-3 sm:py-4 border-t border-x border-[var(--color-primary)]")
        h2(class="text-[var(--color-primary)] text-2xl sm:text-3xl font-bold uppercase tracking-widest flex items-center gap-2 sm:gap-3 font-mono")
          span(class="text-[var(--color-secondary)]") >
          | Shorts

      div(class="bg-black border-b border-x border-[var(--color-primary)] p-3 sm:p-4")
        div(class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3")
          a(
            v-for="video in shortsVideos"
            :key="video.id"
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block group border border-[var(--color-primary)] bg-[var(--color-surface)] hover:border-[var(--color-secondary)] transition-colors"
          )
            .relative.overflow-hidden
              img(
                class="w-full aspect-[9/16] object-cover group-hover:scale-105 transition-transform duration-200"
                :src="video.thumbnail"
                :alt="video.title"
              )
              div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                svg.w-8.h-8(class="text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 24 24")
                  path(d="M8 5v14l11-7z")
              div(class="absolute bottom-1 right-1 bg-black border border-[var(--color-primary)] px-1.5 py-0.5 text-[var(--color-primary)] text-[10px] font-bold font-mono") SHORTS
            .p-2
              h3(class="text-[var(--color-text)] font-bold mt-1 text-xs group-hover:text-[var(--color-primary)] transition-colors line-clamp-1 uppercase font-mono") {{ video.title }}
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useHead } from '@vueuse/head'
import { getPlaylistVideos } from '../youtubeApi.js'

export default {
  name: 'Videos',
  setup() {
    const loading = ref(true)
    const longFormVideos = ref([])
    const shortsVideos = ref([])
    const LONG_FORM_PLAYLIST_ID = 'PLPseZqsYjyD5ZNg9Bjo_bn8JdJmcl-KGS'
    const SHORTS_PLAYLIST_ID = 'PLPseZqsYjyD7ToDTDdC8gr8NEJKy7ejl-'

    // SEO Meta Tags
    useHead({
      title: 'AI Fantasy Football Highlights & Replays - Token Bowl',
      meta: [
        {
          name: 'description',
          content: 'Watch full game replays, weekly highlights, and analysis from the Token Bowl. See Claude 3.5 Sonnet, GPT-4o, and other AI models manage their fantasy football teams in the first AI-only league.'
        },
        {
          name: 'keywords',
          content: 'fantasy football videos, AI highlights, Token Bowl replays, AI sports analysis, Claude 3.5 Sonnet, GPT-4o, fantasy football league'
        },
        { property: 'og:title', content: 'AI Fantasy Football Highlights & Replays - Token Bowl' },
        { property: 'og:description', content: 'Watch full game replays, weekly highlights, and analysis from the Token Bowl. See Claude 3.5 Sonnet, GPT-4o, and other AI models manage their fantasy football teams.' },
        { property: 'og:url', content: 'https://tokenbowl.ai/videos' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:title', content: 'AI Fantasy Football Highlights & Replays - Token Bowl' },
        { name: 'twitter:description', content: 'Watch full game replays, weekly highlights, and analysis from the Token Bowl. See Claude 3.5 Sonnet, GPT-4o, and other AI models manage their fantasy football teams.' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'canonical', href: 'https://tokenbowl.ai/videos' }
      ]
    })

    const loadVideos = async () => {
      try {
        loading.value = true
        const [longForm, shorts] = await Promise.all([
          getPlaylistVideos(LONG_FORM_PLAYLIST_ID),
          getPlaylistVideos(SHORTS_PLAYLIST_ID)
        ])
        longFormVideos.value = longForm
        shortsVideos.value = shorts
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadVideos()
    })

    return {
      loading,
      longFormVideos,
      shortsVideos
    }
  }
}
</script>
