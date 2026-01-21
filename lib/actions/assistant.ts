'use server'

/**
 * Assistant Server Actions
 *
 * Handles thread management, message storage, and action execution.
 */

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  ActionType,
  ActionStatus,
  MessageRole,
  DealStage,
  RelatedType,
  TaskStatus
} from '@prisma/client'
import {
  validatePayload,
  CreateTaskPayload,
  CreateNotePayload,
  CreateDealPayload,
  CreateContactPayload,
  CreateCompanyPayload,
  UpdateDealStagePayload,
  UpdateContactPayload,
  UpdateCompanyPayload,
  UpdateTaskPayload,
  DeleteTaskPayload,
  DeleteNotePayload,
  DeleteDealPayload,
  DeleteContactPayload,
  DeleteCompanyPayload,
  BulkUpdateDealsPayload,
  BulkUpdateTasksPayload,
  BulkUpdateContactsPayload
} from '@/lib/assistant-schemas'
import { onEntityMutated } from '@/lib/embeddings'

// ============================================
// Thread Management
// ============================================

export async function createThread(title?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const thread = await prisma.assistantThread.create({
    data: {
      ownerUserId: session.user.id,
      title: title || `Chat ${new Date().toLocaleDateString()}`
    }
  })

  revalidatePath('/assistant')
  return thread
}

export async function getThreads() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await prisma.assistantThread.findMany({
    where: { ownerUserId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

export async function getThread(threadId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const thread = await prisma.assistantThread.findFirst({
    where: {
      id: threadId,
      ownerUserId: session.user.id
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      actions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!thread) {
    throw new Error('Thread not found')
  }

  return thread
}

export async function deleteThread(threadId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  await prisma.assistantThread.delete({
    where: {
      id: threadId,
      ownerUserId: session.user.id
    }
  })

  revalidatePath('/assistant')
}

// ============================================
// Message Management
// ============================================

export async function addMessage(
  threadId: string,
  role: MessageRole,
  content: string
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify thread ownership
  const thread = await prisma.assistantThread.findFirst({
    where: {
      id: threadId,
      ownerUserId: session.user.id
    }
  })

  if (!thread) {
    throw new Error('Thread not found')
  }

  const message = await prisma.assistantMessage.create({
    data: {
      threadId,
      role,
      content
    }
  })

  // Update thread timestamp
  await prisma.assistantThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() }
  })

  return message
}

export async function getMessages(threadId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify thread ownership
  const thread = await prisma.assistantThread.findFirst({
    where: {
      id: threadId,
      ownerUserId: session.user.id
    }
  })

  if (!thread) {
    throw new Error('Thread not found')
  }

  return await prisma.assistantMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' }
  })
}

// ============================================
// Action Management
// ============================================

export async function proposeAction(
  threadId: string,
  actionType: ActionType,
  payload: Record<string, unknown>
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify thread ownership
  const thread = await prisma.assistantThread.findFirst({
    where: {
      id: threadId,
      ownerUserId: session.user.id
    }
  })

  if (!thread) {
    throw new Error('Thread not found')
  }

  // Validate payload
  const validation = validatePayload(actionType, payload)
  if (!validation.valid) {
    throw new Error(`Invalid action payload: ${validation.error}`)
  }

  const action = await prisma.assistantAction.create({
    data: {
      threadId,
      actionType,
      payloadJson: payload as any,
      status: ActionStatus.PROPOSED
    }
  })

  return action
}

export async function confirmAction(actionId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get the action and verify ownership via thread
  const action = await prisma.assistantAction.findFirst({
    where: { id: actionId },
    include: { thread: true }
  })

  if (!action || action.thread.ownerUserId !== session.user.id) {
    throw new Error('Action not found')
  }

  if (action.status !== ActionStatus.PROPOSED) {
    throw new Error(`Action cannot be confirmed (status: ${action.status})`)
  }

  // Update status to CONFIRMED
  await prisma.assistantAction.update({
    where: { id: actionId },
    data: { status: ActionStatus.CONFIRMED }
  })

  try {
    // Execute the action
    await executeAction(action.actionType, action.payloadJson as Record<string, unknown>, session.user.id)

    // Update status to EXECUTED
    await prisma.assistantAction.update({
      where: { id: actionId },
      data: {
        status: ActionStatus.EXECUTED,
        executedAt: new Date()
      }
    })

    revalidatePath('/assistant')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    // Update status to FAILED
    await prisma.assistantAction.update({
      where: { id: actionId },
      data: {
        status: ActionStatus.FAILED,
        errorMsg: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function cancelAction(actionId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get the action and verify ownership via thread
  const action = await prisma.assistantAction.findFirst({
    where: { id: actionId },
    include: { thread: true }
  })

  if (!action || action.thread.ownerUserId !== session.user.id) {
    throw new Error('Action not found')
  }

  if (action.status !== ActionStatus.PROPOSED) {
    throw new Error(`Action cannot be cancelled (status: ${action.status})`)
  }

  await prisma.assistantAction.update({
    where: { id: actionId },
    data: { status: ActionStatus.CANCELLED }
  })

  revalidatePath('/assistant')
  return { success: true }
}

export async function getAction(actionId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const action = await prisma.assistantAction.findFirst({
    where: { id: actionId },
    include: { thread: true }
  })

  if (!action || action.thread.ownerUserId !== session.user.id) {
    throw new Error('Action not found')
  }

  return action
}

// ============================================
// Action Execution
// ============================================

async function executeAction(
  actionType: ActionType,
  payload: Record<string, unknown>,
  userId: string
): Promise<void> {
  switch (actionType) {
    case 'CREATE_TASK':
      await executeCreateTask(payload as CreateTaskPayload, userId)
      break
    case 'CREATE_NOTE':
      await executeCreateNote(payload as CreateNotePayload, userId)
      break
    case 'CREATE_DEAL':
      await executeCreateDeal(payload as CreateDealPayload, userId)
      break
    case 'CREATE_CONTACT':
      await executeCreateContact(payload as CreateContactPayload, userId)
      break
    case 'CREATE_COMPANY':
      await executeCreateCompany(payload as CreateCompanyPayload, userId)
      break
    case 'UPDATE_DEAL_STAGE':
      await executeUpdateDealStage(payload as UpdateDealStagePayload, userId)
      break
    case 'UPDATE_CONTACT':
      await executeUpdateContact(payload as UpdateContactPayload, userId)
      break
    case 'UPDATE_COMPANY':
      await executeUpdateCompany(payload as UpdateCompanyPayload, userId)
      break
    case 'UPDATE_TASK':
      await executeUpdateTask(payload as UpdateTaskPayload, userId)
      break
    case 'DELETE_TASK':
      await executeDeleteTask(payload as DeleteTaskPayload, userId)
      break
    case 'DELETE_NOTE':
      await executeDeleteNote(payload as DeleteNotePayload, userId)
      break
    case 'DELETE_DEAL':
      await executeDeleteDeal(payload as DeleteDealPayload, userId)
      break
    case 'DELETE_CONTACT':
      await executeDeleteContact(payload as DeleteContactPayload, userId)
      break
    case 'DELETE_COMPANY':
      await executeDeleteCompany(payload as DeleteCompanyPayload, userId)
      break
    case 'BULK_UPDATE_DEALS':
      await executeBulkUpdateDeals(payload as BulkUpdateDealsPayload, userId)
      break
    case 'BULK_UPDATE_TASKS':
      await executeBulkUpdateTasks(payload as BulkUpdateTasksPayload, userId)
      break
    case 'BULK_UPDATE_CONTACTS':
      await executeBulkUpdateContacts(payload as BulkUpdateContactsPayload, userId)
      break
    default:
      throw new Error(`Unknown action type: ${actionType}`)
  }
}

async function executeCreateTask(payload: CreateTaskPayload, userId: string) {
  const task = await prisma.task.create({
    data: {
      title: payload.title,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      status: TaskStatus.OPEN,
      relatedType: payload.relatedType || RelatedType.NONE,
      relatedId: payload.relatedId || null,
      ownerUserId: userId
    }
  })

  // Trigger embedding update
  await onEntityMutated('TASK', task.id, userId, task as unknown as Record<string, unknown>)

  revalidatePath('/tasks')
}

async function executeCreateNote(payload: CreateNotePayload, userId: string) {
  const note = await prisma.note.create({
    data: {
      body: payload.body,
      relatedType: payload.relatedType,
      relatedId: payload.relatedId,
      ownerUserId: userId
    }
  })

  // Trigger embedding update
  await onEntityMutated('NOTE', note.id, userId, note as unknown as Record<string, unknown>)

  // Revalidate related pages
  if (payload.relatedType === RelatedType.COMPANY) {
    revalidatePath(`/companies/${payload.relatedId}`)
  } else if (payload.relatedType === RelatedType.CONTACT) {
    revalidatePath(`/contacts/${payload.relatedId}`)
  } else if (payload.relatedType === RelatedType.DEAL) {
    revalidatePath(`/deals/${payload.relatedId}`)
  }
}

async function executeCreateDeal(payload: CreateDealPayload, userId: string) {
  // Verify company and contact ownership if provided
  if (payload.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: payload.companyId, ownerUserId: userId }
    })
    if (!company) {
      throw new Error('Company not found or not owned by user')
    }
  }

  if (payload.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: payload.contactId, ownerUserId: userId }
    })
    if (!contact) {
      throw new Error('Contact not found or not owned by user')
    }
  }

  const deal = await prisma.deal.create({
    data: {
      title: payload.title,
      amountCents: payload.amountCents || null,
      stage: payload.stage || DealStage.LEAD,
      closeDate: payload.closeDate ? new Date(payload.closeDate) : null,
      companyId: payload.companyId || null,
      contactId: payload.contactId || null,
      ownerUserId: userId
    }
  })

  // Trigger embedding update
  await onEntityMutated('DEAL', deal.id, userId, deal as unknown as Record<string, unknown>)

  revalidatePath('/deals')
}

async function executeUpdateDealStage(payload: UpdateDealStagePayload, userId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: payload.dealId, ownerUserId: userId }
  })

  if (!deal) {
    throw new Error('Deal not found or not owned by user')
  }

  const updatedDeal = await prisma.deal.update({
    where: { id: payload.dealId },
    data: { stage: payload.stage }
  })

  // Trigger embedding update
  await onEntityMutated('DEAL', updatedDeal.id, userId, updatedDeal as unknown as Record<string, unknown>)

  revalidatePath('/deals')
  revalidatePath(`/deals/${payload.dealId}`)
}

async function executeUpdateContact(payload: UpdateContactPayload, userId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: payload.contactId, ownerUserId: userId }
  })

  if (!contact) {
    throw new Error('Contact not found or not owned by user')
  }

  // Verify company ownership if provided
  if (payload.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: payload.companyId, ownerUserId: userId }
    })
    if (!company) {
      throw new Error('Company not found or not owned by user')
    }
  }

  const { contactId, ...updateData } = payload
  const updatedContact = await prisma.contact.update({
    where: { id: contactId },
    data: updateData,
    include: { company: true }
  })

  // Trigger embedding update
  await onEntityMutated('CONTACT', updatedContact.id, userId, {
    ...updatedContact,
    companyName: updatedContact.company?.name
  } as unknown as Record<string, unknown>)

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${contactId}`)
}

async function executeUpdateCompany(payload: UpdateCompanyPayload, userId: string) {
  const company = await prisma.company.findFirst({
    where: { id: payload.companyId, ownerUserId: userId }
  })

  if (!company) {
    throw new Error('Company not found or not owned by user')
  }

  const { companyId, ...updateData } = payload
  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data: updateData
  })

  // Trigger embedding update
  await onEntityMutated('COMPANY', updatedCompany.id, userId, updatedCompany as unknown as Record<string, unknown>)

  revalidatePath('/companies')
  revalidatePath(`/companies/${companyId}`)
}

async function executeCreateContact(payload: CreateContactPayload, userId: string) {
  // Verify company ownership if provided
  if (payload.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: payload.companyId, ownerUserId: userId }
    })
    if (!company) {
      throw new Error('Company not found or not owned by user')
    }
  }

  const contact = await prisma.contact.create({
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email || null,
      phone: payload.phone || null,
      title: payload.title || null,
      companyId: payload.companyId || null,
      ownerUserId: userId
    },
    include: { company: true }
  })

  // Trigger embedding update
  await onEntityMutated('CONTACT', contact.id, userId, {
    ...contact,
    companyName: contact.company?.name
  } as unknown as Record<string, unknown>)

  revalidatePath('/contacts')
}

async function executeCreateCompany(payload: CreateCompanyPayload, userId: string) {
  const company = await prisma.company.create({
    data: {
      name: payload.name,
      website: payload.website || null,
      phone: payload.phone || null,
      address: payload.address || null,
      ownerUserId: userId
    }
  })

  // Trigger embedding update
  await onEntityMutated('COMPANY', company.id, userId, company as unknown as Record<string, unknown>)

  revalidatePath('/companies')
}

async function executeUpdateTask(payload: UpdateTaskPayload, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: payload.taskId, ownerUserId: userId }
  })

  if (!task) {
    throw new Error('Task not found or not owned by user')
  }

  const { taskId, ...updateData } = payload
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...updateData,
      dueAt: updateData.dueAt ? new Date(updateData.dueAt) : undefined
    }
  })

  // Trigger embedding update
  await onEntityMutated('TASK', updatedTask.id, userId, updatedTask as unknown as Record<string, unknown>)

  revalidatePath('/tasks')
}

async function executeDeleteTask(payload: DeleteTaskPayload, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: payload.taskId, ownerUserId: userId }
  })

  if (!task) {
    throw new Error('Task not found or not owned by user')
  }

  await prisma.task.delete({
    where: { id: payload.taskId }
  })

  revalidatePath('/tasks')
}

async function executeDeleteNote(payload: DeleteNotePayload, userId: string) {
  const note = await prisma.note.findFirst({
    where: { id: payload.noteId, ownerUserId: userId }
  })

  if (!note) {
    throw new Error('Note not found or not owned by user')
  }

  await prisma.note.delete({
    where: { id: payload.noteId }
  })

  // Revalidate related pages
  if (note.relatedType === RelatedType.COMPANY) {
    revalidatePath(`/companies/${note.relatedId}`)
  } else if (note.relatedType === RelatedType.CONTACT) {
    revalidatePath(`/contacts/${note.relatedId}`)
  } else if (note.relatedType === RelatedType.DEAL) {
    revalidatePath(`/deals/${note.relatedId}`)
  }
}

async function executeDeleteDeal(payload: DeleteDealPayload, userId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: payload.dealId, ownerUserId: userId }
  })

  if (!deal) {
    throw new Error('Deal not found or not owned by user')
  }

  await prisma.deal.delete({
    where: { id: payload.dealId }
  })

  revalidatePath('/deals')
}

async function executeDeleteContact(payload: DeleteContactPayload, userId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: payload.contactId, ownerUserId: userId }
  })

  if (!contact) {
    throw new Error('Contact not found or not owned by user')
  }

  await prisma.contact.delete({
    where: { id: payload.contactId }
  })

  revalidatePath('/contacts')
}

async function executeDeleteCompany(payload: DeleteCompanyPayload, userId: string) {
  const company = await prisma.company.findFirst({
    where: { id: payload.companyId, ownerUserId: userId }
  })

  if (!company) {
    throw new Error('Company not found or not owned by user')
  }

  await prisma.company.delete({
    where: { id: payload.companyId }
  })

  revalidatePath('/companies')
}

async function executeBulkUpdateDeals(payload: BulkUpdateDealsPayload, userId: string) {
  // Verify all deals belong to the user
  const deals = await prisma.deal.findMany({
    where: {
      id: { in: payload.dealIds },
      ownerUserId: userId
    }
  })

  if (deals.length !== payload.dealIds.length) {
    throw new Error('One or more deals not found or not owned by user')
  }

  // Prepare update data
  const updateData: any = {}
  if (payload.updates.stage) updateData.stage = payload.updates.stage
  if (payload.updates.closeDate !== undefined) {
    updateData.closeDate = payload.updates.closeDate ? new Date(payload.updates.closeDate) : null
  }
  if (payload.updates.amountCents !== undefined) {
    updateData.amountCents = payload.updates.amountCents
  }

  // Bulk update
  await prisma.deal.updateMany({
    where: {
      id: { in: payload.dealIds },
      ownerUserId: userId
    },
    data: updateData
  })

  // Update embeddings for all affected deals
  for (const dealId of payload.dealIds) {
    const updatedDeal = await prisma.deal.findUnique({ where: { id: dealId } })
    if (updatedDeal) {
      await onEntityMutated('DEAL', dealId, userId, updatedDeal as unknown as Record<string, unknown>)
    }
  }

  revalidatePath('/deals')
}

async function executeBulkUpdateTasks(payload: BulkUpdateTasksPayload, userId: string) {
  // Verify all tasks belong to the user
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: payload.taskIds },
      ownerUserId: userId
    }
  })

  if (tasks.length !== payload.taskIds.length) {
    throw new Error('One or more tasks not found or not owned by user')
  }

  // Prepare update data
  const updateData: any = {}
  if (payload.updates.status) updateData.status = payload.updates.status
  if (payload.updates.dueAt !== undefined) {
    updateData.dueAt = payload.updates.dueAt ? new Date(payload.updates.dueAt) : null
  }

  // Bulk update
  await prisma.task.updateMany({
    where: {
      id: { in: payload.taskIds },
      ownerUserId: userId
    },
    data: updateData
  })

  // Update embeddings for all affected tasks
  for (const taskId of payload.taskIds) {
    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } })
    if (updatedTask) {
      await onEntityMutated('TASK', taskId, userId, updatedTask as unknown as Record<string, unknown>)
    }
  }

  revalidatePath('/tasks')
}

async function executeBulkUpdateContacts(payload: BulkUpdateContactsPayload, userId: string) {
  // Verify all contacts belong to the user
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: payload.contactIds },
      ownerUserId: userId
    }
  })

  if (contacts.length !== payload.contactIds.length) {
    throw new Error('One or more contacts not found or not owned by user')
  }

  // Verify company ownership if provided
  if (payload.updates.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: payload.updates.companyId, ownerUserId: userId }
    })
    if (!company) {
      throw new Error('Company not found or not owned by user')
    }
  }

  // Prepare update data
  const updateData: any = {}
  if (payload.updates.title !== undefined) updateData.title = payload.updates.title
  if (payload.updates.companyId !== undefined) updateData.companyId = payload.updates.companyId

  // Bulk update
  await prisma.contact.updateMany({
    where: {
      id: { in: payload.contactIds },
      ownerUserId: userId
    },
    data: updateData
  })

  // Update embeddings for all affected contacts
  for (const contactId of payload.contactIds) {
    const updatedContact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { company: true }
    })
    if (updatedContact) {
      await onEntityMutated('CONTACT', contactId, userId, {
        ...updatedContact,
        companyName: updatedContact.company?.name
      } as unknown as Record<string, unknown>)
    }
  }

  revalidatePath('/contacts')
}

// ============================================
// Embedding Sync
// ============================================

export async function syncEmbeddings() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const { syncAllEmbeddings } = await import('@/lib/embeddings')
  return await syncAllEmbeddings(session.user.id)
}
