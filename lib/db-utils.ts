/**
 * Database Utility Functions
 *
 * Common patterns for database operations, particularly safe delete operations
 * that avoid TOCTOU (time-of-check-time-of-use) race conditions.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Result of a safe delete operation
 */
export interface DeleteResult {
  success: boolean
  deleted: boolean
  error?: string
}

type ModelWithOwner = 'company' | 'contact' | 'deal' | 'task' | 'note' | 'assistantThread'

/**
 * Safely delete a record with ownership verification in a single atomic operation.
 *
 * This avoids TOCTOU race conditions by combining ownership check and deletion
 * into a single query using the ownerUserId in the WHERE clause.
 *
 * @param model - The Prisma model name
 * @param id - The record ID to delete
 * @param ownerUserId - The user who must own the record
 * @returns DeleteResult indicating success or failure
 */
export async function safeDeleteWithOwnership<T extends ModelWithOwner>(
  model: T,
  id: string,
  ownerUserId: string
): Promise<DeleteResult> {
  try {
    // Use deleteMany with ownership check - returns count of deleted records
    // This is atomic and avoids race conditions
    const whereClause = { id, ownerUserId }

    let result: { count: number }

    switch (model) {
      case 'company':
        result = await prisma.company.deleteMany({ where: whereClause })
        break
      case 'contact':
        result = await prisma.contact.deleteMany({ where: whereClause })
        break
      case 'deal':
        result = await prisma.deal.deleteMany({ where: whereClause })
        break
      case 'task':
        result = await prisma.task.deleteMany({ where: whereClause })
        break
      case 'note':
        result = await prisma.note.deleteMany({ where: whereClause })
        break
      case 'assistantThread':
        result = await prisma.assistantThread.deleteMany({ where: whereClause })
        break
      default:
        return { success: false, deleted: false, error: 'Unknown model' }
    }

    if (result.count === 0) {
      // No record deleted - either doesn't exist or not owned by user
      return { success: true, deleted: false }
    }

    return { success: true, deleted: true }
  } catch (error) {
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record to delete does not exist
      if (error.code === 'P2025') {
        return { success: true, deleted: false }
      }
      // P2003: Foreign key constraint failed
      if (error.code === 'P2003') {
        return {
          success: false,
          deleted: false,
          error: 'Cannot delete: record has related data'
        }
      }
    }

    return {
      success: false,
      deleted: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if a record exists and is owned by a user without modifying it.
 *
 * @param model - The Prisma model name
 * @param id - The record ID
 * @param ownerUserId - The user to check ownership for
 * @returns true if the record exists and is owned by the user
 */
export async function checkOwnership<T extends ModelWithOwner>(
  model: T,
  id: string,
  ownerUserId: string
): Promise<boolean> {
  const whereClause = { id, ownerUserId }

  let count: number

  switch (model) {
    case 'company':
      count = await prisma.company.count({ where: whereClause })
      break
    case 'contact':
      count = await prisma.contact.count({ where: whereClause })
      break
    case 'deal':
      count = await prisma.deal.count({ where: whereClause })
      break
    case 'task':
      count = await prisma.task.count({ where: whereClause })
      break
    case 'note':
      count = await prisma.note.count({ where: whereClause })
      break
    case 'assistantThread':
      count = await prisma.assistantThread.count({ where: whereClause })
      break
    default:
      return false
  }

  return count > 0
}
