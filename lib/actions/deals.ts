import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { DealStage } from '@prisma/client'

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amountCents: z.number().optional(),
  stage: z.nativeEnum(DealStage),
  closeDate: z.date().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
})

const updateDealSchema = createDealSchema.partial()

export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>

export async function getDeals(search?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = {
    ownerUserId: session.user.id,
    ...(search && {
      OR: [
        {
          title: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          company: {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        },
      ],
    }),
  }

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return deals
}

export async function createDeal(input: CreateDealInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const deal = await prisma.deal.create({
    data: {
      ...input,
      ownerUserId: session.user.id,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  revalidatePath('/deals')
  return deal
}

export async function updateDeal(id: string, input: UpdateDealInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Atomic update with ownership check
  const deal = await prisma.deal.update({
    where: {
      id,
      ownerUserId: session.user.id,
    },
    data: input,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  revalidatePath('/deals')
  return deal
}

export async function deleteDeal(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Atomic delete with ownership check
  await prisma.deal.delete({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  revalidatePath('/deals')
}