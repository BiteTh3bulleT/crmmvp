/**
 * Shared validation utilities
 */

import { z } from 'zod'

// Password complexity requirements
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse(password)
  if (result.success) {
    return { valid: true, errors: [] }
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => e.message)
  }
}

// Numeric query parameter validation
export function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 0) return defaultValue
  return parsed
}

export function parsePositiveIntStrict(value: string | null): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 0) return null
  return parsed
}

// ID validation (CUID format)
export function isValidId(id: string): boolean {
  return /^[a-z0-9]{25}$/.test(id)
}

// Thread title validation
export const threadTitleSchema = z.string()
  .max(200, 'Thread title must be 200 characters or less')
  .optional()
