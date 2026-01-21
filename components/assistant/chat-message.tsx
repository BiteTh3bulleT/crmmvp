'use client'

import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'
import { RichCitation } from './rich-citation'

interface Citation {
  id: string
  type: string
  title: string
  url: string
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  isStreaming?: boolean
}

export function ChatMessage({
  role,
  content,
  citations,
  isStreaming
}: ChatMessageProps) {
  const isUser = role === 'user'

  // Clean content - remove JSON action proposals from display
  const displayContent = content.replace(/```json[\s\S]*?```/g, '').trim()

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-gray-50' : 'bg-white border border-gray-100'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 mb-1">
          {isUser ? 'You' : 'Assistant'}
        </div>

        <div className="text-gray-700 whitespace-pre-wrap break-words">
          {displayContent || (isStreaming ? '' : 'No content')}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
          )}
        </div>

        {citations && citations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-3">
              Sources ({citations.length}):
            </div>
            <div className="grid gap-3">
              {citations.map((citation) => (
                <RichCitation
                  key={`${citation.type}-${citation.id}`}
                  citation={citation}
                  showPreview={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
