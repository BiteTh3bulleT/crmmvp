import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

const updateCompanySchema = createCompanySchema.partial()

export type CreateCompanyInput = z.infer<typeof createCompanySchema>
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export async function getCompanies(search?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = {
    ownerUserId: session.user.id,
    ...(search && {
      name: {
        contains: search,
        mode: 'insensitive' as const,
      },
    }),
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
  })

  return companies
}

export async function getCompany(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const company = await prisma.company.findFirst({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    include: {
      contacts: {
        orderBy: { createdAt: 'desc' },
      },
      deals: {
        orderBy: { createdAt: 'desc' },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!company) {
    throw new Error('Company not found')
  }

  return company
}

export async function createCompany(input: CreateCompanyInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = createCompanySchema.parse(input)

  const company = await prisma.company.create({
    data: {
      ...validatedData,
      website: validatedData.website || null,
      phone: validatedData.phone || null,
      address: validatedData.address || null,
      ownerUserId: session.user.id,
    },
  })

  revalidatePath('/companies')
  return company
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const validatedData = updateCompanySchema.parse(input)

  const company = await prisma.company.update({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    data: {
      ...validatedData,
      website: validatedData.website || null,
      phone: validatedData.phone || null,
      address: validatedData.address || null,
    },
  })

  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
  return company
}

export async function deleteCompany(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  await prisma.company.delete({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  revalidatePath('/companies')
}