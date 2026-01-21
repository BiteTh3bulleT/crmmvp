'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ChatMessage } from './chat-message'
import { ActionPreviewCard } from './action-preview-card'
import { OllamaStatus } from './ollama-status'
import {
  Send,
  Loader2,
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  MoreVertical
} from 'lucide-react'
import { ActionType, ActionStatus } from '@prisma/client'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

interface ActionProposal {
  actionId: string
  actionType: ActionType
  payload: Record<string, unknown>
  status: ActionStatus
  summary?: string
}

interface Citation {
  id: string
  type: string
  title: string
  url: string
}

interface Thread {
  id: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

interface AssistantPanelProps {
  initialThreads?: Thread[]
}

export function AssistantPanel({ initialThreads = [] }: AssistantPanelProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [actions, setActions] = useState<Map<string, ActionProposal>>(new Map())
  const [citations, setCitations] = useState<Citation[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'searching' | 'generating' | null>(null)
  const [isAssistantReady, setIsAssistantReady] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const createNewThread = async () => {
    try {
      const response = await fetch('/api/assistant/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      })

      if (!response.ok) {
        // Try a different approach - direct server action
        const result = await fetch('/api/assistant/thread', {
          method: 'POST',
          credentials: 'include'
        })
        if (!result.ok) throw new Error('Failed to create thread')
        const thread = await result.json()
        setThreads((prev) => [thread, ...prev])
        setCurrentThreadId(thread.id)
        setMessages([])
        setActions(new Map())
        setCitations([])
        return
      }

      const thread = await response.json()
      setThreads((prev) => [thread, ...prev])
      setCurrentThreadId(thread.id)
      setMessages([])
      setActions(new Map())
      setCitations([])
    } catch (error) {
      console.error('Failed to create thread:', error)
      // Create a temporary local thread for now
      const tempThread: Thread = {
        id: `temp-${Date.now()}`,
        title: `Chat ${new Date().toLocaleDateString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      }
      setThreads((prev) => [tempThread, ...prev])
      setCurrentThreadId(tempThread.id)
      setMessages([])
      setActions(new Map())
      setCitations([])
    }
  }

  const loadThreads = async () => {
    try {
      const response = await fetch('/api/assistant/thread', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to load threads')
      }
      const updatedThreads = await response.json()
      setThreads(updatedThreads)
    } catch (error) {
      console.error('Error loading threads:', error)
    }
  }

  const deleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/assistant/thread?threadId=${threadId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete thread')
      }

      // If we deleted the current thread, select another one or create new
      if (currentThreadId === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId)
        if (remainingThreads.length > 0) {
          selectThread(remainingThreads[0].id)
        } else {
          await createNewThread()
        }
      }

      // Refresh threads
      await loadThreads()
    } catch (error) {
      console.error('Error deleting thread:', error)
      alert('Failed to delete conversation. Please try again.')
    }
  }

  const selectThread = async (threadId: string) => {
    setCurrentThreadId(threadId)
    const thread = threads.find((t) => t.id === threadId)
    if (thread) {
      setMessages(thread.messages || [])
    }
    setActions(new Map())
    setCitations([])
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    let threadId = currentThreadId

    // Create thread if needed
    if (!threadId) {
      try {
        const response = await fetch('/api/assistant/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        })
        if (response.ok) {
          const thread = await response.json()
          setThreads((prev) => [thread, ...prev])
          threadId = thread.id
          setCurrentThreadId(thread.id)
        } else {
          // Use temporary thread
          threadId = `temp-${Date.now()}`
          const tempThread: Thread = {
            id: threadId,
            title: `Chat ${new Date().toLocaleDateString()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: []
          }
          setThreads((prev) => [tempThread, ...prev])
          setCurrentThreadId(threadId)
        }
      } catch {
        threadId = `temp-${Date.now()}`
        setCurrentThreadId(threadId)
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingPhase('thinking')

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          threadId,
          message: userMessage.content
        })
      })

      if (!response.ok || !response.body) {
        throw new Error('Chat request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // If stream ends without a "done" event, ensure we show the accumulated content
          if (accumulatedContent.trim() && isStreaming) {
            const assistantMessage: Message = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: accumulatedContent,
              createdAt: new Date()
            }
            setMessages((prev) => [...prev, assistantMessage])
            setStreamingContent('')
            setStreamingPhase(null)
          }
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'chunk') {
              accumulatedContent += parsed.content
              setStreamingContent(accumulatedContent)
              // Change phase to generating once we start receiving content
              if (streamingPhase === 'thinking' || streamingPhase === 'searching') {
                setStreamingPhase('generating')
              }
            } else if (parsed.type === 'status') {
              // Update phase from server
              if (parsed.phase) {
                setStreamingPhase(parsed.phase)
              }
            } else if (parsed.type === 'action_proposal') {
              const proposal: ActionProposal = {
                actionId: parsed.actionId,
                actionType: parsed.actionType,
                payload: parsed.payload,
                status: 'PROPOSED',
                summary: parsed.summary
              }
              setActions((prev) => new Map(prev).set(parsed.actionId, proposal))
            } else if (parsed.type === 'citations') {
              setCitations(parsed.citations)
              // Citations indicate we've been searching
              setStreamingPhase('searching')
            } else if (parsed.type === 'done') {
              // Final message - ensure we have content to display
              if (accumulatedContent.trim()) {
                const assistantMessage: Message = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: accumulatedContent,
                  createdAt: new Date()
                }
                setMessages((prev) => [...prev, assistantMessage])
              } else {
                // If no content was received, show a message
                const assistantMessage: Message = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: 'I received your request but did not generate a response. Please try again.',
                  createdAt: new Date()
                }
                setMessages((prev) => [...prev, assistantMessage])
              }
              setStreamingContent('')
              setStreamingPhase(null)
            } else if (parsed.type === 'error') {
              setStreamingPhase(null)
              throw new Error(parsed.message)
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      setStreamingPhase(null)
    }
  }, [input, isStreaming, currentThreadId])

  const handleConfirmAction = async (actionId: string) => {
    try {
      const response = await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ actionId, action: 'confirm' })
      })

      const result = await response.json()

      if (result.success) {
        setActions((prev) => {
          const newMap = new Map(prev)
          const action = newMap.get(actionId)
          if (action) {
            newMap.set(actionId, { ...action, status: 'EXECUTED' })
          }
          return newMap
        })
      } else {
        setActions((prev) => {
          const newMap = new Map(prev)
          const action = newMap.get(actionId)
          if (action) {
            newMap.set(actionId, { ...action, status: 'FAILED' })
          }
          return newMap
        })
      }
    } catch (error) {
      console.error('Confirm action error:', error)
    }
  }

  const handleCancelAction = async (actionId: string) => {
    try {
      await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ actionId, action: 'cancel' })
      })

      setActions((prev) => {
        const newMap = new Map(prev)
        const action = newMap.get(actionId)
        if (action) {
          newMap.set(actionId, { ...action, status: 'CANCELLED' })
        }
        return newMap
      })
    } catch (error) {
      console.error('Cancel action error:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <Button onClick={createNewThread} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {threads.length === 0 ? (
              <div className="text-center text-gray-500 text-sm p-4">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative rounded-lg transition-colors ${
                      currentThreadId === thread.id
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <button
                      onClick={() => selectThread(thread.id)}
                      className="w-full text-left p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium truncate flex-1">
                          {thread.title || 'New Chat'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(thread.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteThread(thread.id)
                      }}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-opacity"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b bg-white flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${
                showSidebar ? '' : 'rotate-180'
              }`}
            />
          </Button>
          <h1 className="font-semibold">AI Assistant</h1>
        </div>

        {/* Status Banner */}
        <div className="px-4 py-2 bg-white border-b">
          <OllamaStatus onStatusChange={setIsAssistantReady} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Start a Conversation
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Ask me about your CRM data, create tasks, add notes, or search
                for deals and contacts.
              </p>
              <div className="mt-6 grid gap-2 max-w-md mx-auto text-left">
                <Card
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setInput('Find my deals in negotiation over $5k')}
                >
                  <p className="text-sm text-gray-600">
                    &ldquo;Find my deals in negotiation over $5k&rdquo;
                  </p>
                </Card>
                <Card
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setInput('Summarize my last 10 notes for Acme')}
                >
                  <p className="text-sm text-gray-600">
                    &ldquo;Summarize my last 10 notes for Acme&rdquo;
                  </p>
                </Card>
                <Card
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setInput('Create a task to call John about the proposal tomorrow')
                  }
                >
                  <p className="text-sm text-gray-600">
                    &ldquo;Create a task to call John tomorrow&rdquo;
                  </p>
                </Card>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              citations={
                index === messages.length - 1 && message.role === 'assistant'
                  ? citations
                  : undefined
              }
            />
          ))}

          {/* Streaming indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {streamingPhase === 'thinking' && 'Thinking...'}
                    {streamingPhase === 'searching' && 'Searching your CRM data...'}
                    {streamingPhase === 'generating' && 'Generating response...'}
                    {!streamingPhase && 'Processing...'}
                  </span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
                {streamingPhase === 'searching' && citations.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Found {citations.length} relevant item{citations.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <ChatMessage
              role="assistant"
              content={streamingContent}
              isStreaming={true}
            />
          )}

          {/* Action Proposals */}
          {Array.from(actions.values()).map((action) => (
            <ActionPreviewCard
              key={action.actionId}
              actionId={action.actionId}
              actionType={action.actionType}
              payload={action.payload}
              status={action.status}
              summary={action.summary}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAssistantReady
                  ? 'Ask about your CRM data...'
                  : 'Assistant not available. Please check Ollama setup.'
              }
              disabled={!isAssistantReady || isStreaming}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || !isAssistantReady || isStreaming}
              className="px-3"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
