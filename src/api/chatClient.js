/**
 * Token Bowl Chat API Client
 * Simplified client for viewer-only chat functionality
 */

const API_BASE_URL = import.meta.env.VITE_TOKEN_BOWL_CHAT_API_URL || 'http://localhost:8000'

class ChatApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey
  }

  /**
   * Get Centrifugo connection token for WebSocket
   */
  async getCentrifugoConnectionToken() {
    const response = await fetch(`${API_BASE_URL}/centrifugo/connection-token`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get connection token: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch messages from REST API
   */
  async getMessages(limit = 50, offset = 0) {
    const response = await fetch(
      `${API_BASE_URL}/messages?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'X-API-Key': this.apiKey
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch all users
   */
  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch online users
   */
  async getOnlineUsers() {
    const response = await fetch(`${API_BASE_URL}/users/online`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch online users: ${response.statusText}`)
    }

    return response.json()
  }
}

export default ChatApiClient
