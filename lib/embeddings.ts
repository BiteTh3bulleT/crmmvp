/**
 * Embedding Pipeline Module
 *
 * Manages document embedding generation and storage using pgvector.
 * Supports both Ollama (local) and OpenAI embeddings.
 */

import { prisma } from '@/lib/prisma'
import { generateEmbedding, checkOllamaHealth } from '@/lib/ollama'
import { SourceType, Prisma } from '@prisma/client'
import { recordEmbeddingGeneration } from '@/lib/usage-metrics'

export interface EmbeddableContent {
  sourceType: SourceType
  sourceId: string
  contentText: string
  ownerUserId: string
}

/**
 * Generate text content for embedding from different entity types
 */
export function generateContentText(
  sourceType: SourceType,
  entity: Record<string, unknown>
): string {
  switch (sourceType) {
    case 'COMPANY':
      return [
        `Company: ${entity.name}`,
        entity.website && `Website: ${entity.website}`,
        entity.phone && `Phone: ${entity.phone}`,
        entity.address && `Address: ${entity.address}`
      ].filter(Boolean).join('\n')

    case 'CONTACT':
      return [
        `Contact: ${entity.firstName} ${entity.lastName}`,
        entity.email && `Email: ${entity.email}`,
        entity.phone && `Phone: ${entity.phone}`,
        entity.title && `Title: ${entity.title}`,
        entity.companyName && `Company: ${entity.companyName}`
      ].filter(Boolean).join('\n')

    case 'DEAL':
      return [
        `Deal: ${entity.title}`,
        entity.amountCents && `Amount: $${(entity.amountCents as number) / 100}`,
        entity.stage && `Stage: ${entity.stage}`,
        entity.closeDate && `Close Date: ${entity.closeDate}`,
        entity.companyName && `Company: ${entity.companyName}`,
        entity.contactName && `Contact: ${entity.contactName}`
      ].filter(Boolean).join('\n')

    case 'TASK':
      return [
        `Task: ${entity.title}`,
        entity.status && `Status: ${entity.status}`,
        entity.dueAt && `Due: ${entity.dueAt}`
      ].filter(Boolean).join('\n')

    case 'NOTE':
      return [
        `Note: ${entity.body}`,
        entity.relatedType && entity.relatedType !== 'NONE' && `Related to: ${entity.relatedType}`
      ].filter(Boolean).join('\n')

    default:
      return ''
  }
}

/**
 * Generate embedding with retry mechanism
 */
async function generateEmbeddingWithRetry(text: string, maxRetries = 3): Promise<{ embedding: number[] | null; retryCount: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const embedding = await generateEmbedding(text)
      if (embedding && embedding.length > 0) {
        return { embedding, retryCount: attempt - 1 }
      }
    } catch (error) {
      console.warn(`Embedding generation attempt ${attempt}/${maxRetries} failed:`, error)

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`Failed to generate embedding after ${maxRetries} attempts`)
  return { embedding: null, retryCount: maxRetries - 1 }
}

/**
 * Upsert a document embedding
 */
export async function upsertEmbedding(content: EmbeddableContent): Promise<boolean> {
  const health = await checkOllamaHealth()

  if (!health.hasEmbeddings && health.mode !== 'openai') {
    console.warn(`Embedding generation skipped for ${content.sourceType}:${content.sourceId}: no embedding model available`)
    return false
  }

  // Validate input
  if (!content.contentText || content.contentText.trim().length === 0) {
    console.warn(`Embedding generation skipped for ${content.sourceType}:${content.sourceId}: empty content`)
    return false
  }

  if (content.contentText.length > 10000) {
    console.warn(`Content too long for ${content.sourceType}:${content.sourceId}, truncating`)
    content.contentText = content.contentText.substring(0, 10000)
  }

  try {
    const { embedding, retryCount } = await generateEmbeddingWithRetry(content.contentText)

    if (!embedding) {
      console.error(`Failed to generate embedding for ${content.sourceType}:${content.sourceId} after retries`)
      // Record failed embedding generation
      await recordEmbeddingGeneration(content.ownerUserId || 'system', false, retryCount)
      return false
    }

    // Record successful embedding generation
    await recordEmbeddingGeneration(content.ownerUserId || 'system', true, retryCount)

    // Use raw SQL for vector insertion since Prisma doesn't support vector type natively
    const vectorString = `[${embedding.join(',')}]`

    await prisma.$executeRaw`
      INSERT INTO document_embeddings ("id", "sourceType", "sourceId", "contentText", "embedding", "ownerUserId", "updatedAt", "createdAt")
      VALUES (
        ${Prisma.sql`gen_random_uuid()`},
        ${content.sourceType}::"SourceType",
        ${content.sourceId},
        ${content.contentText},
        ${vectorString}::vector,
        ${content.ownerUserId},
        NOW(),
        NOW()
      )
      ON CONFLICT ("sourceType", "sourceId")
      DO UPDATE SET
        "contentText" = ${content.contentText},
        "embedding" = ${vectorString}::vector,
        "updatedAt" = NOW()
    `

    return true
  } catch (error) {
    console.error('Error upserting embedding:', error)
    return false
  }
}

/**
 * Delete an embedding when source is deleted
 */
export async function deleteEmbedding(
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM document_embeddings
      WHERE "sourceType" = ${sourceType}::"SourceType"
      AND "sourceId" = ${sourceId}
    `
  } catch (error) {
    console.error('Error deleting embedding:', error)
  }
}

/**
 * Sync all embeddings for a user (batch operation)
 */
export async function syncAllEmbeddings(userId: string): Promise<{
  companies: number
  contacts: number
  deals: number
  tasks: number
  notes: number
  errors: number
}> {
  const stats = {
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
    notes: 0,
    errors: 0
  }

  // Sync companies
  const companies = await prisma.company.findMany({
    where: { ownerUserId: userId }
  })

  for (const company of companies) {
    const success = await upsertEmbedding({
      sourceType: 'COMPANY',
      sourceId: company.id,
      contentText: generateContentText('COMPANY', company as unknown as Record<string, unknown>),
      ownerUserId: userId
    })
    if (success) stats.companies++
    else stats.errors++
  }

  // Sync contacts
  const contacts = await prisma.contact.findMany({
    where: { ownerUserId: userId },
    include: { company: true }
  })

  for (const contact of contacts) {
    const success = await upsertEmbedding({
      sourceType: 'CONTACT',
      sourceId: contact.id,
      contentText: generateContentText('CONTACT', {
        ...contact,
        companyName: contact.company?.name
      } as unknown as Record<string, unknown>),
      ownerUserId: userId
    })
    if (success) stats.contacts++
    else stats.errors++
  }

  // Sync deals
  const deals = await prisma.deal.findMany({
    where: { ownerUserId: userId },
    include: { company: true, contact: true }
  })

  for (const deal of deals) {
    const success = await upsertEmbedding({
      sourceType: 'DEAL',
      sourceId: deal.id,
      contentText: generateContentText('DEAL', {
        ...deal,
        companyName: deal.company?.name,
        contactName: deal.contact
          ? `${deal.contact.firstName} ${deal.contact.lastName}`
          : undefined
      } as unknown as Record<string, unknown>),
      ownerUserId: userId
    })
    if (success) stats.deals++
    else stats.errors++
  }

  // Sync tasks
  const tasks = await prisma.task.findMany({
    where: { ownerUserId: userId }
  })

  for (const task of tasks) {
    const success = await upsertEmbedding({
      sourceType: 'TASK',
      sourceId: task.id,
      contentText: generateContentText('TASK', task as unknown as Record<string, unknown>),
      ownerUserId: userId
    })
    if (success) stats.tasks++
    else stats.errors++
  }

  // Sync notes
  const notes = await prisma.note.findMany({
    where: { ownerUserId: userId }
  })

  for (const note of notes) {
    const success = await upsertEmbedding({
      sourceType: 'NOTE',
      sourceId: note.id,
      contentText: generateContentText('NOTE', note as unknown as Record<string, unknown>),
      ownerUserId: userId
    })
    if (success) stats.notes++
    else stats.errors++
  }

  return stats
}

/**
 * Hook to be called after entity creation/update
 */
export async function onEntityMutated(
  sourceType: SourceType,
  sourceId: string,
  ownerUserId: string,
  entity: Record<string, unknown>
): Promise<void> {
  // Generate content text based on entity type
  const contentText = generateContentText(sourceType, entity)

  if (!contentText) {
    console.warn('No content text generated for', sourceType, sourceId)
    return
  }

  // Queue embedding generation (don't block the mutation)
  setImmediate(async () => {
    try {
      await upsertEmbedding({
        sourceType,
        sourceId,
        contentText,
        ownerUserId
      })
    } catch (error) {
      console.error('Background embedding failed:', error)
    }
  })
}

/**
 * Hook to be called after entity deletion
 */
export async function onEntityDeleted(
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  // Queue deletion (don't block)
  setImmediate(async () => {
    try {
      await deleteEmbedding(sourceType, sourceId)
    } catch (error) {
      console.error('Background embedding deletion failed:', error)
    }
  })
}
