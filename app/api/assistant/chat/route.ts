import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamChat, ChatMessage } from '@/lib/ollama'
import { semanticSearch, buildRetrievalContext } from '@/lib/retrieval'
import { buildSystemPrompt } from '@/lib/assistant-prompt'
import { parseAssistantResponse, isActionProposal } from '@/lib/assistant-schemas'
import { generateThreadTitle, updateThreadTitle } from '@/lib/assistant-title'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { manageConversationHistory, getConversationHealth } from '@/lib/conversation-manager'
import { recordChatQuery, recordActionProposed, recordActionConfirmed } from '@/lib/usage-metrics'
import { MessageRole, ActionStatus } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.error('Chat POST: No session found', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id
      })
      return new Response('Unauthorized. Please log in.', { status: 401 })
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return new Response('User not found. Please log in again.', { status: 401 })
    }

    // Apply rate limiting - read body inside handler
    return await withRateLimit(request, session.user.id, RATE_LIMITS.ASSISTANT_CHAT, async () => {
      const body = await request.json()
      const { threadId, message } = body

      if (!threadId || !message) {
        return new Response('Missing threadId or message', { status: 400 })
      }

      // Verify thread ownership and get conversation history
      const thread = await prisma.assistantThread.findFirst({
        where: {
          id: threadId,
          ownerUserId: session.user.id
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
            // Get all messages for smart conversation management
          }
        }
      })

      if (!thread) {
        return new Response('Thread not found', { status: 404 })
      }

      // Save user message
      await prisma.assistantMessage.create({
        data: {
          threadId,
          role: MessageRole.USER,
          content: message
        }
      })

      // Update thread title and timestamp
      const messageCount = await prisma.assistantMessage.count({
        where: { threadId }
      })

      let titleUpdate: { updatedAt: Date; title?: string } = { updatedAt: new Date() }

      // Generate better title for first user message
      if (messageCount === 1) {
        const newTitle = generateThreadTitle(message)
        titleUpdate = { ...titleUpdate, title: newTitle }
      }

      await prisma.assistantThread.update({
        where: { id: threadId },
        data: titleUpdate
      })

      // Perform semantic search to get relevant context
      const searchResults = await semanticSearch(message, session.user.id)
      const retrievalContext = buildRetrievalContext(searchResults)

      // Manage conversation history with smart truncation
      const conversationManagement = manageConversationHistory(thread.messages)

      // Check conversation health
      const healthCheck = getConversationHealth(thread.messages)
      if (healthCheck.needsAttention) {
        console.warn(`Conversation ${threadId} needs attention: ${healthCheck.reason}`)
      }

      // Build messages array for the LLM using managed conversation
      const chatMessages: ChatMessage[] = conversationManagement.messages.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content
      }))

      // Add context and new message
      if (retrievalContext.contextText) {
        chatMessages.push({
          role: 'user',
          content: `[Context from your CRM data]\n${retrievalContext.contextText}\n\n[User question]\n${message}`
        })
      } else {
        chatMessages.push({
          role: 'user',
          content: message
        })
      }

      // Build system prompt
      const systemPrompt = buildSystemPrompt()

      // Create a streaming response
      const encoder = new TextEncoder()
      let fullResponse = ''
      let hasReceivedChunk = false

      const stream = new ReadableStream({
        async start(controller) {
          let isClosed = false
          let timeout: NodeJS.Timeout | null = null

          const safeEnqueue = (data: Uint8Array) => {
            if (!isClosed) {
              try {
                controller.enqueue(data)
              } catch (error) {
                // Controller might be closed, ignore
                isClosed = true
              }
            }
          }

          const safeClose = () => {
            if (!isClosed) {
              try {
                controller.close()
                isClosed = true
              } catch (error) {
                // Already closed, ignore
                isClosed = true
              }
            }
          }

          try {
            // Send initial "thinking" event
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', phase: 'thinking' })}\n\n`))

            // Set a timeout to prevent hanging
            timeout = setTimeout(() => {
              if (!hasReceivedChunk && !isClosed) {
                safeEnqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error', 
                  message: 'Request is taking longer than expected. Please try again.' 
                })}\n\n`))
                safeClose()
              }
            }, 60000) // 60 second timeout

            for await (const chunk of streamChat(chatMessages, systemPrompt)) {
              if (timeout) {
                clearTimeout(timeout)
                timeout = null
              }
              hasReceivedChunk = true
              fullResponse += chunk
              // Send chunk as Server-Sent Event
              const data = JSON.stringify({ type: 'chunk', content: chunk })
              safeEnqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // Log if no chunks were received
            if (!hasReceivedChunk) {
              console.warn('No chunks received from Ollama stream')
            } else {
              console.log(`Stream completed with ${fullResponse.length} characters`)
            }

            if (timeout) {
              clearTimeout(timeout)
              timeout = null
            }

            // After streaming is complete, analyze the response
            const parsed = parseAssistantResponse(fullResponse)

            if (parsed && isActionProposal(parsed)) {
              // Create a proposed action in the database
              const action = await prisma.assistantAction.create({
                data: {
                  threadId,
                  actionType: parsed.actionType,
                  payloadJson: parsed.payload as any,
                  status: ActionStatus.PROPOSED
                }
              })

              // Record action proposal metrics
              recordActionProposed(session.user.id, parsed.actionType, threadId)

              // Send action proposal event
              const actionData = JSON.stringify({
                type: 'action_proposal',
                actionId: action.id,
                actionType: parsed.actionType,
                payload: parsed.payload,
                summary: parsed.summary,
                confirmationMessage: parsed.confirmationMessage
              })
              safeEnqueue(encoder.encode(`data: ${actionData}\n\n`))
            }

            // Send citations if available
            if (retrievalContext.citations.length > 0) {
              const citationsData = JSON.stringify({
                type: 'citations',
                citations: retrievalContext.citations
              })
              safeEnqueue(encoder.encode(`data: ${citationsData}\n\n`))
            }

            // Save assistant message
            await prisma.assistantMessage.create({
              data: {
                threadId,
                role: MessageRole.ASSISTANT,
                content: fullResponse
              }
            })

            // Send done event
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            safeClose()

            // Record successful query metrics
            const responseTime = Date.now() - startTime
            recordChatQuery(session.user.id, message, responseTime, true, {
              threadId,
              hasAction: parsed ? true : false,
              citationsCount: retrievalContext.citations.length
            })
          } catch (error) {
            if (timeout) {
              clearTimeout(timeout)
              timeout = null
            }
            console.error('Stream error:', error)
            if (!isClosed) {
              const errorData = JSON.stringify({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
              })
              safeEnqueue(encoder.encode(`data: ${errorData}\n\n`))
              safeClose()
            }

            // Record failed query metrics
            const responseTime = Date.now() - startTime
            recordChatQuery(session.user.id, message, responseTime, false, {
              threadId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }) // Close rate limiting wrapper
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
