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
import { DealStage } from '@prisma/client'
import { Target, DollarSign } from 'lucide-react'
import { getDeals } from '@/lib/actions/deals'

const stageColors = {
  [DealStage.LEAD]: 'bg-gray-100 text-gray-800',
  [DealStage.QUALIFIED]: 'bg-blue-100 text-blue-800',
  [DealStage.PROPOSAL]: 'bg-yellow-100 text-yellow-800',
  [DealStage.NEGOTIATION]: 'bg-orange-100 text-orange-800',
  [DealStage.WON]: 'bg-green-100 text-green-800',
  [DealStage.LOST]: 'bg-red-100 text-red-800',
}

export async function DealsTable() {
  const deals = await getDeals()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Close Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="text-muted-foreground">
                  No deals found.{' '}
                  <Link
                    href="/deals/new"
                    className="text-primary hover:underline"
                  >
                    Add your first deal
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="hover:text-primary"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={stageColors[deal.stage]}>
                    {deal.stage.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {deal.amountCents ? (
                    <div className="flex items-center">
                      <DollarSign className="mr-1 h-3 w-3 text-muted-foreground" />
                      ${(deal.amountCents / 100).toLocaleString()}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/companies/${deal.company.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {deal.company.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {deal.contact.firstName} {deal.contact.lastName}
                  </Link>
                </TableCell>
                <TableCell>
                  {deal.closeDate ? (
                    format(new Date(deal.closeDate), 'MMM dd, yyyy')
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/deals/${deal.id}`}>View</Link>
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