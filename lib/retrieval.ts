/**
 * RAG Retrieval Module
 *
 * Provides semantic search and context retrieval for the NLP assistant.
 * Uses pgvector for similarity search with freshness bias.
 */

import { prisma } from '@/lib/prisma'
import { generateEmbedding, checkOllamaHealth } from '@/lib/ollama'
import { SourceType, DealStage, TaskStatus, RelatedType } from '@prisma/client'

export interface RetrievalResult {
  id: string
  sourceType: SourceType
  sourceId: string
  contentText: string
  similarity: number
  entity: EntityDetails | null
}

export interface EntityDetails {
  id: string
  type: SourceType
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, unknown>
}

export interface RetrievalContext {
  results: RetrievalResult[]
  contextText: string
  citations: EntityDetails[]
}

const TOP_K = 8
const FRESHNESS_WEIGHT = 0.15 // Weight given to freshness in ranking

/**
 * Perform semantic search with freshness bias
 */
export async function semanticSearch(
  query: string,
  userId: string,
  options?: {
    topK?: number
    sourceTypes?: SourceType[]
    minSimilarity?: number
  }
): Promise<RetrievalResult[]> {
  const health = await checkOllamaHealth()

  if (!health.hasEmbeddings && health.mode !== 'openai') {
    // Fall back to keyword search if embeddings not available
    return keywordSearch(query, userId, options)
  }

  const queryEmbedding = await generateEmbedding(query)

  if (!queryEmbedding) {
    return keywordSearch(query, userId, options)
  }

  const topK = options?.topK || TOP_K
  const minSimilarity = options?.minSimilarity || 0.3
  const vectorString = `[${queryEmbedding.join(',')}]`

  // Validate sourceTypes against the enum to prevent injection
  const validSourceTypes: SourceType[] = ['COMPANY', 'CONTACT', 'DEAL', 'TASK', 'NOTE']
  const filteredSourceTypes = options?.sourceTypes?.filter(t => validSourceTypes.includes(t)) || []

  // Semantic search with freshness bias using pgvector
  // The score combines cosine similarity with a time decay factor
  // Use parameterized query with Prisma.sql for safety
  let results: Array<{
    id: string
    sourceType: SourceType
    sourceId: string
    contentText: string
    similarity: number
  }>

  if (filteredSourceTypes.length > 0) {
    // Query with source type filter using ANY() for parameterized array
    results = await prisma.$queryRaw`
      SELECT
        id,
        "sourceType",
        "sourceId",
        "contentText",
        (1 - (embedding <=> ${vectorString}::vector)) * (1 - ${FRESHNESS_WEIGHT}) +
        (1 - LEAST(EXTRACT(EPOCH FROM (NOW() - "updatedAt")) / 2592000, 1)) * ${FRESHNESS_WEIGHT}
        AS similarity
      FROM document_embeddings
      WHERE "ownerUserId" = ${userId}
        AND embedding IS NOT NULL
        AND "sourceType" = ANY(${filteredSourceTypes}::text[])
      ORDER BY similarity DESC
      LIMIT ${topK}
    `
  } else {
    // Query without source type filter
    results = await prisma.$queryRaw`
      SELECT
        id,
        "sourceType",
        "sourceId",
        "contentText",
        (1 - (embedding <=> ${vectorString}::vector)) * (1 - ${FRESHNESS_WEIGHT}) +
        (1 - LEAST(EXTRACT(EPOCH FROM (NOW() - "updatedAt")) / 2592000, 1)) * ${FRESHNESS_WEIGHT}
        AS similarity
      FROM document_embeddings
      WHERE "ownerUserId" = ${userId}
        AND embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT ${topK}
    `
  }

  // Filter by minimum similarity and enrich with entity details
  const enrichedResults: RetrievalResult[] = []

  for (const result of results) {
    if (result.similarity < minSimilarity) continue

    const entity = await getEntityDetails(result.sourceType, result.sourceId, userId)
    enrichedResults.push({
      ...result,
      entity
    })
  }

  return enrichedResults
}

/**
 * Fallback keyword search when embeddings are not available
 */
async function keywordSearch(
  query: string,
  userId: string,
  options?: {
    topK?: number
    sourceTypes?: SourceType[]
  }
): Promise<RetrievalResult[]> {
  const topK = options?.topK || TOP_K
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)

  if (searchTerms.length === 0) return []

  const results: RetrievalResult[] = []

  // Search companies
  if (!options?.sourceTypes || options.sourceTypes.includes('COMPANY')) {
    const companies = await prisma.company.findMany({
      where: {
        ownerUserId: userId,
        OR: searchTerms.map(term => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { website: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } }
          ]
        }))
      },
      take: topK
    })

    for (const company of companies) {
      results.push({
        id: `company-${company.id}`,
        sourceType: 'COMPANY',
        sourceId: company.id,
        contentText: `Company: ${company.name}`,
        similarity: 0.7, // Fixed score for keyword matches
        entity: {
          id: company.id,
          type: 'COMPANY',
          title: company.name,
          subtitle: company.website || company.phone || undefined,
          url: `/companies/${company.id}`,
          metadata: {
            status: 'Active',
            createdAt: company.createdAt.toISOString()
          }
        }
      })
    }
  }

  // Search contacts
  if (!options?.sourceTypes || options.sourceTypes.includes('CONTACT')) {
    const contacts = await prisma.contact.findMany({
      where: {
        ownerUserId: userId,
        OR: searchTerms.map(term => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } }
          ]
        }))
      },
      include: { company: true },
      take: topK
    })

    for (const contact of contacts) {
      const name = `${contact.firstName} ${contact.lastName}`
      results.push({
        id: `contact-${contact.id}`,
        sourceType: 'CONTACT',
        sourceId: contact.id,
        contentText: `Contact: ${name}`,
        similarity: 0.7,
        entity: {
          id: contact.id,
          type: 'CONTACT',
          title: name,
          subtitle: contact.company?.name || contact.title || contact.email || undefined,
          url: `/contacts/${contact.id}`,
          metadata: {
            companyName: contact.company?.name,
            title: contact.title,
            email: contact.email,
            phone: contact.phone,
            createdAt: contact.createdAt.toISOString()
          }
        }
      })
    }
  }

  // Search deals
  if (!options?.sourceTypes || options.sourceTypes.includes('DEAL')) {
    const deals = await prisma.deal.findMany({
      where: {
        ownerUserId: userId,
        OR: searchTerms.map(term => ({
          title: { contains: term, mode: 'insensitive' }
        }))
      },
      include: { company: true, contact: true },
      take: topK
    })

    for (const deal of deals) {
      results.push({
        id: `deal-${deal.id}`,
        sourceType: 'DEAL',
        sourceId: deal.id,
        contentText: `Deal: ${deal.title} - ${deal.stage}`,
        similarity: 0.7,
        entity: {
          id: deal.id,
          type: 'DEAL',
          title: deal.title,
          subtitle: `${deal.stage} - $${deal.amountCents ? deal.amountCents / 100 : 0}`,
          url: `/deals/${deal.id}`,
          metadata: {
            stage: deal.stage,
            amountCents: deal.amountCents,
            dealAmount: deal.amountCents ? deal.amountCents / 100 : undefined,
            companyName: deal.company?.name,
            contactName: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : undefined,
            closeDate: deal.closeDate?.toISOString(),
            createdAt: deal.createdAt.toISOString(),
            status: deal.stage.toLowerCase()
          }
        }
      })
    }
  }

  // Search tasks
  if (!options?.sourceTypes || options.sourceTypes.includes('TASK')) {
    const tasks = await prisma.task.findMany({
      where: {
        ownerUserId: userId,
        OR: searchTerms.map(term => ({
          title: { contains: term, mode: 'insensitive' }
        }))
      },
      take: topK
    })

    for (const task of tasks) {
      results.push({
        id: `task-${task.id}`,
        sourceType: 'TASK',
        sourceId: task.id,
        contentText: `Task: ${task.title}`,
        similarity: 0.7,
        entity: {
          id: task.id,
          type: 'TASK',
          title: task.title,
          subtitle: task.status,
          url: `/tasks/${task.id}`,
          metadata: {
            status: task.status,
            dueAt: task.dueAt
          }
        }
      })
    }
  }

  // Search notes
  if (!options?.sourceTypes || options.sourceTypes.includes('NOTE')) {
    const notes = await prisma.note.findMany({
      where: {
        ownerUserId: userId,
        OR: searchTerms.map(term => ({
          body: { contains: term, mode: 'insensitive' }
        }))
      },
      take: topK
    })

    for (const note of notes) {
      const preview = note.body.length > 100 ? note.body.slice(0, 100) + '...' : note.body
      results.push({
        id: `note-${note.id}`,
        sourceType: 'NOTE',
        sourceId: note.id,
        contentText: `Note: ${note.body}`,
        similarity: 0.7,
        entity: {
          id: note.id,
          type: 'NOTE',
          title: preview,
          url: getRelatedUrl(note.relatedType, note.relatedId),
          metadata: {
            relatedType: note.relatedType,
            relatedId: note.relatedId
          }
        }
      })
    }
  }

  return results.slice(0, topK)
}

/**
 * Get entity details for a specific source
 */
async function getEntityDetails(
  sourceType: SourceType,
  sourceId: string,
  userId: string
): Promise<EntityDetails | null> {
  try {
    switch (sourceType) {
      case 'COMPANY': {
        const company = await prisma.company.findFirst({
          where: { id: sourceId, ownerUserId: userId }
        })
        if (!company) return null
        return {
          id: company.id,
          type: 'COMPANY',
          title: company.name,
          subtitle: company.website || undefined,
          url: `/companies/${company.id}`
        }
      }

      case 'CONTACT': {
        const contact = await prisma.contact.findFirst({
          where: { id: sourceId, ownerUserId: userId },
          include: { company: true }
        })
        if (!contact) return null
        return {
          id: contact.id,
          type: 'CONTACT',
          title: `${contact.firstName} ${contact.lastName}`,
          subtitle: contact.company?.name || contact.title || undefined,
          url: `/contacts/${contact.id}`
        }
      }

      case 'DEAL': {
        const deal = await prisma.deal.findFirst({
          where: { id: sourceId, ownerUserId: userId },
          include: { company: true, contact: true }
        })
        if (!deal) return null
        return {
          id: deal.id,
          type: 'DEAL',
          title: deal.title,
          subtitle: `${deal.stage} - $${deal.amountCents ? deal.amountCents / 100 : 0}`,
          url: `/deals/${deal.id}`,
          metadata: {
            stage: deal.stage,
            amountCents: deal.amountCents,
            dealAmount: deal.amountCents ? deal.amountCents / 100 : undefined,
            companyName: deal.company?.name,
            contactName: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : undefined,
            closeDate: deal.closeDate?.toISOString(),
            createdAt: deal.createdAt.toISOString(),
            status: deal.stage.toLowerCase()
          }
        }
      }

      case 'TASK': {
        const task = await prisma.task.findFirst({
          where: { id: sourceId, ownerUserId: userId }
        })
        if (!task) return null
        return {
          id: task.id,
          type: 'TASK',
          title: task.title,
          subtitle: task.status,
          url: `/tasks/${task.id}`,
          metadata: {
            status: task.status,
            dueAt: task.dueAt
          }
        }
      }

      case 'NOTE': {
        const note = await prisma.note.findFirst({
          where: { id: sourceId, ownerUserId: userId }
        })
        if (!note) return null
        const preview = note.body.length > 100 ? note.body.slice(0, 100) + '...' : note.body
        return {
          id: note.id,
          type: 'NOTE',
          title: preview,
          url: getRelatedUrl(note.relatedType, note.relatedId),
          metadata: {
            relatedType: note.relatedType,
            relatedId: note.relatedId
          }
        }
      }

      default:
        return null
    }
  } catch {
    return null
  }
}

function getRelatedUrl(relatedType: RelatedType, relatedId: string): string {
  switch (relatedType) {
    case 'COMPANY':
      return `/companies/${relatedId}`
    case 'CONTACT':
      return `/contacts/${relatedId}`
    case 'DEAL':
      return `/deals/${relatedId}`
    default:
      return '#'
  }
}

/**
 * Build context for the LLM from retrieval results
 */
export function buildRetrievalContext(results: RetrievalResult[]): RetrievalContext {
  const citations: EntityDetails[] = []
  const contextParts: string[] = []

  for (const result of results) {
    if (result.entity) {
      citations.push(result.entity)
      contextParts.push(
        `[${result.entity.type}:${result.entity.id}] ${result.contentText}`
      )
    } else {
      contextParts.push(`[${result.sourceType}:${result.sourceId}] ${result.contentText}`)
    }
  }

  return {
    results,
    contextText: contextParts.join('\n\n'),
    citations
  }
}

/**
 * Specialized queries for common assistant use cases
 */

export async function findDealsInStage(
  userId: string,
  stage: DealStage,
  options?: { minAmount?: number; maxCloseDate?: Date }
): Promise<EntityDetails[]> {
  const deals = await prisma.deal.findMany({
    where: {
      ownerUserId: userId,
      stage,
      ...(options?.minAmount && { amountCents: { gte: options.minAmount * 100 } }),
      ...(options?.maxCloseDate && { closeDate: { lte: options.maxCloseDate } })
    },
    include: { company: true, contact: true },
    orderBy: { closeDate: 'asc' }
  })

  return deals.map(deal => ({
    id: deal.id,
    type: 'DEAL' as SourceType,
    title: deal.title,
    subtitle: `$${deal.amountCents ? deal.amountCents / 100 : 0} - ${deal.company?.name || 'No company'}`,
    url: `/deals/${deal.id}`,
    metadata: {
      stage: deal.stage,
      amountCents: deal.amountCents,
      closeDate: deal.closeDate,
      companyId: deal.companyId,
      contactId: deal.contactId
    }
  }))
}

export async function findRecentNotes(
  userId: string,
  options?: {
    relatedType?: RelatedType
    relatedId?: string
    limit?: number
  }
): Promise<EntityDetails[]> {
  const notes = await prisma.note.findMany({
    where: {
      ownerUserId: userId,
      ...(options?.relatedType && { relatedType: options.relatedType }),
      ...(options?.relatedId && { relatedId: options.relatedId })
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 10
  })

  return notes.map(note => ({
    id: note.id,
    type: 'NOTE' as SourceType,
    title: note.body.slice(0, 100) + (note.body.length > 100 ? '...' : ''),
    url: getRelatedUrl(note.relatedType, note.relatedId),
    metadata: {
      relatedType: note.relatedType,
      relatedId: note.relatedId,
      createdAt: note.createdAt
    }
  }))
}

export async function findOpenTasks(
  userId: string,
  options?: { dueBefore?: Date }
): Promise<EntityDetails[]> {
  const tasks = await prisma.task.findMany({
    where: {
      ownerUserId: userId,
      status: TaskStatus.OPEN,
      ...(options?.dueBefore && { dueAt: { lte: options.dueBefore } })
    },
    orderBy: { dueAt: 'asc' }
  })

  return tasks.map(task => ({
    id: task.id,
    type: 'TASK' as SourceType,
    title: task.title,
    subtitle: task.dueAt ? `Due: ${task.dueAt.toLocaleDateString()}` : 'No due date',
    url: `/tasks/${task.id}`,
    metadata: {
      status: task.status,
      dueAt: task.dueAt,
      relatedType: task.relatedType,
      relatedId: task.relatedId
    }
  }))
}

export async function findContactsByCompany(
  userId: string,
  companyId: string
): Promise<EntityDetails[]> {
  const contacts = await prisma.contact.findMany({
    where: {
      ownerUserId: userId,
      companyId
    },
    include: { company: true }
  })

  return contacts.map(contact => ({
    id: contact.id,
    type: 'CONTACT' as SourceType,
    title: `${contact.firstName} ${contact.lastName}`,
    subtitle: contact.title || contact.email || undefined,
    url: `/contacts/${contact.id}`,
    metadata: {
      email: contact.email,
      phone: contact.phone,
      companyId: contact.companyId
    }
  }))
}

/**
 * Find entity by name (fuzzy match)
 */
export async function findEntityByName(
  userId: string,
  name: string,
  entityType?: SourceType
): Promise<EntityDetails | null> {
  const searchTerm = name.toLowerCase()

  if (!entityType || entityType === 'COMPANY') {
    const company = await prisma.company.findFirst({
      where: {
        ownerUserId: userId,
        name: { contains: searchTerm, mode: 'insensitive' }
      }
    })
    if (company) {
      return {
        id: company.id,
        type: 'COMPANY',
        title: company.name,
        url: `/companies/${company.id}`
      }
    }
  }

  if (!entityType || entityType === 'CONTACT') {
    const contact = await prisma.contact.findFirst({
      where: {
        ownerUserId: userId,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      include: { company: true }
    })
    if (contact) {
      return {
        id: contact.id,
        type: 'CONTACT',
        title: `${contact.firstName} ${contact.lastName}`,
        subtitle: contact.company?.name,
        url: `/contacts/${contact.id}`
      }
    }
  }

  if (!entityType || entityType === 'DEAL') {
    const deal = await prisma.deal.findFirst({
      where: {
        ownerUserId: userId,
        title: { contains: searchTerm, mode: 'insensitive' }
      }
    })
    if (deal) {
      return {
        id: deal.id,
        type: 'DEAL',
        title: deal.title,
        url: `/deals/${deal.id}`
      }
    }
  }

  return null
}
