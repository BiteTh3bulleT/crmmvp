/**
 * User-friendly error messages and suggestions
 */

export interface ErrorContext {
  action?: string
  entity?: string
  field?: string
  value?: string
  suggestion?: string
}

export function getUserFriendlyError(error: unknown, context?: ErrorContext): {
  title: string
  message: string
  suggestion?: string
} {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Network and connection errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      suggestion: 'Try refreshing the page or check your network settings.'
    }
  }

  // Authentication errors
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please sign in again.',
      suggestion: 'Click here to sign in or refresh the page.'
    }
  }

  // Permission errors
  if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
    return {
      title: 'Permission Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestion: 'Contact your administrator if you need access to this feature.'
    }
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      title: 'Invalid Input',
      message: getValidationErrorMessage(errorMessage, context),
      suggestion: getValidationSuggestion(errorMessage, context)
    }
  }

  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('prisma')) {
    return {
      title: 'Database Error',
      message: 'A database error occurred. Please try again.',
      suggestion: 'If the problem persists, contact support.'
    }
  }

  // Assistant-specific errors
  if (errorMessage.includes('ollama') || errorMessage.includes('assistant')) {
    return {
      title: 'Assistant Error',
      message: getAssistantErrorMessage(errorMessage),
      suggestion: getAssistantSuggestion(errorMessage)
    }
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return {
      title: 'Not Found',
      message: `${context?.entity || 'Item'} not found.`,
      suggestion: 'Check if the item was deleted or if you have the correct permissions.'
    }
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests. Please wait a moment.',
      suggestion: 'Wait 30 seconds before trying again.'
    }
  }

  // Generic fallback
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    suggestion: 'If the problem continues, contact support with the error details.'
  }
}

function getValidationErrorMessage(errorMessage: string, context?: ErrorContext): string {
  if (context?.field) {
    if (errorMessage.includes('required')) {
      return `${context.field} is required.`
    }
    if (errorMessage.includes('email')) {
      return `Please enter a valid email address.`
    }
    if (errorMessage.includes('unique')) {
      return `${context.field} must be unique.`
    }
    if (errorMessage.includes('length') || errorMessage.includes('min') || errorMessage.includes('max')) {
      return `${context.field} has an invalid length.`
    }
  }

  return 'Please check your input and try again.'
}

function getValidationSuggestion(errorMessage: string, context?: ErrorContext): string {
  if (context?.field) {
    if (errorMessage.includes('required')) {
      return `Fill in the ${context.field.toLowerCase()} field.`
    }
    if (errorMessage.includes('email')) {
      return 'Make sure the email format is correct (e.g., user@example.com).'
    }
    if (errorMessage.includes('unique')) {
      return `Choose a different ${context.field.toLowerCase()}.`
    }
  }

  return 'Review the form fields and correct any highlighted errors.'
}

function getAssistantErrorMessage(errorMessage: string): string {
  if (errorMessage.includes('ollama') && errorMessage.includes('connection')) {
    return 'Unable to connect to the AI assistant service.'
  }
  if (errorMessage.includes('timeout')) {
    return 'The assistant took too long to respond.'
  }
  if (errorMessage.includes('token') || errorMessage.includes('limit')) {
    return 'The conversation is too long for the assistant to process.'
  }

  return 'The assistant encountered an error while processing your request.'
}

function getAssistantSuggestion(errorMessage: string): string {
  if (errorMessage.includes('ollama') && errorMessage.includes('connection')) {
    return 'Make sure Ollama is running and accessible. Try restarting the Ollama service.'
  }
  if (errorMessage.includes('timeout')) {
    return 'Try asking a simpler question or breaking it into smaller parts.'
  }
  if (errorMessage.includes('token') || errorMessage.includes('limit')) {
    return 'Try starting a new conversation or ask more specific questions.'
  }

  return 'Try rephrasing your question or start a new conversation.'
}

/**
 * Get success messages with context
 */
export function getSuccessMessage(action: string, context?: ErrorContext): {
  title: string
  message: string
} {
  switch (action) {
    case 'create':
      return {
        title: `${context?.entity || 'Item'} created`,
        message: `${context?.entity || 'Item'} has been created successfully.`
      }
    case 'update':
      return {
        title: `${context?.entity || 'Item'} updated`,
        message: `${context?.entity || 'Item'} has been updated successfully.`
      }
    case 'delete':
      return {
        title: `${context?.entity || 'Item'} deleted`,
        message: `${context?.entity || 'Item'} has been deleted successfully.`
      }
    case 'save':
      return {
        title: 'Saved',
        message: 'Your changes have been saved successfully.'
      }
    case 'send':
      return {
        title: 'Message sent',
        message: 'Your message has been sent successfully.'
      }
    default:
      return {
        title: 'Success',
        message: 'Operation completed successfully.'
      }
  }
}