import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { TaskStatus, RelatedType } from '@prisma/client'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueAt: z.date().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.OPEN),
  relatedType: z.nativeEnum(RelatedType).optional(),
  relatedId: z.string().optional(),
})

const updateTaskSchema = createTaskSchema.partial()

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export async function getTasks(search?: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = {
    ownerUserId: session.user.id,
    ...(search && {
      title: {
        contains: search,
        mode: 'insensitive' as const,
      },
    }),
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: 'asc' }, // OPEN first, then DONE
      { dueAt: 'asc' }, // Earlier due dates first
    ],
    include: {
      relatedCompany: {
        select: {
          id: true,
          name: true,
        },
      },
      relatedContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      relatedDeal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  return tasks
}

export async function createTask(input: CreateTaskInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const task = await prisma.task.create({
    data: {
      ...input,
      ownerUserId: session.user.id,
    },
    include: {
      relatedCompany: {
        select: {
          id: true,
          name: true,
        },
      },
      relatedContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      relatedDeal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  revalidatePath('/tasks')
  return task
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Ensure the task belongs to the user
  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  if (!existingTask) {
    throw new Error('Task not found')
  }

  const task = await prisma.task.update({
    where: { id },
    data: input,
    include: {
      relatedCompany: {
        select: {
          id: true,
          name: true,
        },
      },
      relatedContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      relatedDeal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  revalidatePath('/tasks')
  return task
}

export async function deleteTask(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Ensure the task belongs to the user
  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      ownerUserId: session.user.id,
    },
  })

  if (!existingTask) {
    throw new Error('Task not found')
  }

  await prisma.task.delete({
    where: { id },
  })

  revalidatePath('/tasks')
}