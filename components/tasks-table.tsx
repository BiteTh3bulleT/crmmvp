import Link from 'next/link'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TaskStatus, RelatedType } from '@prisma/client'
import { CheckSquare, Clock } from 'lucide-react'
import { getTasks } from '@/lib/actions/tasks'

const statusColors = {
  [TaskStatus.OPEN]: 'bg-blue-100 text-blue-800',
  [TaskStatus.DONE]: 'bg-green-100 text-green-800',
}

export async function TasksTable() {
  const tasks = await getTasks()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Related</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="text-muted-foreground">
                  No tasks found.{' '}
                  <Link
                    href="/tasks/new"
                    className="text-primary hover:underline"
                  >
                    Add your first task
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="hover:text-primary"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {task.relatedType !== RelatedType.NONE ? (
                    <Badge variant="outline">
                      {task.relatedType.toLowerCase()} #{task.relatedId}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueAt ? (
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                      {format(new Date(task.dueAt), 'MMM dd, yyyy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[task.status]}>
                    {task.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/tasks/${task.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}