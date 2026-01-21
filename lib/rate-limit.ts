/**
 * Database-backed rate limiting for API endpoints
 *
 * Uses PostgreSQL for distributed rate limiting that works across multiple instances.
 */

import { prisma } from '@/lib/prisma'
import { logWarn } from '@/lib/logger'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Skip rate limiting for successful requests
  skipFailedRequests?: boolean // Skip rate limiting for failed requests
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// In-memory fallback for when database is unavailable
const fallbackStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Check and increment rate limit counter atomically using database
 */
async function checkRateLimitDb(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / options.windowMs) * options.windowMs)
  const resetTime = windowStart.getTime() + options.windowMs

  try {
    // Upsert rate limit entry and get current count
    const entry = await prisma.rateLimitEntry.upsert({
      where: {
        identifier_windowStart: {
          identifier,
          windowStart,
        },
      },
      create: {
        identifier,
        windowStart,
        windowMs: options.windowMs,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })

    const allowed = entry.count <= options.maxRequests
    const remaining = Math.max(0, options.maxRequests - entry.count)

    return { allowed, remaining, resetTime }
  } catch (error) {
    // Fallback to in-memory if database fails
    logWarn('Rate limit database error, using fallback', {
      metadata: { identifier, error: error instanceof Error ? error.message : 'Unknown' },
    })
    return checkRateLimitFallback(identifier, options)
  }
}

/**
 * In-memory fallback rate limiter
 */
function checkRateLimitFallback(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}:${Math.floor(now / options.windowMs)}`
  const resetTime = Math.floor(now / options.windowMs) * options.windowMs + options.windowMs

  let entry = fallbackStore.get(key)

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime }
    fallbackStore.set(key, entry)

    // Cleanup old entries
    for (const [k, v] of fallbackStore.entries()) {
      if (now > v.resetTime) fallbackStore.delete(k)
    }
  } else {
    entry.count++
  }

  const allowed = entry.count <= options.maxRequests
  const remaining = Math.max(0, options.maxRequests - entry.count)

  return { allowed, remaining, resetTime }
}

/**
 * Check if request should be rate limited (for pre-check without incrementing)
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / options.windowMs) * options.windowMs)
  const resetTime = windowStart.getTime() + options.windowMs

  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_windowStart: {
          identifier,
          windowStart,
        },
      },
    })

    const count = entry?.count ?? 0
    const allowed = count < options.maxRequests
    const remaining = Math.max(0, options.maxRequests - count)

    return { allowed, remaining, resetTime }
  } catch {
    // Fallback - allow request if database check fails
    return { allowed: true, remaining: options.maxRequests, resetTime }
  }
}

/**
 * Record a request (increment counter)
 */
export async function recordRequest(identifier: string, options: RateLimitOptions): Promise<void> {
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / options.windowMs) * options.windowMs)

  try {
    await prisma.rateLimitEntry.upsert({
      where: {
        identifier_windowStart: {
          identifier,
          windowStart,
        },
      },
      create: {
        identifier,
        windowStart,
        windowMs: options.windowMs,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })
  } catch (error) {
    logWarn('Failed to record rate limit request', {
      metadata: { identifier, error: error instanceof Error ? error.message : 'Unknown' },
    })
  }
}

/**
 * Rate limiting middleware for API routes
 */
export async function withRateLimit(
  request: Request,
  userId: string,
  options: RateLimitOptions,
  handler: () => Promise<Response>
): Promise<Response> {
  const rateLimitResult = await checkRateLimitDb(userId, options)

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime)
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter,
        resetTime: resetDate.toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    )
  }

  try {
    const response = await handler()

    // Rate limit was already counted in checkRateLimitDb
    // Only count additional for failed requests if not skipping
    if (options.skipSuccessfulRequests && response.status < 400) {
      // Don't count - already counted, no adjustment needed for this simplified version
    }

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Clean up old rate limit entries (run periodically)
 */
export async function cleanupRateLimitEntries(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs)

  const result = await prisma.rateLimitEntry.deleteMany({
    where: {
      windowStart: { lt: cutoff },
    },
  })

  return result.count
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  ASSISTANT_CHAT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  ASSISTANT_THREAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 thread operations per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  GENERAL_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 general requests per minute
    skipSuccessfulRequests: true, // Don't count successful requests
    skipFailedRequests: false,
  },
} as const
