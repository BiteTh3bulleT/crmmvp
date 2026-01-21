/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides role checking utilities for API routes and server actions.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'

export type Role = UserRole

/**
 * Check if user has required role
 */
export function hasRole(userRole: string | undefined, requiredRole: Role): boolean {
  if (!userRole) return false

  // Admin has access to everything
  if (userRole === UserRole.ADMIN) return true

  return userRole === requiredRole
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRole: string | undefined, requiredRoles: Role[]): boolean {
  if (!userRole) return false

  // Admin has access to everything
  if (userRole === UserRole.ADMIN) return true

  return requiredRoles.includes(userRole as Role)
}

/**
 * Middleware to require specific role for API routes
 */
export async function requireRole(requiredRole: Role): Promise<{
  authorized: boolean
  session: Awaited<ReturnType<typeof getServerSession>> | null
  response?: NextResponse
}> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!hasRole(session.user.role, requiredRole)) {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, session }
}

/**
 * Middleware to require any of the specified roles
 */
export async function requireAnyRole(requiredRoles: Role[]): Promise<{
  authorized: boolean
  session: Awaited<ReturnType<typeof getServerSession>> | null
  response?: NextResponse
}> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!hasAnyRole(session.user.role, requiredRoles)) {
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, session }
}

/**
 * Higher-order function for protecting API routes with role checks
 */
export function withRole<T>(
  requiredRole: Role,
  handler: (session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>) => Promise<T>
): () => Promise<T | NextResponse> {
  return async () => {
    const { authorized, session, response } = await requireRole(requiredRole)

    if (!authorized || !session) {
      return response!
    }

    return handler(session)
  }
}

/**
 * Check role in server actions (throws on failure)
 */
export async function assertRole(requiredRole: Role): Promise<void> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  if (!hasRole(session.user.role, requiredRole)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return session?.user?.role === UserRole.ADMIN
}
