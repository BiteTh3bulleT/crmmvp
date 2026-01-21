/**
 * Ollama Integration Module
 *
 * Provides local LLM and embedding capabilities via Ollama HTTP API.
 * Falls back gracefully when Ollama is not available.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3:3.8b'
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

// Optional OpenAI fallback (disabled by default)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const USE_OPENAI = process.env.USE_OPENAI === 'true' && !!OPENAI_API_KEY

export interface OllamaHealthStatus {
  available: boolean
  models: string[]
  hasLLM: boolean
  hasEmbeddings: boolean
  llmModel: string | null
  embeddingModel: string | null
  mode: 'local' | 'openai' | 'unavailable'
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

/**
 * Check if Ollama is available and which models are installed
 */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  // If OpenAI mode is enabled, return that status
  if (USE_OPENAI) {
    return {
      available: true,
      models: ['gpt-4o-mini', 'text-embedding-3-small'],
      hasLLM: true,
      hasEmbeddings: true,
      llmModel: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
      mode: 'openai'
    }
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      return {
        available: false,
        models: [],
        hasLLM: false,
        hasEmbeddings: false,
        llmModel: null,
        embeddingModel: null,
        mode: 'unavailable'
      }
    }

    const data = await response.json()
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name)

    // Check for LLM models (llama variants)
    const llmModels = models.filter(m =>
      m.includes('llama') ||
      m.includes('mistral') ||
      m.includes('codellama') ||
      m.includes('qwen') ||
      m.includes('phi')
    )

    // Check for embedding models
    const embedModels = models.filter(m =>
      m.includes('nomic-embed') ||
      m.includes('mxbai-embed') ||
      m.includes('all-minilm')
    )

    const hasLLM = llmModels.length > 0
    const hasEmbeddings = embedModels.length > 0

    // Prefer configured models, fall back to first available
    let llmModel: string | null = null
    if (models.some(m => m.startsWith(OLLAMA_MODEL))) {
      llmModel = OLLAMA_MODEL
    } else if (llmModels.length > 0) {
      llmModel = llmModels[0]
    }

    let embeddingModel: string | null = null
    if (models.some(m => m.startsWith(OLLAMA_EMBED_MODEL))) {
      embeddingModel = OLLAMA_EMBED_MODEL
    } else if (embedModels.length > 0) {
      embeddingModel = embedModels[0]
    }

    return {
      available: true,
      models,
      hasLLM,
      hasEmbeddings,
      llmModel,
      embeddingModel,
      mode: 'local'
    }
  } catch {
    return {
      available: false,
      models: [],
      hasLLM: false,
      hasEmbeddings: false,
      llmModel: null,
      embeddingModel: null,
      mode: 'unavailable'
    }
  }
}

/**
 * Generate embeddings using Ollama or OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (USE_OPENAI && OPENAI_API_KEY) {
    return generateOpenAIEmbedding(text)
  }
  return generateOllamaEmbedding(text)
}

async function generateOllamaEmbedding(text: string): Promise<number[] | null> {
  try {
    const health = await checkOllamaHealth()
    if (!health.hasEmbeddings || !health.embeddingModel) {
      console.warn('Ollama embeddings not available')
      return null
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: health.embeddingModel,
        prompt: text
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error('Ollama embedding failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.embedding || null
  } catch (error) {
    console.error('Ollama embedding error:', error)
    return null
  }
}

async function generateOpenAIEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 384 // Match our vector dimension
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error('OpenAI embedding failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.data?.[0]?.embedding || null
  } catch (error) {
    console.error('OpenAI embedding error:', error)
    return null
  }
}

/**
 * Stream a chat completion from Ollama or OpenAI
 */
export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string
): AsyncGenerator<string, void, unknown> {
  if (USE_OPENAI && OPENAI_API_KEY) {
    yield* streamOpenAIChat(messages, systemPrompt)
  } else {
    yield* streamOllamaChat(messages, systemPrompt)
  }
}

async function* streamOllamaChat(
  messages: ChatMessage[],
  systemPrompt: string
): AsyncGenerator<string, void, unknown> {
  const health = await checkOllamaHealth()

  if (!health.hasLLM || !health.llmModel) {
    yield 'Error: No LLM model available. Please install a model with `ollama pull llama3.1`'
    return
  }

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: health.llmModel,
        messages: fullMessages,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 1024, // Reduced for faster responses with phi3:3.8b
          num_ctx: 2048, // Context window
          top_p: 0.9,
          top_k: 40
        }
      })
    })

    if (!response.ok || !response.body) {
      yield `Error: Ollama request failed with status ${response.status}`
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const parsed: StreamChunk = JSON.parse(line)
          if (parsed.message?.content) {
            yield parsed.message.content
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } catch (error) {
    yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function* streamOpenAIChat(
  messages: ChatMessage[],
  systemPrompt: string
): AsyncGenerator<string, void, unknown> {
  if (!OPENAI_API_KEY) {
    yield 'Error: OpenAI API key not configured'
    return
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!response.ok || !response.body) {
      yield `Error: OpenAI request failed with status ${response.status}`
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            yield content
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (error) {
    yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Non-streaming chat completion for simple queries
 */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  let result = ''
  for await (const chunk of streamChat(messages, systemPrompt)) {
    result += chunk
  }
  return result
}
