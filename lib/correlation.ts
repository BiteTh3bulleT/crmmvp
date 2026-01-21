/**
 * Request Correlation ID Module
 *
 * Generates and manages correlation IDs for request tracing.
 */

import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

const CORRELATION_ID_HEADER = 'x-correlation-id'

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID()
}

/**
 * Get correlation ID from request headers, or generate a new one
 */
export async function getCorrelationId(): Promise<string> {
  try {
    const headersList = await headers()
    const existingId = headersList.get(CORRELATION_ID_HEADER)
    return existingId || generateCorrelationId()
  } catch {
    // headers() only works in server components/routes
    return generateCorrelationId()
  }
}

/**
 * Get correlation ID from a Request object
 */
export function getCorrelationIdFromRequest(request: Request): string {
  const existingId = request.headers.get(CORRELATION_ID_HEADER)
  return existingId || generateCorrelationId()
}

/**
 * Create response headers with correlation ID
 */
export function createResponseHeaders(correlationId: string, additionalHeaders?: Record<string, string>): Headers {
  const headers = new Headers(additionalHeaders)
  headers.set(CORRELATION_ID_HEADER, correlationId)
  return headers
}
