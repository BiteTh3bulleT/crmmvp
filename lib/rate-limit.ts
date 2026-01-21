/**
 * Simple in-memory rate limiting for assistant API endpoints
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Skip rate limiting for successful requests
  skipFailedRequests?: boolean // Skip rate limiting for failed requests
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `${identifier}:${Math.floor(now / options.windowMs)}`

  // Clean up expired entries occasionally
  if (Math.random() < 0.1) { // 10% chance to cleanup
    cleanupExpiredEntries()
  }

  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Create new entry
    entry = {
      count: 0,
      resetTime: now + options.windowMs
    }
    rateLimitStore.set(key, entry)
  }

  const remaining = Math.max(0, options.maxRequests - entry.count)
  const allowed = entry.count < options.maxRequests

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  }
}

/**
 * Record a request (increment counter)
 */
export function recordRequest(identifier: string, options: RateLimitOptions): void {
  const now = Date.now()
  const key = `${identifier}:${Math.floor(now / options.windowMs)}`

  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + options.windowMs
    }
  } else {
    entry.count++
  }

  rateLimitStore.set(key, entry)
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
  const rateLimitResult = checkRateLimit(userId, options)

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime)
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter,
        resetTime: resetDate.toISOString()
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    )
  }

  try {
    const response = await handler()

    // Only record the request if we don't want to skip successful requests
    if (!options.skipSuccessfulRequests && response.status < 400) {
      recordRequest(userId, options)
    }

    return response
  } catch (error) {
    // Record failed requests unless we want to skip them
    if (!options.skipFailedRequests) {
      recordRequest(userId, options)
    }
    throw error
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  ASSISTANT_CHAT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  ASSISTANT_THREAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 thread operations per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  GENERAL_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 general requests per minute
    skipSuccessfulRequests: true, // Don't count successful requests
    skipFailedRequests: false
  }
} as const