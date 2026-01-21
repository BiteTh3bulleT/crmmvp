import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkOllamaHealth } from '@/lib/ollama'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const health = await checkOllamaHealth()

    return NextResponse.json({
      status: health.available ? 'ok' : 'unavailable',
      mode: health.mode,
      llm: {
        available: health.hasLLM,
        model: health.llmModel
      },
      embeddings: {
        available: health.hasEmbeddings,
        model: health.embeddingModel
      },
      installedModels: health.models
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
