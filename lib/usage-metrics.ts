/**
 * Usage Metrics and Analytics Module
 *
 * Tracks assistant usage, performance, and user engagement metrics.
 * Persists metrics to database for durability across restarts.
 */

import { prisma } from '@/lib/prisma'
import { logError, logInfo } from '@/lib/logger'
import type { Prisma, MetricEvent } from '@prisma/client'

interface MetricEventInput {
  userId: string
  eventType: string
  metadata?: Prisma.InputJsonValue
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
  /**
   * Record a metric event to the database
   */
  async record(event: MetricEventInput): Promise<void> {
    try {
      await prisma.metricEvent.create({
        data: {
          userId: event.userId,
          eventType: event.eventType,
          metadata: event.metadata,
          duration: event.duration,
          success: event.success,
        },
      })

      if (process.env.NODE_ENV === 'development') {
        logInfo(`[METRICS] ${event.eventType}`, {
          userId: event.userId,
          metadata: {
            success: event.success,
            duration: event.duration,
          },
        })
      }
    } catch (error) {
      logError('Failed to record metric event', {
        metadata: {
          eventType: event.eventType,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      })
    }
  }

  /**
   * Record a chat query
   */
  async recordChatQuery(
    userId: string,
    query: string,
    responseTime: number,
    success: boolean,
    metadata?: Prisma.InputJsonValue
  ): Promise<void> {
    await this.record({
      userId,
      eventType: 'chat_query',
      metadata: { query: query.slice(0, 200), ...(metadata as object) },
      duration: responseTime,
      success,
    })
  }

  /**
   * Record an action proposal
   */
  async recordActionProposed(userId: string, actionType: string, threadId: string): Promise<void> {
    await this.record({
      userId,
      eventType: 'action_proposed',
      metadata: { actionType, threadId },
      success: true,
    })
  }

  /**
   * Record an action confirmation
   */
  async recordActionConfirmed(
    userId: string,
    actionType: string,
    threadId: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    await this.record({
      userId,
      eventType: 'action_confirmed',
      metadata: { actionType, threadId },
      duration: executionTime,
      success,
    })
  }

  /**
   * Record thread creation
   */
  async recordThreadCreated(userId: string, threadId: string): Promise<void> {
    await this.record({
      userId,
      eventType: 'thread_created',
      metadata: { threadId },
      success: true,
    })
  }

  /**
   * Record thread deletion
   */
  async recordThreadDeleted(userId: string, threadId: string): Promise<void> {
    await this.record({
      userId,
      eventType: 'thread_deleted',
      metadata: { threadId },
      success: true,
    })
  }

  /**
   * Record search usage
   */
  async recordSearch(userId: string, query: string, resultCount: number): Promise<void> {
    await this.record({
      userId,
      eventType: 'search_performed',
      metadata: { query: query.slice(0, 200), resultCount },
      success: true,
    })
  }

  /**
   * Record embedding generation
   */
  async recordEmbeddingGeneration(
    userId: string,
    success: boolean,
    retryCount: number = 0
  ): Promise<void> {
    await this.record({
      userId,
      eventType: 'embedding_generated',
      metadata: { retryCount },
      success,
    })
  }

  /**
   * Get usage statistics from database
   */
  async getStats(timeRangeHours: number = 24): Promise<UsageStats> {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)

    const [events, uniqueUsers] = await Promise.all([
      prisma.metricEvent.findMany({
        where: { createdAt: { gte: cutoff } },
        select: {
          eventType: true,
          duration: true,
          success: true,
          metadata: true,
        },
      }),
      prisma.metricEvent.findMany({
        where: { createdAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ])

    const queries = events.filter(e => e.eventType === 'chat_query')
    const successfulQueries = queries.filter(e => e.success)
    const failedQueries = queries.filter(e => !e.success)

    const actionsProposed = events.filter(e => e.eventType === 'action_proposed')
    const actionsConfirmed = events.filter(e => e.eventType === 'action_confirmed')
    const threads = events.filter(e => e.eventType === 'thread_created')

    // Calculate average response time
    const responseTimes = successfulQueries
      .map(e => e.duration)
      .filter((time): time is number => time !== null && time !== undefined)
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0

    // Get top queries
    const queryCounts = new Map<string, number>()
    queries.forEach(event => {
      const query =
        ((event.metadata as Record<string, unknown>)?.query as string)?.toLowerCase()?.slice(0, 50) || 'unknown'
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1)
    })

    const topQueries = Array.from(queryCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    // Calculate error rates by event type
    const errorRates: Record<string, number> = {}
    const eventTypes = [...new Set(events.map(e => e.eventType))]

    eventTypes.forEach(eventType => {
      const eventsOfType = events.filter(e => e.eventType === eventType)
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
      activeUsers: uniqueUsers.length,
      topQueries,
      errorRates,
      performanceMetrics: {
        p50,
        p95,
        p99,
      },
    }
  }

  /**
   * Get user-specific metrics
   */
  async getUserStats(
    userId: string,
    timeRangeHours: number = 24
  ): Promise<{
    queries: number
    actionsConfirmed: number
    threadsCreated: number
    avgResponseTime: number
    successRate: number
  }> {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)

    const userEvents = await prisma.metricEvent.findMany({
      where: {
        userId,
        createdAt: { gte: cutoff },
      },
    })

    const queries = userEvents.filter(e => e.eventType === 'chat_query')
    const successfulQueries = queries.filter(e => e.success)
    const actionsConfirmed = userEvents.filter(e => e.eventType === 'action_confirmed')
    const threadsCreated = userEvents.filter(e => e.eventType === 'thread_created')

    const responseTimes = successfulQueries
      .map(e => e.duration)
      .filter((time): time is number => time !== null && time !== undefined)
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0

    const successRate = queries.length > 0 ? successfulQueries.length / queries.length : 0

    return {
      queries: queries.length,
      actionsConfirmed: actionsConfirmed.length,
      threadsCreated: threadsCreated.length,
      avgResponseTime,
      successRate,
    }
  }

  /**
   * Clear old metrics (for maintenance)
   */
  async clearOldMetrics(olderThanHours: number = 168): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

    const result = await prisma.metricEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })

    return result.count
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
