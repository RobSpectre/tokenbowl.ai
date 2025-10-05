<template lang="pug">
.container.mx-auto.px-4.py-8.bg-slate-950
  //- Loading State
  .flex.items-center.justify-center(v-if="loading" style="min-height: 50vh")
    .text-center
      .inline-block.animate-spin.rounded-full.h-16.w-16.border-4.border-blue-500.border-t-transparent
      p.text-white.mt-4.text-xl.font-bold.uppercase.tracking-wider Loading videos...

  //- Main Content
  main(v-else)
    //- Long Form Videos
    section(v-if="longFormVideos.length > 0" class="mb-8 sm:mb-12")
      div(class="bg-gradient-to-r from-red-600 to-red-800 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-yellow-400")
        h2(class="text-white text-2xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 🎬
          | Long Form

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-4")
        div(class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3")
          a(
            v-for="video in longFormVideos"
            :key="video.id"
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block group"
          )
            .relative.overflow-hidden.rounded
              img(
                class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-200"
                :src="video.thumbnail"
                :alt="video.title"
              )
              div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                svg.w-8.h-8.text-white(fill="currentColor" viewBox="0 0 24 24")
                  path(d="M8 5v14l11-7z")
            h3(class="text-white font-medium mt-1 text-xs group-hover:text-blue-400 transition-colors line-clamp-2") {{ video.title }}
            p(class="text-gray-400 text-xs mt-0.5 line-clamp-1") {{ video.description }}

    //- Shorts
    section(v-if="shortsVideos.length > 0" class="mb-8 sm:mb-12")
      div(class="bg-gradient-to-r from-purple-600 to-purple-800 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-yellow-400")
        h2(class="text-white text-2xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-2 sm:gap-3")
          span.text-yellow-400 ⚡
          | Shorts

      div(class="bg-slate-900 rounded-b-lg p-3 sm:p-4")
        div(class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3")
          a(
            v-for="video in shortsVideos"
            :key="video.id"
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block group"
          )
            .relative.overflow-hidden.rounded
              img(
                class="w-full aspect-[9/16] object-cover group-hover:scale-105 transition-transform duration-200"
                :src="video.thumbnail"
                :alt="video.title"
              )
              div(class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center")
                svg.w-8.h-8.text-white(fill="currentColor" viewBox="0 0 24 24")
                  path(d="M8 5v14l11-7z")
              div(class="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-[10px] font-bold") SHORTS
            h3(class="text-white font-medium mt-1 text-xs group-hover:text-blue-400 transition-colors line-clamp-1") {{ video.title }}
</template>

<script>
import { ref, onMounted } from 'vue'
import { getPlaylistVideos } from '../youtubeApi.js'

export default {
  name: 'Videos',
  setup() {
    const loading = ref(true)
    const longFormVideos = ref([])
    const shortsVideos = ref([])
    const LONG_FORM_PLAYLIST_ID = 'PLPseZqsYjyD5ZNg9Bjo_bn8JdJmcl-KGS'
    const SHORTS_PLAYLIST_ID = 'PLPseZqsYjyD7ToDTDdC8gr8NEJKy7ejl-'

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
