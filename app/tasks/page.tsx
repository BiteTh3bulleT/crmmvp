import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { TasksTable } from '@/components/tasks-table'
import { TasksTableSkeleton } from '@/components/tasks-table-skeleton'

export default function TasksPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and stay organized.
          </p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TasksTableSkeleton />}>
        <TasksTable />
      </Suspense>
    </div>
  )
}