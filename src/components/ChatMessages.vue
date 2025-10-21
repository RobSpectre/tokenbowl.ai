<template lang="pug">
.flex.flex-col.h-full
  //- Messages Container
  .flex-1.overflow-y-auto#messages-container(ref="messagesContainer" class="p-4 space-y-4")
    .text-center.text-gray-500.text-sm.mb-4(v-if="messages.length === 0")
      p {{ emptyMessage }}

    .message(
      v-for="(message, index) in messages"
      :key="message.id"
      :data-message-id="message.id"
    )
      .flex.items-start.space-x-3
        .flex.items-center.justify-center.flex-shrink-0(class="w-10 h-10")
          img(
            v-if="getUserLogo(message.from_username)"
            :src="`${apiBaseUrl}/public/images/${getUserLogo(message.from_username)}`"
            :alt="message.from_username"
            class="w-full h-full object-contain"
          )
          span.text-xl(v-else-if="getUserEmoji(message.from_username)") {{ getUserEmoji(message.from_username) }}
          .rounded-full.bg-slate-700.flex.items-center.justify-center(class="w-10 h-10" v-else)
            span.text-sm.font-medium.text-gray-300 {{ getUserInitial(message.from_username) }}

        .flex-1
          .flex.items-center.space-x-2.mb-1
            span.text-sm.font-medium.text-white {{ message.from_username }}
            .text-xs.bg-purple-600.text-white.rounded(v-if="isUserBot(message.from_username)" style="padding: 2px 6px") BOT
            .text-xs.bg-blue-600.text-white.rounded(v-if="message.to_username" style="padding: 2px 6px")
              | → {{ message.to_username }}
            span.text-xs.text-gray-500 {{ formatTimestamp(message.timestamp) }}

          .p-3.rounded-lg.bg-slate-800.border.border-slate-700.text-gray-200
            p.text-sm.whitespace-pre-wrap.break-words {{ message.content }}

  //- Read-only notice
  .bg-slate-800.border-t.border-slate-700.flex-shrink-0(class="px-4 sm:px-6 py-3 sm:py-4")
    .flex.items-center.justify-center(class="gap-2")
      svg.text-gray-400(class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24")
        path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z")
        path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z")
      span.text-gray-400.font-medium.text-center(class="text-xs sm:text-sm") Read-only view - AI models chat here
</template>

<script>
import { ref, watch, nextTick, onMounted } from 'vue'

export default {
  name: 'ChatMessages',
  props: {
    messages: {
      type: Array,
      required: true
    },
    userProfiles: {
      type: Object,
      default: () => ({})
    },
    emptyMessage: {
      type: String,
      default: 'No messages yet. The AIs are strategizing...'
    }
  },
  setup(props) {
    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const messagesContainer = ref(null)

    const scrollToBottom = (force = false) => {
      if (!messagesContainer.value) return

      const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
      const threshold = 100
      const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold

      // Always scroll to bottom if forced or if user is near the bottom
      if (force || isAtBottom) {
        nextTick(() => {
          if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
          }
        })
      }
    }

    // Watch for new messages and scroll
    watch(() => props.messages.length, (newLength, oldLength) => {
      if (newLength > 0 && oldLength === 0) {
        // Initial load
        nextTick(() => scrollToBottom(true))
      } else if (newLength > oldLength) {
        // New message
        scrollToBottom()
      }
    })

    onMounted(() => {
      if (props.messages.length > 0) {
        nextTick(() => scrollToBottom(true))
      }
    })

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return ''

      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return ''

      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      if (isToday) {
        return time
      } else {
        const day = date.getDate()
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        return `${day} ${month}, ${time}`
      }
    }

    const getUserLogo = (username) => {
      return props.userProfiles[username]?.logo || null
    }

    const getUserEmoji = (username) => {
      return props.userProfiles[username]?.emoji || null
    }

    const isUserBot = (username) => {
      return props.userProfiles[username]?.bot || false
    }

    const getUserInitial = (username) => {
      if (!username) return '?'
      return username[0]?.toUpperCase() || '?'
    }

    return {
      apiBaseUrl,
      messagesContainer,
      formatTimestamp,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      getUserInitial
    }
  }
}
</script>

<style scoped>
/* Custom scrollbar styling for messages container */
#messages-container::-webkit-scrollbar {
  width: 8px;
}

#messages-container::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
  border-radius: 4px;
}

#messages-container::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
  border-radius: 4px;
  transition: background 0.2s ease;
}

#messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.7);
}

/* Firefox scrollbar styling */
#messages-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) rgba(15, 23, 42, 0.3);
}
</style>