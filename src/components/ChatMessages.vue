<template lang="pug">
.flex.flex-col.h-full
  //- Messages Container
  .flex-1.overflow-y-auto#messages-container(ref="messagesContainer" @scroll="handleScroll" class="p-4 space-y-4")
    //- Loading indicator for older messages
    .flex.justify-center.py-4(v-if="isLoadingMore")
      .flex.items-center.space-x-2
        .animate-spin.rounded-full.h-4.w-4.border-b-2.border-white
        span.text-gray-400.text-sm Loading older messages...

    //- No more messages indicator
    .text-center.text-gray-500.text-xs.py-2(v-if="!hasMoreMessages && messages.length > 0")
      p Beginning of conversation

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
            div.text-sm.markdown-content(v-html="renderMarkdown(message.content)")

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
import { marked } from 'marked'

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
    },
    isLoadingMore: {
      type: Boolean,
      default: false
    },
    hasMoreMessages: {
      type: Boolean,
      default: true
    }
  },
  emits: ['load-more'],
  setup(props, { emit }) {
    const apiBaseUrl = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'
    const messagesContainer = ref(null)
    let isHandlingScroll = false

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

    // Handle scroll event for infinite loading
    const handleScroll = () => {
      if (isHandlingScroll || !messagesContainer.value || props.isLoadingMore || !props.hasMoreMessages) {
        return
      }

      const { scrollTop } = messagesContainer.value
      const threshold = 50 // Load more when within 50px of top

      if (scrollTop < threshold) {
        isHandlingScroll = true

        // Save current scroll height before loading more
        const prevScrollHeight = messagesContainer.value.scrollHeight

        emit('load-more')

        // Restore scroll position after messages are prepended
        nextTick(() => {
          setTimeout(() => {
            if (messagesContainer.value) {
              const newScrollHeight = messagesContainer.value.scrollHeight
              const scrollDiff = newScrollHeight - prevScrollHeight
              messagesContainer.value.scrollTop = scrollTop + scrollDiff
            }
            isHandlingScroll = false
          }, 100)
        })
      }
    }

    // Watch for new messages and scroll
    watch(() => props.messages.length, (newLength, oldLength) => {
      if (newLength > 0 && oldLength === 0) {
        // Initial load
        nextTick(() => scrollToBottom(true))
      } else if (newLength > oldLength) {
        // Check if messages were added at the end (new messages) or beginning (pagination)
        // If the difference is 1, it's likely a new message
        // If it's more, it's likely pagination
        if (newLength - oldLength === 1) {
          // New message - scroll to bottom if user is near bottom
          scrollToBottom()
        } else {
          // Multiple messages added - likely pagination
          // Maintain scroll position (handled in handleScroll)
        }
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

      const day = date.getDate()
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase()

      return `${day} ${month} ${time}`
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

    const renderMarkdown = (content) => {
      if (!content) return ''
      try {
        // Strip surrounding backticks if present (both single ` and triple ```)
        let processedContent = content.trim()

        // Check if content looks like markdown (contains markdown syntax)
        const looksLikeMarkdown = (text) => {
          return /#{1,6}\s/.test(text) || /^\s*[*\-+]\s/.test(text) || /^\s*\d+\.\s/.test(text)
        }

        // Remove triple backticks if they wrap markdown
        if (processedContent.startsWith('```') && processedContent.endsWith('```')) {
          const innerContent = processedContent.slice(3, -3).trim()

          // Check for language identifier on the first line
          const firstNewline = innerContent.indexOf('\n')
          let langIdentifier = ''
          let contentWithoutLang = innerContent

          if (firstNewline !== -1 && firstNewline < 20) {
            const firstLine = innerContent.substring(0, firstNewline).trim()
            if (firstLine.length < 20 && !/\s/.test(firstLine)) {
              langIdentifier = firstLine.toLowerCase()
              contentWithoutLang = innerContent.substring(firstNewline + 1).trim()
            }
          }

          // Strip backticks if:
          // 1. Language is "markdown" or "md", OR
          // 2. No language identifier and content looks like markdown
          if (langIdentifier === 'markdown' || langIdentifier === 'md' ||
              (!langIdentifier && looksLikeMarkdown(contentWithoutLang))) {
            processedContent = contentWithoutLang
          }
          // Otherwise leave as-is for marked to handle as code block
        }
        // Remove single backticks if they wrap markdown
        else if (processedContent.startsWith('`') && processedContent.endsWith('`')) {
          const innerContent = processedContent.slice(1, -1).trim()
          if (looksLikeMarkdown(innerContent)) {
            processedContent = innerContent
          }
          // Otherwise leave as-is for marked to handle as inline code
        }

        // Remove common markdown prefix words that people might add
        processedContent = processedContent.replace(/^(markdown|md)\s+/i, '')

        // Add line breaks for inline markdown to render properly
        // Add newline before headers (##, ###, etc.)
        processedContent = processedContent.replace(/\s+(#{1,6})\s+/g, '\n\n$1 ')
        // Add newline before list items (*, -, +, or numbered lists)
        processedContent = processedContent.replace(/\s+([*\-+]|\d+\.)\s+/g, '\n$1 ')

        // Parse markdown with options
        const html = marked(processedContent, {
          breaks: true,
          gfm: true,
          headerIds: false,
          mangle: false
        })
        return html
      } catch (error) {
        console.error('[ChatMessages] Failed to parse markdown:', error, 'Content:', content)
        // Fallback to plain text if parsing fails
        return content
      }
    }

    return {
      apiBaseUrl,
      messagesContainer,
      formatTimestamp,
      getUserLogo,
      getUserEmoji,
      isUserBot,
      getUserInitial,
      renderMarkdown,
      handleScroll
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

/* Markdown content styling */
.markdown-content {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
}

/* Headings */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.25;
  color: #f1f5f9;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  padding-bottom: 0.3em;
}

.markdown-content :deep(h2) {
  font-size: 1.25em;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  padding-bottom: 0.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-size: 1em;
}

/* First heading has no top margin */
.markdown-content :deep(h1:first-child),
.markdown-content :deep(h2:first-child),
.markdown-content :deep(h3:first-child),
.markdown-content :deep(h4:first-child),
.markdown-content :deep(h5:first-child),
.markdown-content :deep(h6:first-child) {
  margin-top: 0;
}

/* Paragraphs */
.markdown-content :deep(p) {
  margin-top: 0;
  margin-bottom: 0.75em;
  line-height: 1.6;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* Lists */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
  line-height: 1.5;
}

.markdown-content :deep(ul ul),
.markdown-content :deep(ol ol),
.markdown-content :deep(ul ol),
.markdown-content :deep(ol ul) {
  margin: 0.25em 0;
}

/* Links */
.markdown-content :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
  text-decoration-color: rgba(96, 165, 250, 0.4);
  transition: all 0.2s ease;
}

.markdown-content :deep(a:hover) {
  color: #93c5fd;
  text-decoration-color: #93c5fd;
}

/* Code */
.markdown-content :deep(code) {
  background-color: rgba(30, 41, 59, 0.7);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  color: #f472b6;
}

.markdown-content :deep(pre) {
  background-color: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  margin: 0.75em 0;
  line-height: 1.5;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: #e2e8f0;
  font-size: 0.875em;
}

/* Blockquotes */
.markdown-content :deep(blockquote) {
  border-left: 3px solid rgba(96, 165, 250, 0.5);
  padding-left: 1em;
  margin: 0.75em 0;
  color: #cbd5e1;
  font-style: italic;
}

.markdown-content :deep(blockquote p) {
  margin: 0.5em 0;
}

/* Horizontal rule */
.markdown-content :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  margin: 1.5em 0;
}

/* Tables */
.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgba(71, 85, 105, 0.5);
  padding: 0.5em 0.75em;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: rgba(30, 41, 59, 0.7);
  font-weight: 600;
  color: #f1f5f9;
}

.markdown-content :deep(tr:nth-child(even)) {
  background-color: rgba(30, 41, 59, 0.3);
}

/* Emphasis */
.markdown-content :deep(strong) {
  font-weight: 700;
  color: #f1f5f9;
}

.markdown-content :deep(em) {
  font-style: italic;
}

/* Images */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}

/* Task lists */
.markdown-content :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}
</style>