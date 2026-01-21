import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ContactsTable } from '@/components/contacts-table'
import { ContactsTableSkeleton } from '@/components/contacts-table-skeleton'

export default function ContactsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact relationships and communications.
          </p>
        </div>
        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ContactsTableSkeleton />}>
        <ContactsTable />
      </Suspense>
    </div>
  )
}