'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface HealthStatus {
  status: string
  mode: 'local' | 'openai' | 'unavailable'
  llm: {
    available: boolean
    model: string | null
  }
  embeddings: {
    available: boolean
    model: string | null
  }
  installedModels: string[]
}

interface OllamaStatusProps {
  onStatusChange?: (available: boolean) => void
}

export function OllamaStatus({ onStatusChange }: OllamaStatusProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/assistant/health')
      if (!response.ok) {
        throw new Error('Failed to check assistant health')
      }
      const data = await response.json()
      setHealth(data)
      onStatusChange?.(data.llm?.available ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      onStatusChange?.(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
    // Recheck every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading && !health) {
    return (
      <Alert className="bg-gray-50 border-gray-200">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking assistant status...</AlertTitle>
        <AlertDescription>
          Connecting to the language model service.
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Could not check assistant status: {error}</span>
          <Button variant="outline" size="sm" onClick={checkHealth}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!health?.llm?.available) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Local Model Not Detected</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="mb-2">
            The assistant requires a local language model to function. Please install
            Ollama and pull a model.
          </p>
          <div className="bg-amber-100 rounded p-3 font-mono text-sm mb-2">
            <p># Install Ollama (visit ollama.com)</p>
            <p>ollama pull llama3.1</p>
            <p>ollama pull nomic-embed-text</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            className="mt-1"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Check Again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-green-50 border-green-200">
      <Wifi className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">
        Assistant Ready
        {health.mode === 'openai' && ' (OpenAI)'}
        {health.mode === 'local' && ' (Local)'}
      </AlertTitle>
      <AlertDescription className="text-green-700">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>LLM: {health.llm.model || 'Available'}</span>
          </div>
          {health.embeddings?.available && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>Embeddings: {health.embeddings.model || 'Available'}</span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
