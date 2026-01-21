/**
 * Structured Logging Module
 *
 * Provides JSON-formatted logging with correlation IDs and metadata.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  correlationId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private static instance: Logger
  private minLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel]
  }

  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: {
    correlationId?: string
    userId?: string
    metadata?: Record<string, unknown>
  }): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    }

    const output = this.formatEntry(entry)

    switch (level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      default:
        console.log(output)
    }
  }

  debug(message: string, context?: { correlationId?: string; userId?: string; metadata?: Record<string, unknown> }): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: { correlationId?: string; userId?: string; metadata?: Record<string, unknown> }): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: { correlationId?: string; userId?: string; metadata?: Record<string, unknown> }): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: { correlationId?: string; userId?: string; metadata?: Record<string, unknown> }): void {
    this.log('error', message, context)
  }
}

export const logger = Logger.getInstance()

// Convenience functions
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)
