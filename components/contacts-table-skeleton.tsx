import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ContactsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-32" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-24" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-8 bg-muted rounded animate-pulse w-12 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}