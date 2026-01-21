/**
 * Thread Title Generation Module
 *
 * Generates meaningful titles for chat threads based on user messages.
 */

const MAX_TITLE_LENGTH = 50
const DEFAULT_TITLE = "New Chat"

/**
 * Generate a thread title from the first user message
 */
export function generateThreadTitle(userMessage: string): string {
  if (!userMessage || userMessage.trim().length === 0) {
    return DEFAULT_TITLE
  }

  const cleanedMessage = userMessage.trim()

  // Handle different types of messages
  if (isQuestion(cleanedMessage)) {
    return generateQuestionTitle(cleanedMessage)
  }

  if (isActionRequest(cleanedMessage)) {
    return generateActionTitle(cleanedMessage)
  }

  if (isEntitySpecific(cleanedMessage)) {
    return generateEntityTitle(cleanedMessage)
  }

  // Default: use first meaningful sentence or words
  return generateDefaultTitle(cleanedMessage)
}

/**
 * Check if message is a question
 */
function isQuestion(message: string): boolean {
  const questionWords = ['what', 'how', 'when', 'where', 'why', 'who', 'which', 'can you', 'could you', 'would you', '?']
  const lowerMessage = message.toLowerCase()
  return questionWords.some(word => lowerMessage.includes(word)) || message.includes('?')
}

/**
 * Generate title for question-based messages
 */
function generateQuestionTitle(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Common question patterns
  if (lowerMessage.includes('how many') || lowerMessage.includes('how much')) {
    return "Data Query"
  }

  if (lowerMessage.includes('what are') || lowerMessage.includes('what is')) {
    if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
      return "Deal Information"
    }
    if (lowerMessage.includes('contact') || lowerMessage.includes('person')) {
      return "Contact Details"
    }
    if (lowerMessage.includes('company') || lowerMessage.includes('client')) {
      return "Company Overview"
    }
  }

  if (lowerMessage.includes('how to') || lowerMessage.includes('how do i')) {
    return "How-to Question"
  }

  // Extract first meaningful part
  const firstSentence = message.split(/[.!?]/)[0].trim()
  if (firstSentence.length <= MAX_TITLE_LENGTH) {
    return firstSentence
  }

  return "Question"
}

/**
 * Check if message is an action request
 */
function isActionRequest(message: string): boolean {
  const actionWords = ['create', 'add', 'update', 'change', 'delete', 'remove', 'edit', 'modify', 'set', 'mark', 'assign']
  const lowerMessage = message.toLowerCase()
  return actionWords.some(word => lowerMessage.includes(word))
}

/**
 * Generate title for action-based messages
 */
function generateActionTitle(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('create') || lowerMessage.includes('add')) {
    if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
      return "Create Task"
    }
    if (lowerMessage.includes('note')) {
      return "Add Note"
    }
    if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
      return "Create Deal"
    }
    if (lowerMessage.includes('contact')) {
      return "Add Contact"
    }
    return "Create New"
  }

  if (lowerMessage.includes('update') || lowerMessage.includes('change') || lowerMessage.includes('edit')) {
    return "Update Record"
  }

  if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
    return "Delete Record"
  }

  return "Action Request"
}

/**
 * Check if message is entity-specific
 */
function isEntitySpecific(message: string): boolean {
  const entities = ['company', 'contact', 'deal', 'task', 'note', 'client', 'customer', 'project']
  const lowerMessage = message.toLowerCase()
  return entities.some(entity => lowerMessage.includes(entity))
}

/**
 * Generate title for entity-specific messages
 */
function generateEntityTitle(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('company') || lowerMessage.includes('client')) {
    if (lowerMessage.includes('new') || lowerMessage.includes('add')) {
      return "Company Setup"
    }
    return "Company Discussion"
  }

  if (lowerMessage.includes('contact') || lowerMessage.includes('person')) {
    return "Contact Management"
  }

  if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
    if (lowerMessage.includes('pipeline') || lowerMessage.includes('stage')) {
      return "Deal Pipeline"
    }
    return "Deal Discussion"
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    return "Task Management"
  }

  return "CRM Discussion"
}

/**
 * Generate default title from message content
 */
function generateDefaultTitle(message: string): string {
  // Remove common filler words
  const cleaned = message
    .replace(/^(hi|hello|hey|can you|could you|please|thanks?|thank you)\s+/i, '')
    .replace(/\s+(please|thanks?|thank you)$/i, '')

  // Extract first meaningful phrase (up to 60 characters)
  const firstPhrase = cleaned.split(/\s+/).slice(0, 8).join(' ')

  if (firstPhrase.length <= MAX_TITLE_LENGTH && firstPhrase.length > 10) {
    // Capitalize first letter
    return firstPhrase.charAt(0).toUpperCase() + firstPhrase.slice(1)
  }

  // Fallback to first few words
  const words = cleaned.split(/\s+/).slice(0, 4)
  const title = words.join(' ')

  if (title.length > 0) {
    return title.charAt(0).toUpperCase() + title.slice(1)
  }

  return DEFAULT_TITLE
}

/**
 * Update thread title based on conversation context
 */
export function updateThreadTitle(currentTitle: string, userMessage: string, assistantResponse?: string): string {
  // If current title is generic, try to generate a better one
  if (currentTitle === DEFAULT_TITLE || currentTitle.startsWith('Chat ')) {
    return generateThreadTitle(userMessage)
  }

  // If title is already meaningful, keep it
  return currentTitle
}