import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NavigationLayout } from '@/components/navigation-layout'
import { AssistantPanel } from '@/components/assistant/assistant-panel'

export const dynamic = 'force-dynamic'

export default async function AssistantPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Fetch existing threads for the user
  const threads = await prisma.assistantThread.findMany({
    where: { ownerUserId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  // Transform dates for serialization
  const serializedThreads = threads.map(thread => ({
    ...thread,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messages: thread.messages.map(msg => ({
      ...msg,
      role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
      createdAt: msg.createdAt
    }))
  }))

  return (
    <NavigationLayout>
      <AssistantPanel initialThreads={serializedThreads} />
    </NavigationLayout>
  )
}
