import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
})

const updateContactSchema = createContactSchema.partial()

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>

export async function getContacts(search?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = {
    ownerUserId: session.user.id,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { company: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return contacts
}

export async function getContact(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    include: {
      company: true,
      deals: {
        orderBy: { createdAt: 'desc' },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!contact) {
    throw new Error('Contact not found')
  }

  return contact
}

export async function createContact(input: CreateContactInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = createContactSchema.parse(input)

  const contact = await prisma.contact.create({
    data: {
      ...validatedData,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      title: validatedData.title || null,
      companyId: validatedData.companyId || null,
      ownerUserId: session.user.id,
    },
    include: {
      company: true,
    },
  })

  revalidatePath('/contacts')
  return contact
}

export async function updateContact(id: string, input: UpdateContactInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = updateContactSchema.parse(input)

  const contact = await prisma.contact.update({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    data: {
      ...validatedData,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      title: validatedData.title || null,
      companyId: validatedData.companyId || null,
    },
    include: {
      company: true,
    },
  })

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)
  return contact
}

export async function deleteContact(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  await prisma.contact.delete({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  revalidatePath('/contacts')
}

export async function getCompaniesForSelect() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return await prisma.company.findMany({
    where: {
      ownerUserId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  })
}