/**
 * Assistant Schemas
 *
 * Zod schemas for validating action proposals from the LLM
 * and structured responses.
 */

import { z } from 'zod'
import { ActionType, DealStage, RelatedType, TaskStatus } from '@prisma/client'

// ============================================
// Action Payload Schemas
// ============================================

export const createTaskPayloadSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  dueAt: z.string().datetime().optional().nullable(),
  relatedType: z.nativeEnum(RelatedType).optional().default('NONE'),
  relatedId: z.string().optional().nullable()
})

export const createNotePayloadSchema = z.object({
  body: z.string().min(1, 'Note body is required'),
  relatedType: z.nativeEnum(RelatedType),
  relatedId: z.string().min(1, 'Related ID is required')
})

export const createDealPayloadSchema = z.object({
  title: z.string().min(1, 'Deal title is required'),
  amountCents: z.number().int().positive().optional().nullable(),
  stage: z.nativeEnum(DealStage).optional().default('LEAD'),
  closeDate: z.string().datetime().optional().nullable(),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable()
})

export const updateDealStagePayloadSchema = z.object({
  dealId: z.string().min(1, 'Deal ID is required'),
  stage: z.nativeEnum(DealStage)
})

export const updateContactPayloadSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  companyId: z.string().optional().nullable()
})

export const updateCompanyPayloadSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  name: z.string().optional(),
  website: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable()
})

export const createContactPayloadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  companyId: z.string().optional().nullable()
})

export const createCompanyPayloadSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable()
})

export const updateTaskPayloadSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  title: z.string().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional()
})

export const deleteTaskPayloadSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required')
})

export const deleteNotePayloadSchema = z.object({
  noteId: z.string().min(1, 'Note ID is required')
})

export const deleteDealPayloadSchema = z.object({
  dealId: z.string().min(1, 'Deal ID is required')
})

export const deleteContactPayloadSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required')
})

export const deleteCompanyPayloadSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required')
})

export const bulkUpdateDealsPayloadSchema = z.object({
  dealIds: z.array(z.string()).min(1, 'At least one deal ID is required'),
  updates: z.object({
    stage: z.nativeEnum(DealStage).optional(),
    closeDate: z.string().datetime().optional().nullable(),
    amountCents: z.number().int().positive().optional().nullable()
  })
})

export const bulkUpdateTasksPayloadSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  updates: z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    dueAt: z.string().datetime().optional().nullable()
  })
})

export const bulkUpdateContactsPayloadSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact ID is required'),
  updates: z.object({
    title: z.string().optional().nullable(),
    companyId: z.string().optional().nullable()
  })
})

// Union of all payload types
export const actionPayloadSchema = z.union([
  createTaskPayloadSchema,
  createNotePayloadSchema,
  createDealPayloadSchema,
  createContactPayloadSchema,
  createCompanyPayloadSchema,
  updateDealStagePayloadSchema,
  updateContactPayloadSchema,
  updateCompanyPayloadSchema,
  updateTaskPayloadSchema,
  deleteTaskPayloadSchema,
  deleteNotePayloadSchema,
  deleteDealPayloadSchema,
  deleteContactPayloadSchema,
  deleteCompanyPayloadSchema,
  bulkUpdateDealsPayloadSchema,
  bulkUpdateTasksPayloadSchema,
  bulkUpdateContactsPayloadSchema
])

// ============================================
// Action Proposal Schema (from LLM)
// ============================================

export const actionProposalSchema = z.object({
  type: z.literal('action_proposal'),
  actionType: z.nativeEnum(ActionType),
  payload: z.record(z.unknown()),
  summary: z.string().min(1, 'Action summary is required'),
  confirmationMessage: z.string().optional()
})

export type ActionProposal = z.infer<typeof actionProposalSchema>

// ============================================
// Assistant Response Schema
// ============================================

export const citationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string()
})

export const assistantResponseSchema = z.object({
  type: z.literal('text').optional().default('text'),
  content: z.string(),
  citations: z.array(citationSchema).optional().default([])
})

export type AssistantResponse = z.infer<typeof assistantResponseSchema>

// ============================================
// Combined Response (either text or action)
// ============================================

export const llmResponseSchema = z.union([
  actionProposalSchema,
  assistantResponseSchema
])

export type LLMResponse = z.infer<typeof llmResponseSchema>

// ============================================
// Type Exports
// ============================================

export type CreateTaskPayload = z.infer<typeof createTaskPayloadSchema>
export type CreateNotePayload = z.infer<typeof createNotePayloadSchema>
export type CreateDealPayload = z.infer<typeof createDealPayloadSchema>
export type CreateContactPayload = z.infer<typeof createContactPayloadSchema>
export type CreateCompanyPayload = z.infer<typeof createCompanyPayloadSchema>
export type UpdateDealStagePayload = z.infer<typeof updateDealStagePayloadSchema>
export type UpdateContactPayload = z.infer<typeof updateContactPayloadSchema>
export type UpdateCompanyPayload = z.infer<typeof updateCompanyPayloadSchema>
export type UpdateTaskPayload = z.infer<typeof updateTaskPayloadSchema>
export type DeleteTaskPayload = z.infer<typeof deleteTaskPayloadSchema>
export type DeleteNotePayload = z.infer<typeof deleteNotePayloadSchema>
export type DeleteDealPayload = z.infer<typeof deleteDealPayloadSchema>
export type DeleteContactPayload = z.infer<typeof deleteContactPayloadSchema>
export type DeleteCompanyPayload = z.infer<typeof deleteCompanyPayloadSchema>
export type BulkUpdateDealsPayload = z.infer<typeof bulkUpdateDealsPayloadSchema>
export type BulkUpdateTasksPayload = z.infer<typeof bulkUpdateTasksPayloadSchema>
export type BulkUpdateContactsPayload = z.infer<typeof bulkUpdateContactsPayloadSchema>

// ============================================
// Validation Helpers
// ============================================

export function validatePayload(actionType: ActionType, payload: unknown): {
  valid: boolean
  data?: unknown
  error?: string
} {
  try {
    let schema: z.ZodSchema

    switch (actionType) {
      case 'CREATE_TASK':
        schema = createTaskPayloadSchema
        break
      case 'CREATE_NOTE':
        schema = createNotePayloadSchema
        break
      case 'CREATE_DEAL':
        schema = createDealPayloadSchema
        break
      case 'CREATE_CONTACT':
        schema = createContactPayloadSchema
        break
      case 'CREATE_COMPANY':
        schema = createCompanyPayloadSchema
        break
      case 'UPDATE_DEAL_STAGE':
        schema = updateDealStagePayloadSchema
        break
      case 'UPDATE_CONTACT':
        schema = updateContactPayloadSchema
        break
      case 'UPDATE_COMPANY':
        schema = updateCompanyPayloadSchema
        break
      case 'UPDATE_TASK':
        schema = updateTaskPayloadSchema
        break
      case 'DELETE_TASK':
        schema = deleteTaskPayloadSchema
        break
      case 'DELETE_NOTE':
        schema = deleteNotePayloadSchema
        break
      case 'DELETE_DEAL':
        schema = deleteDealPayloadSchema
        break
      case 'DELETE_CONTACT':
        schema = deleteContactPayloadSchema
        break
      case 'DELETE_COMPANY':
        schema = deleteCompanyPayloadSchema
        break
      case 'BULK_UPDATE_DEALS':
        schema = bulkUpdateDealsPayloadSchema
        break
      case 'BULK_UPDATE_TASKS':
        schema = bulkUpdateTasksPayloadSchema
        break
      case 'BULK_UPDATE_CONTACTS':
        schema = bulkUpdateContactsPayloadSchema
        break
      default:
        return { valid: false, error: `Unknown action type: ${actionType}` }
    }

    const result = schema.safeParse(payload)

    if (result.success) {
      return { valid: true, data: result.data }
    } else {
      return {
        valid: false,
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    }
  }
}

/**
 * Try to parse LLM output as structured JSON
 * Returns null if parsing fails
 */
export function parseAssistantResponse(text: string): LLMResponse | null {
  // Try to extract JSON from the response
  // The LLM might wrap it in markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                    text.match(/(\{[\s\S]*\})/)

  if (!jsonMatch) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[1].trim())
    const result = llmResponseSchema.safeParse(parsed)

    if (result.success) {
      return result.data
    }

    // If it's an action proposal but validation failed, return null
    // to treat it as plain text
    return null
  } catch {
    return null
  }
}

/**
 * Check if a response contains an action proposal
 */
export function isActionProposal(response: LLMResponse): response is ActionProposal {
  return response.type === 'action_proposal'
}

/**
 * Format action for display
 */
export function formatActionForDisplay(actionType: ActionType, payload: Record<string, unknown>): string {
  switch (actionType) {
    case 'CREATE_TASK':
      return `Create Task: "${payload.title}"${payload.dueAt ? ` (Due: ${new Date(payload.dueAt as string).toLocaleString()})` : ''}`
    case 'CREATE_NOTE':
      return `Add Note to ${payload.relatedType}: "${(payload.body as string).slice(0, 50)}${(payload.body as string).length > 50 ? '...' : ''}"`
    case 'CREATE_DEAL':
      return `Create Deal: "${payload.title}"${payload.amountCents ? ` ($${(payload.amountCents as number) / 100})` : ''}`
    case 'CREATE_CONTACT':
      return `Create Contact: ${payload.firstName} ${payload.lastName}`
    case 'CREATE_COMPANY':
      return `Create Company: "${payload.name}"`
    case 'UPDATE_DEAL_STAGE':
      return `Update Deal Stage to: ${payload.stage}`
    case 'UPDATE_CONTACT':
      return `Update Contact: ${payload.contactId}`
    case 'UPDATE_COMPANY':
      return `Update Company: ${payload.companyId}`
    case 'UPDATE_TASK':
      return `Update Task: ${payload.taskId}`
    case 'DELETE_TASK':
      return `Delete Task: ${payload.taskId}`
    case 'DELETE_NOTE':
      return `Delete Note: ${payload.noteId}`
    case 'DELETE_DEAL':
      return `Delete Deal: ${payload.dealId}`
    case 'DELETE_CONTACT':
      return `Delete Contact: ${payload.contactId}`
    case 'DELETE_COMPANY':
      return `Delete Company: ${payload.companyId}`
    case 'BULK_UPDATE_DEALS':
      const dealIds = payload.dealIds as string[]
      return `Bulk Update ${dealIds.length} Deal${dealIds.length > 1 ? 's' : ''}`
    case 'BULK_UPDATE_TASKS':
      const taskIds = payload.taskIds as string[]
      return `Bulk Update ${taskIds.length} Task${taskIds.length > 1 ? 's' : ''}`
    case 'BULK_UPDATE_CONTACTS':
      const contactIds = payload.contactIds as string[]
      return `Bulk Update ${contactIds.length} Contact${contactIds.length > 1 ? 's' : ''}`
    default:
      return `Action: ${actionType}`
  }
}
