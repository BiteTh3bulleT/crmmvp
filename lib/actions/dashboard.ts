import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DealStage, TaskStatus } from '@prisma/client'

export async function getDashboardStats() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Get current month start and end
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [
    openDealsCount,
    wonThisMonthCount,
    tasksDueSoonCount,
    totalContactsCount,
  ] = await Promise.all([
    // Count of deals that are not won or lost
    prisma.deal.count({
      where: {
        ownerUserId: userId,
        stage: {
          notIn: [DealStage.WON, DealStage.LOST]
        }
      }
    }),

    // Count of deals won this month
    prisma.deal.count({
      where: {
        ownerUserId: userId,
        stage: DealStage.WON,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      }
    }),

    // Count of tasks due within 7 days that are still open
    prisma.task.count({
      where: {
        ownerUserId: userId,
        status: TaskStatus.OPEN,
        dueAt: {
          not: null,
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      }
    }),

    // Total contacts count
    prisma.contact.count({
      where: {
        ownerUserId: userId
      }
    })
  ])

  return {
    openDealsCount,
    wonThisMonthCount,
    tasksDueSoonCount,
    totalContactsCount,
  }
}