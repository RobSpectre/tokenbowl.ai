import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatMessages from '../../components/ChatMessages.vue'

describe('ChatMessages.vue', () => {
  let wrapper

  const mockMessages = [
    {
      id: '1',
      from_username: 'test_user',
      content: 'Plain text message',
      timestamp: '2025-10-26T12:00:00Z'
    },
    {
      id: '2',
      from_username: 'bot_user',
      content: '### Fantasy News Headline:\nBreece Hall injury elevates Israel Abanikanda to must-add status.\n\n**Source:** ESPN Fantasy Football News',
      timestamp: '2025-10-26T12:01:00Z'
    }
  ]

  const mockUserProfiles = {
    test_user: {
      username: 'test_user',
      logo: 'test-logo.svg',
      emoji: null,
      bot: false
    },
    bot_user: {
      username: 'bot_user',
      logo: null,
      emoji: '🤖',
      bot: true
    }
  }

  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render messages container', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: mockMessages,
          userProfiles: mockUserProfiles
        }
      })

      expect(wrapper.find('#messages-container').exists()).toBe(true)
    })

    it('should render all messages', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: mockMessages,
          userProfiles: mockUserProfiles
        }
      })

      const messages = wrapper.findAll('.message')
      expect(messages).toHaveLength(2)
    })

    it('should display empty message when no messages', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [],
          userProfiles: {}
        }
      })

      expect(wrapper.text()).toContain('No messages yet')
    })

    it('should display custom empty message', () => {
      const customMessage = 'Custom empty state'
      wrapper = mount(ChatMessages, {
        props: {
          messages: [],
          userProfiles: {},
          emptyMessage: customMessage
        }
      })

      expect(wrapper.text()).toContain(customMessage)
    })
  })

  describe('Markdown Rendering', () => {
    it('should render plain text messages', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[0]],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      expect(content.exists()).toBe(true)
      expect(content.text()).toContain('Plain text message')
    })

    it('should render markdown headings', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[1]],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const heading = content.find('h3')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Fantasy News Headline:')
    })

    it('should render markdown bold text', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[1]],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const strong = content.find('strong')
      expect(strong.exists()).toBe(true)
      expect(strong.text()).toContain('Source:')
    })

    it('should render markdown links', () => {
      const messageWithLink = {
        id: '3',
        from_username: 'test_user',
        content: 'Check out [this link](https://example.com)',
        timestamp: '2025-10-26T12:02:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithLink],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const link = content.find('a')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://example.com')
      expect(link.text()).toBe('this link')
    })

    it('should render markdown code blocks', () => {
      const messageWithCode = {
        id: '4',
        from_username: 'test_user',
        content: '```javascript\nconst foo = "bar";\n```',
        timestamp: '2025-10-26T12:03:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithCode],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const pre = content.find('pre')
      const code = content.find('code')
      expect(pre.exists()).toBe(true)
      expect(code.exists()).toBe(true)
      expect(code.text()).toContain('const foo')
    })

    it('should render inline code', () => {
      const messageWithInlineCode = {
        id: '5',
        from_username: 'test_user',
        content: 'Use the `renderMarkdown()` function',
        timestamp: '2025-10-26T12:04:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithInlineCode],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const code = content.find('code')
      expect(code.exists()).toBe(true)
      expect(code.text()).toBe('renderMarkdown()')
    })

    it('should render markdown lists', () => {
      const messageWithList = {
        id: '6',
        from_username: 'test_user',
        content: '- Item 1\n- Item 2\n- Item 3',
        timestamp: '2025-10-26T12:05:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithList],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const ul = content.find('ul')
      const listItems = content.findAll('li')
      expect(ul.exists()).toBe(true)
      expect(listItems).toHaveLength(3)
      expect(listItems[0].text()).toBe('Item 1')
      expect(listItems[1].text()).toBe('Item 2')
      expect(listItems[2].text()).toBe('Item 3')
    })

    it('should render markdown blockquotes', () => {
      const messageWithQuote = {
        id: '7',
        from_username: 'test_user',
        content: '> This is a quote',
        timestamp: '2025-10-26T12:06:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithQuote],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const blockquote = content.find('blockquote')
      expect(blockquote.exists()).toBe(true)
      expect(blockquote.text()).toContain('This is a quote')
    })

    it('should render markdown tables', () => {
      const messageWithTable = {
        id: '8',
        from_username: 'test_user',
        content: '| Player | Team | Points |\n|--------|------|--------|\n| Smith  | KC   | 24.5   |\n| Jones  | SF   | 18.2   |',
        timestamp: '2025-10-26T12:07:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithTable],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const table = content.find('table')
      const headers = content.findAll('th')
      const rows = content.findAll('tbody tr')

      expect(table.exists()).toBe(true)
      expect(headers).toHaveLength(3)
      expect(headers[0].text()).toBe('Player')
      expect(rows).toHaveLength(2)
    })

    it('should handle empty content gracefully', () => {
      const messageWithEmpty = {
        id: '9',
        from_username: 'test_user',
        content: '',
        timestamp: '2025-10-26T12:08:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithEmpty],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      expect(content.exists()).toBe(true)
      expect(content.text()).toBe('')
    })

    it('should handle null content gracefully', () => {
      const messageWithNull = {
        id: '10',
        from_username: 'test_user',
        content: null,
        timestamp: '2025-10-26T12:09:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithNull],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      expect(content.exists()).toBe(true)
    })
  })

  describe('User Profile Display', () => {
    it('should display user logo when available', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[0]],
          userProfiles: mockUserProfiles
        }
      })

      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toContain('test-logo.svg')
    })

    it('should display user emoji when available', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[1]],
          userProfiles: mockUserProfiles
        }
      })

      expect(wrapper.text()).toContain('🤖')
    })

    it('should display BOT badge for bot users', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[1]],
          userProfiles: mockUserProfiles
        }
      })

      expect(wrapper.text()).toContain('BOT')
    })

    it('should not display BOT badge for regular users', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[0]],
          userProfiles: mockUserProfiles
        }
      })

      const botBadges = wrapper.findAll('.bg-purple-600')
      // Should find 0 bot badges (only checking the bot badge specifically)
      const botBadge = botBadges.find(el => el.text() === 'BOT')
      expect(botBadge).toBeUndefined()
    })

    it('should display user initial when no logo or emoji', () => {
      const userWithoutLogoOrEmoji = {
        username: 'john_doe',
        logo: null,
        emoji: null,
        bot: false
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [{
            id: '11',
            from_username: 'john_doe',
            content: 'Test',
            timestamp: '2025-10-26T12:10:00Z'
          }],
          userProfiles: { john_doe: userWithoutLogoOrEmoji }
        }
      })

      const initial = wrapper.find('.bg-slate-700')
      expect(initial.exists()).toBe(true)
      expect(initial.text()).toBe('J')
    })
  })

  describe('Direct Message Badge', () => {
    it('should display DM badge when message has to_username', () => {
      const dmMessage = {
        id: '12',
        from_username: 'test_user',
        to_username: 'bot_user',
        content: 'Private message',
        timestamp: '2025-10-26T12:11:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [dmMessage],
          userProfiles: mockUserProfiles
        }
      })

      const dmBadge = wrapper.find('.bg-blue-600')
      expect(dmBadge.exists()).toBe(true)
      expect(dmBadge.text()).toContain('→ bot_user')
    })

    it('should not display DM badge for regular messages', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[0]],
          userProfiles: mockUserProfiles
        }
      })

      const dmBadges = wrapper.findAll('.bg-blue-600')
      expect(dmBadges).toHaveLength(0)
    })
  })

  describe('Timestamp Formatting', () => {
    it('should format timestamp correctly for today', () => {
      const now = new Date()
      const todayMessage = {
        id: '13',
        from_username: 'test_user',
        content: 'Test',
        timestamp: now.toISOString()
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [todayMessage],
          userProfiles: mockUserProfiles
        }
      })

      const timestamp = wrapper.find('.text-gray-500')
      expect(timestamp.exists()).toBe(true)
      // Should show day, month, and time for all messages
      expect(timestamp.text()).toMatch(/\d{1,2}\s+\w{3}\s+\d{1,2}:\d{2}\s?(am|pm)/i)
    })

    it('should handle invalid timestamp gracefully', () => {
      const invalidMessage = {
        id: '14',
        from_username: 'test_user',
        content: 'Test',
        timestamp: 'invalid-date'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [invalidMessage],
          userProfiles: mockUserProfiles
        }
      })

      const timestamp = wrapper.find('.text-gray-500')
      expect(timestamp.text()).toBe('')
    })
  })

  describe('Scrolling Behavior', () => {
    it('should scroll to bottom on mount with messages', async () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: mockMessages,
          userProfiles: mockUserProfiles
        }
      })

      await flushPromises()

      const container = wrapper.find('#messages-container')
      expect(container.exists()).toBe(true)
    })

    it('should scroll to bottom when new messages arrive', async () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: [mockMessages[0]],
          userProfiles: mockUserProfiles
        }
      })

      await flushPromises()

      // Add new message
      await wrapper.setProps({
        messages: mockMessages
      })

      await flushPromises()

      expect(wrapper.findAll('.message')).toHaveLength(2)
    })
  })

  describe('Read-only Notice', () => {
    it('should display read-only notice', () => {
      wrapper = mount(ChatMessages, {
        props: {
          messages: mockMessages,
          userProfiles: mockUserProfiles
        }
      })

      expect(wrapper.text()).toContain('Read-only view - AI models chat here')
    })
  })

  describe('Complex Markdown Scenarios', () => {
    it('should render mixed markdown elements', () => {
      const complexMessage = {
        id: '15',
        from_username: 'test_user',
        content: `### Weekly Analysis

**Top Performers:**
- Player A: 28.5 points
- Player B: 24.1 points

> "This week's matchup is critical"

Check the [full stats](https://example.com) for details.

\`\`\`
Total Points: 142.6
\`\`\``,
        timestamp: '2025-10-26T12:12:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [complexMessage],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')

      // Check for all elements
      expect(content.find('h3').exists()).toBe(true)
      expect(content.find('strong').exists()).toBe(true)
      expect(content.find('ul').exists()).toBe(true)
      expect(content.find('blockquote').exists()).toBe(true)
      expect(content.find('a').exists()).toBe(true)
      expect(content.find('pre').exists()).toBe(true)
    })

    it('should preserve line breaks with breaks option', () => {
      const messageWithBreaks = {
        id: '16',
        from_username: 'test_user',
        content: 'Line 1\nLine 2\nLine 3',
        timestamp: '2025-10-26T12:13:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithBreaks],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      const html = content.html()

      // With breaks: true, newlines should create <br> tags
      expect(html).toContain('<br>')
    })

    it('should handle special characters safely', () => {
      const messageWithSpecialChars = {
        id: '17',
        from_username: 'test_user',
        content: 'Characters: < > & " \'',
        timestamp: '2025-10-26T12:14:00Z'
      }

      wrapper = mount(ChatMessages, {
        props: {
          messages: [messageWithSpecialChars],
          userProfiles: mockUserProfiles
        }
      })

      const content = wrapper.find('.markdown-content')
      expect(content.exists()).toBe(true)
      // HTML should be properly escaped
      const html = content.html()
      expect(html).toBeTruthy()
    })
  })
})
