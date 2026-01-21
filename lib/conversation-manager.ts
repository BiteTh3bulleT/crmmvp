/**
 * Conversation Management Module
 *
 * Provides smart conversation history management with summarization
 * and context preservation for long-running assistant conversations.
 */

import { MessageRole } from '@prisma/client'

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
}

export interface ConversationContext {
  summary?: string
  keyTopics: string[]
  entityReferences: Record<string, string[]> // entityType -> entityIds
  lastActivity: Date
  messageCount: number
}

export interface ManagedConversation {
  messages: ConversationMessage[]
  context: ConversationContext
  shouldSummarize: boolean
  summaryText?: string
}

/**
 * Maximum messages to keep in active context
 */
const MAX_ACTIVE_MESSAGES = 20
const SUMMARY_TRIGGER_MESSAGES = 15
const MAX_SUMMARY_LENGTH = 500

/**
 * Analyze conversation and extract key context
 */
export function analyzeConversation(messages: ConversationMessage[]): ConversationContext {
  const context: ConversationContext = {
    keyTopics: [],
    entityReferences: {},
    lastActivity: new Date(),
    messageCount: messages.length
  }

  // Extract entity references from messages
  const entityPatterns = {
    company: /(?:company|client)\s+["']?([^"'\s]+)["']?/gi,
    contact: /(?:contact|person)\s+["']?([^"'\s]+)["']?/gi,
    deal: /(?:deal|opportunity)\s+["']?([^"'\s]+)["']?/gi,
    task: /(?:task|todo)\s+["']?([^"'\s]+)["']?/gi
  }

  for (const message of messages) {
    const content = message.content.toLowerCase()

    // Extract entity references
    for (const [entityType, pattern] of Object.entries(entityPatterns)) {
      const matches = [...content.matchAll(pattern)]
      if (matches.length > 0) {
        if (!context.entityReferences[entityType]) {
          context.entityReferences[entityType] = []
        }
        for (const match of matches) {
          if (match[1] && !context.entityReferences[entityType].includes(match[1])) {
            context.entityReferences[entityType].push(match[1])
          }
        }
      }
    }

    // Extract key topics (simplified - look for repeated terms)
    const words = content.split(/\s+/).filter(word => word.length > 4)
    for (const word of words) {
      if (content.split(word).length > 2 && !context.keyTopics.includes(word)) {
        context.keyTopics.push(word)
      }
    }
  }

  // Limit topics to most relevant
  context.keyTopics = context.keyTopics.slice(0, 5)

  return context
}

/**
 * Generate a conversation summary
 */
export function generateConversationSummary(messages: ConversationMessage[]): string {
  const context = analyzeConversation(messages)

  const summaryParts = []

  // Add key topics
  if (context.keyTopics.length > 0) {
    summaryParts.push(`Key topics discussed: ${context.keyTopics.join(', ')}`)
  }

  // Add entity references
  const entitySummaries = []
  for (const [entityType, entities] of Object.entries(context.entityReferences)) {
    if (entities.length > 0) {
      entitySummaries.push(`${entityType}s: ${entities.slice(0, 3).join(', ')}`)
    }
  }
  if (entitySummaries.length > 0) {
    summaryParts.push(`Entities mentioned: ${entitySummaries.join('; ')}`)
  }

  // Add conversation flow summary
  const userMessages = messages.filter(m => m.role === MessageRole.USER)
  const assistantMessages = messages.filter(m => m.role === MessageRole.ASSISTANT)

  summaryParts.push(`${userMessages.length} user queries, ${assistantMessages.length} assistant responses`)

  // Combine into final summary
  let summary = summaryParts.join('. ')

  // Truncate if too long
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.substring(0, MAX_SUMMARY_LENGTH - 3) + '...'
  }

  return summary
}

/**
 * Manage conversation history with smart truncation
 */
export function manageConversationHistory(messages: ConversationMessage[]): ManagedConversation {
  const context = analyzeConversation(messages)
  const shouldSummarize = messages.length >= SUMMARY_TRIGGER_MESSAGES

  let finalMessages = messages
  let summaryText: string | undefined

  if (shouldSummarize) {
    // Keep only the most recent messages
    const recentMessages = messages.slice(-MAX_ACTIVE_MESSAGES)

    // Generate summary of older messages
    const olderMessages = messages.slice(0, -MAX_ACTIVE_MESSAGES)
    if (olderMessages.length > 0) {
      summaryText = generateConversationSummary(olderMessages)

      // Insert summary as a system message at the beginning
      const summaryMessage: ConversationMessage = {
        id: `summary-${Date.now()}`,
        role: MessageRole.SYSTEM,
        content: `Previous conversation summary: ${summaryText}`,
        createdAt: new Date()
      }

      finalMessages = [summaryMessage, ...recentMessages]
    } else {
      finalMessages = recentMessages
    }
  }

  return {
    messages: finalMessages,
    context,
    shouldSummarize,
    summaryText
  }
}

/**
 * Check if conversation needs attention (long, inactive, etc.)
 */
export function getConversationHealth(messages: ConversationMessage[]): {
  needsAttention: boolean
  reason?: string
  suggestions?: string[]
} {
  const now = new Date()
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage) {
    return { needsAttention: false }
  }

  const hoursSinceLastMessage = (now.getTime() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60)

  // Check for inactivity
  if (hoursSinceLastMessage > 24) {
    return {
      needsAttention: true,
      reason: 'Conversation inactive for over 24 hours',
      suggestions: ['Send a follow-up message', 'Archive the conversation']
    }
  }

  // Check for very long conversations
  if (messages.length > 50) {
    return {
      needsAttention: true,
      reason: 'Very long conversation may need summarization',
      suggestions: ['Consider starting a new conversation', 'Archive completed topics']
    }
  }

  // Check for repetitive patterns
  const recentMessages = messages.slice(-10)
  const userQuestions = recentMessages.filter(m =>
    m.role === MessageRole.USER &&
    (m.content.includes('?') || m.content.toLowerCase().includes('what') ||
     m.content.toLowerCase().includes('how') || m.content.toLowerCase().includes('why'))
  )

  if (userQuestions.length >= 5) {
    return {
      needsAttention: true,
      reason: 'Many unanswered questions detected',
      suggestions: ['Address pending questions', 'Clarify requirements']
    }
  }

  return { needsAttention: false }
}

/**
 * Get conversation statistics
 */
export function getConversationStats(messages: ConversationMessage[]): {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  avgResponseTime?: number
  topicsDiscussed: string[]
  entitiesReferenced: Record<string, number>
} {
  const userMessages = messages.filter(m => m.role === MessageRole.USER)
  const assistantMessages = messages.filter(m => m.role === MessageRole.ASSISTANT)

  // Calculate average response time (simplified)
  let totalResponseTime = 0
  let responseCount = 0

  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i]
    const next = messages[i + 1]

    if (current.role === MessageRole.USER && next.role === MessageRole.ASSISTANT) {
      totalResponseTime += next.createdAt.getTime() - current.createdAt.getTime()
      responseCount++
    }
  }

  const context = analyzeConversation(messages)

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : undefined,
    topicsDiscussed: context.keyTopics,
    entitiesReferenced: Object.fromEntries(
      Object.entries(context.entityReferences).map(([type, entities]) => [type, entities.length])
    )
  }
}