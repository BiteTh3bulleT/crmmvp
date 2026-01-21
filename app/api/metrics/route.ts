import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStats, getUserStats } from '@/lib/usage-metrics'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = parseInt(searchParams.get('hours') || '24')
    const userOnly = searchParams.get('userOnly') === 'true'

    if (userOnly) {
      // Return user-specific metrics
      const userStats = getUserStats(session.user.id, timeRange)
      return NextResponse.json({
        userId: session.user.id,
        timeRangeHours: timeRange,
        ...userStats
      })
    } else {
      // Return global metrics (admin only)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (!user || user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Admin access required for global metrics' },
          { status: 403 }
        )
      }

      const stats = getStats(timeRange)
      return NextResponse.json({
        timeRangeHours: timeRange,
        ...stats
      })
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}