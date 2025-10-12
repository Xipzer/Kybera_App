interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenRouterResponse {
  id: string
  model: string
  choices: {
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
}

export class OpenRouterService {
  private static OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

  static async sendMessage(
    messages: OpenRouterMessage[],
    model: string,
    apiKey: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    const response = await fetch(this.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'OpenWallet',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: !!onChunk,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to get response from OpenRouter')
    }

    if (onChunk) {
      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                onChunk(content)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullContent
    } else {
      // Handle non-streaming response
      const data: OpenRouterResponse = await response.json()
      return data.choices[0]?.message?.content || ''
    }
  }

  static async getModels(apiKey: string): Promise<any[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = await response.json()
    return data.data || []
  }
}