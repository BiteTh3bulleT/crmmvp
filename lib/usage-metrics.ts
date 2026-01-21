/**
 * Usage Metrics and Analytics Module
 *
 * Tracks assistant usage, performance, and user engagement metrics.
 * Provides insights into feature adoption and system performance.
 */

interface MetricEvent {
  timestamp: Date
  userId: string
  eventType: string
  metadata?: Record<string, any>
  duration?: number // in milliseconds
  success: boolean
}

interface UsageStats {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  avgResponseTime: number
  totalActionsProposed: number
  totalActionsConfirmed: number
  totalThreads: number
  activeUsers: number
  topQueries: Array<{ query: string; count: number }>
  errorRates: Record<string, number>
  performanceMetrics: {
    p50: number
    p95: number
    p99: number
  }
}

class MetricsTracker {
  private events: MetricEvent[] = []
  private readonly maxEvents = 10000 // Keep last 10k events in memory

  /**
   * Record a metric event
   */
  record(event: Omit<MetricEvent, 'timestamp'>): void {
    const metricEvent: MetricEvent = {
      ...event,
      timestamp: new Date()
    }

    this.events.push(metricEvent)

    // Maintain size limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Log important events in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[METRICS] ${event.eventType}:`, {
        userId: event.userId,
        success: event.success,
        duration: event.duration,
        metadata: event.metadata
      })
    }
  }

  /**
   * Record a chat query
   */
  recordChatQuery(userId: string, query: string, responseTime: number, success: boolean, metadata?: Record<string, any>): void {
    this.record({
      userId,
      eventType: 'chat_query',
      metadata: { query, ...metadata },
      duration: responseTime,
      success
    })
  }

  /**
   * Record an action proposal
   */
  recordActionProposed(userId: string, actionType: string, threadId: string): void {
    this.record({
      userId,
      eventType: 'action_proposed',
      metadata: { actionType, threadId },
      success: true
    })
  }

  /**
   * Record an action confirmation
   */
  recordActionConfirmed(userId: string, actionType: string, threadId: string, executionTime: number, success: boolean): void {
    this.record({
      userId,
      eventType: 'action_confirmed',
      metadata: { actionType, threadId },
      duration: executionTime,
      success
    })
  }

  /**
   * Record thread creation
   */
  recordThreadCreated(userId: string, threadId: string): void {
    this.record({
      userId,
      eventType: 'thread_created',
      metadata: { threadId },
      success: true
    })
  }

  /**
   * Record thread deletion
   */
  recordThreadDeleted(userId: string, threadId: string): void {
    this.record({
      userId,
      eventType: 'thread_deleted',
      metadata: { threadId },
      success: true
    })
  }

  /**
   * Record search usage
   */
  recordSearch(userId: string, query: string, resultCount: number): void {
    this.record({
      userId,
      eventType: 'search_performed',
      metadata: { query, resultCount },
      success: true
    })
  }

  /**
   * Record embedding generation
   */
  recordEmbeddingGeneration(userId: string, success: boolean, retryCount: number = 0): void {
    this.record({
      userId,
      eventType: 'embedding_generated',
      metadata: { retryCount },
      success
    })
  }

  /**
   * Get usage statistics
   */
  getStats(timeRangeHours: number = 24): UsageStats {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff)

    const queries = recentEvents.filter(e => e.eventType === 'chat_query')
    const successfulQueries = queries.filter(e => e.success)
    const failedQueries = queries.filter(e => !e.success)

    const actionsProposed = recentEvents.filter(e => e.eventType === 'action_proposed')
    const actionsConfirmed = recentEvents.filter(e => e.eventType === 'action_confirmed')
    const threads = recentEvents.filter(e => e.eventType === 'thread_created')

    // Calculate average response time
    const responseTimes = successfulQueries
      .map(e => e.duration)
      .filter((time): time is number => time !== undefined)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    // Get unique users
    const uniqueUsers = new Set(recentEvents.map(e => e.userId))

    // Get top queries
    const queryCounts = new Map<string, number>()
    queries.forEach(event => {
      const query = (event.metadata?.query as string)?.toLowerCase()?.slice(0, 50) || 'unknown'
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1)
    })

    const topQueries = Array.from(queryCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    // Calculate error rates by event type
    const errorRates: Record<string, number> = {}
    const eventTypes = [...new Set(recentEvents.map(e => e.eventType))]

    eventTypes.forEach(eventType => {
      const eventsOfType = recentEvents.filter(e => e.eventType === eventType)
      const errorCount = eventsOfType.filter(e => !e.success).length
      errorRates[eventType] = eventsOfType.length > 0 ? errorCount / eventsOfType.length : 0
    })

    // Calculate performance percentiles
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b)
    const p50 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)] || 0
    const p95 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0
    const p99 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0

    return {
      totalQueries: queries.length,
      successfulQueries: successfulQueries.length,
      failedQueries: failedQueries.length,
      avgResponseTime,
      totalActionsProposed: actionsProposed.length,
      totalActionsConfirmed: actionsConfirmed.length,
      totalThreads: threads.length,
      activeUsers: uniqueUsers.size,
      topQueries,
      errorRates,
      performanceMetrics: {
        p50,
        p95,
        p99
      }
    }
  }

  /**
   * Get user-specific metrics
   */
  getUserStats(userId: string, timeRangeHours: number = 24): {
    queries: number
    actionsConfirmed: number
    threadsCreated: number
    avgResponseTime: number
    successRate: number
  } {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const userEvents = this.events.filter(e =>
      e.userId === userId && e.timestamp >= cutoff
    )

    const queries = userEvents.filter(e => e.eventType === 'chat_query')
    const successfulQueries = queries.filter(e => e.success)
    const actionsConfirmed = userEvents.filter(e => e.eventType === 'action_confirmed')
    const threadsCreated = userEvents.filter(e => e.eventType === 'thread_created')

    const responseTimes = successfulQueries
      .map(e => e.duration)
      .filter((time): time is number => time !== undefined)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    const successRate = queries.length > 0 ? successfulQueries.length / queries.length : 0

    return {
      queries: queries.length,
      actionsConfirmed: actionsConfirmed.length,
      threadsCreated: threadsCreated.length,
      avgResponseTime,
      successRate
    }
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): { events: MetricEvent[]; stats: UsageStats } {
    return {
      events: [...this.events],
      stats: this.getStats()
    }
  }

  /**
   * Clear old metrics (for memory management)
   */
  clearOldMetrics(olderThanHours: number = 168): void { // 7 days default
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    this.events = this.events.filter(e => e.timestamp >= cutoff)
  }
}

// Global metrics instance
export const metricsTracker = new MetricsTracker()

// Convenience functions for easy importing
export const recordChatQuery = metricsTracker.recordChatQuery.bind(metricsTracker)
export const recordActionProposed = metricsTracker.recordActionProposed.bind(metricsTracker)
export const recordActionConfirmed = metricsTracker.recordActionConfirmed.bind(metricsTracker)
export const recordThreadCreated = metricsTracker.recordThreadCreated.bind(metricsTracker)
export const recordThreadDeleted = metricsTracker.recordThreadDeleted.bind(metricsTracker)
export const recordSearch = metricsTracker.recordSearch.bind(metricsTracker)
export const recordEmbeddingGeneration = metricsTracker.recordEmbeddingGeneration.bind(metricsTracker)
export const getStats = metricsTracker.getStats.bind(metricsTracker)
export const getUserStats = metricsTracker.getUserStats.bind(metricsTracker)