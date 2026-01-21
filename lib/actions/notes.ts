import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { RelatedType } from '@prisma/client'

const createNoteSchema = z.object({
  body: z.string().min(1, 'Note body is required'),
  relatedType: z.nativeEnum(RelatedType),
  relatedId: z.string().min(1, 'Related ID is required'),
})

const updateNoteSchema = createNoteSchema.partial()

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

export async function getNotes(relatedType?: RelatedType, relatedId?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = {
    ownerUserId: session.user.id,
    ...(relatedType && relatedId && {
      relatedType,
      relatedId,
    }),
  }

  return await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getActivityTimeline(relatedType: RelatedType, relatedId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get notes for this entity
  const notes = await prisma.note.findMany({
    where: {
      ownerUserId: session.user.id,
      relatedType,
      relatedId,
    },
    orderBy: { createdAt: 'desc' },
  })

  // For now, just return notes as activities
  // In a full implementation, this could include:
  // - Task completions
  // - Deal stage changes
  // - Contact updates
  // - Email communications
  // - Meeting notes
  // etc.

  const activities = notes.map(note => ({
    id: note.id,
    type: 'note' as const,
    title: 'Note added',
    description: note.body.length > 100 ? note.body.substring(0, 100) + '...' : note.body,
    createdAt: note.createdAt,
    data: note,
  }))

  return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function createNote(input: CreateNoteInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = createNoteSchema.parse(input)

  const note = await prisma.note.create({
    data: {
      ...validatedData,
      ownerUserId: session.user.id,
    },
  })

  // Revalidate relevant pages
  if (validatedData.relatedType === RelatedType.COMPANY) {
    revalidatePath(`/companies/${validatedData.relatedId}`)
  } else if (validatedData.relatedType === RelatedType.CONTACT) {
    revalidatePath(`/contacts/${validatedData.relatedId}`)
  } else if (validatedData.relatedType === RelatedType.DEAL) {
    revalidatePath(`/deals/${validatedData.relatedId}`)
  }

  return note
}

export async function updateNote(id: string, input: UpdateNoteInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = updateNoteSchema.parse(input)

  const note = await prisma.note.update({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    data: validatedData,
  })

  // Revalidate relevant pages
  revalidatePath(`/companies/${note.relatedId}`)
  revalidatePath(`/contacts/${note.relatedId}`)
  revalidatePath(`/deals/${note.relatedId}`)

  return note
}

export async function deleteNote(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Atomic delete with ownership check
  const note = await prisma.note.delete({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  // Revalidate relevant pages
  revalidatePath(`/companies/${note.relatedId}`)
  revalidatePath(`/contacts/${note.relatedId}`)
  revalidatePath(`/deals/${note.relatedId}`)

  return note
}

export async function searchEntities(query: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id
  const searchTerm = query.toLowerCase().trim()

  if (!searchTerm) {
    return { companies: [], contacts: [], deals: [], tasks: [] }
  }

  // Search companies
  const companies = await prisma.company.findMany({
    where: {
      ownerUserId: userId,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { website: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      website: true,
      phone: true,
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
    take: 10,
  })

  // Search contacts
  const contacts = await prisma.contact.findMany({
    where: {
      ownerUserId: userId,
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { company: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
    take: 10,
  })

  // Search deals
  const deals = await prisma.deal.findMany({
    where: {
      ownerUserId: userId,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { company: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { contact: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }},
      ],
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    take: 10,
  })

  // Search tasks
  const tasks = await prisma.task.findMany({
    where: {
      ownerUserId: userId,
      title: { contains: searchTerm, mode: 'insensitive' },
    },
    take: 10,
  })

  return {
    companies,
    contacts,
    deals,
    tasks,
  }
}