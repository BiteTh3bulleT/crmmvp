/**
 * Standardized API Error Handling
 *
 * Provides consistent error responses across all API routes.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logError } from '@/lib/logger'

export interface ApiErrorResponse {
  error: string
  code: string
  details?: unknown
  correlationId?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

// Pre-defined errors
export const Errors = {
  unauthorized: () => new ApiError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401),
  forbidden: (message = 'Forbidden') => new ApiError(message, ErrorCodes.FORBIDDEN, 403),
  notFound: (resource = 'Resource') => new ApiError(`${resource} not found`, ErrorCodes.NOT_FOUND, 404),
  badRequest: (message: string) => new ApiError(message, ErrorCodes.BAD_REQUEST, 400),
  validation: (details: unknown) => new ApiError('Validation error', ErrorCodes.VALIDATION_ERROR, 400, details),
  conflict: (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409),
  rateLimited: (retryAfter: number) => new ApiError(
    `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    ErrorCodes.RATE_LIMITED,
    429
  ),
  internal: (message = 'Internal server error') => new ApiError(message, ErrorCodes.INTERNAL_ERROR, 500),
}

/**
 * Convert any error to a standardized API response
 */
export function toErrorResponse(
  error: unknown,
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  // Handle ApiError
  if (error instanceof ApiError) {
    const response: ApiErrorResponse = {
      error: error.message,
      code: error.code,
      correlationId,
    }

    if (error.details && process.env.NODE_ENV === 'development') {
      response.details = error.details
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response: ApiErrorResponse = {
      error: 'Validation error',
      code: ErrorCodes.VALIDATION_ERROR,
      correlationId,
      details: process.env.NODE_ENV === 'development'
        ? error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        : undefined,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const response = handlePrismaError(error, correlationId)
    return response
  }

  // Handle generic errors
  if (error instanceof Error) {
    logError('Unhandled error', {
      correlationId,
      metadata: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    })

    const response: ApiErrorResponse = {
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: ErrorCodes.INTERNAL_ERROR,
      correlationId,
    }
    return NextResponse.json(response, { status: 500 })
  }

  // Unknown error type
  const response: ApiErrorResponse = {
    error: 'An unexpected error occurred',
    code: ErrorCodes.INTERNAL_ERROR,
    correlationId,
  }
  return NextResponse.json(response, { status: 500 })
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  let message = 'Database error'
  let code: string = ErrorCodes.DATABASE_ERROR
  let status = 500

  switch (error.code) {
    case 'P2002': // Unique constraint violation
      message = 'A record with this value already exists'
      code = ErrorCodes.CONFLICT
      status = 409
      break
    case 'P2025': // Record not found
      message = 'Record not found'
      code = ErrorCodes.NOT_FOUND
      status = 404
      break
    case 'P2003': // Foreign key constraint failed
      message = 'Related record not found'
      code = ErrorCodes.BAD_REQUEST
      status = 400
      break
  }

  const response: ApiErrorResponse = {
    error: message,
    code,
    correlationId,
  }

  return NextResponse.json(response, { status })
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
  correlationId?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => toErrorResponse(error, correlationId))
}
