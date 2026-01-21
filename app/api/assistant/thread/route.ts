import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { recordThreadCreated, recordThreadDeleted } from '@/lib/usage-metrics'
import { threadTitleSchema } from '@/lib/validation'
import { safeDeleteWithOwnership } from '@/lib/db-utils'

// Sanitize thread title to prevent XSS
function sanitizeTitle(title: string): string {
  return title
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 200) // Enforce max length
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.error('Thread POST: No session found', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id
      })
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    return await withRateLimit(request, session.user.id, RATE_LIMITS.ASSISTANT_THREAD, async () => {
      try {
        // Verify user exists in database
        const user = await prisma.user.findUnique({
          where: { id: session.user.id }
        })

        if (!user) {
          return NextResponse.json(
            { error: 'User not found. Please log in again.' },
            { status: 401 }
          )
        }

        let title: string | undefined

        try {
          const body = await request.json()
          if (body.title) {
            // Validate and sanitize title
            const validationResult = threadTitleSchema.safeParse(body.title)
            if (!validationResult.success) {
              return NextResponse.json(
                { error: 'Invalid title: ' + validationResult.error.errors[0]?.message },
                { status: 400 }
              )
            }
            title = sanitizeTitle(body.title)
          }
        } catch {
          // No body or invalid JSON, that's fine
        }

        const thread = await prisma.assistantThread.create({
          data: {
            ownerUserId: session.user.id,
            title: title || `Chat ${new Date().toLocaleDateString()}`
          }
        })

        // Record thread creation metrics
        recordThreadCreated(session.user.id, thread.id)

        return NextResponse.json(thread)
      } catch (error) {
        console.error('Create thread error:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        })
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
          },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('POST thread route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const threads = await prisma.assistantThread.findMany({
      where: { ownerUserId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json(threads)
  } catch (error) {
    console.error('Get threads error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json(
        { error: 'Missing threadId' },
        { status: 400 }
      )
    }

    // Atomic delete with ownership check to prevent TOCTOU race conditions
    const result = await safeDeleteWithOwnership('assistantThread', threadId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete thread' },
        { status: 500 }
      )
    }

    if (!result.deleted) {
      return NextResponse.json(
        { error: 'Thread not found or unauthorized' },
        { status: 404 }
      )
    }

    // Record thread deletion metrics
    recordThreadDeleted(session.user.id, threadId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete thread error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
