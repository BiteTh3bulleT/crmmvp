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
import { getCompanies } from '@/lib/actions/companies'
import { ExternalLink, Users, Target } from 'lucide-react'

export async function CompaniesTable() {
  const companies = await getCompanies()

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Deals</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="text-muted-foreground">
                  No companies found.{' '}
                  <Link
                    href="/companies/new"
                    className="text-primary hover:underline"
                  >
                    Add your first company
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/companies/${company.id}`}
                    className="hover:text-primary"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {company.phone || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Users className="mr-1 h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">
                      {company._count.contacts}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Target className="mr-1 h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">
                      {company._count.deals}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(company.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/companies/${company.id}`}>View</Link>
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