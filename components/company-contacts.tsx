import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Mail, Phone } from 'lucide-react'
import { format } from 'date-fns'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  title: string | null
  createdAt: Date
}

interface CompanyContactsProps {
  companyId: string
  contacts: Contact[]
}

export function CompanyContacts({ companyId, contacts }: CompanyContactsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Contacts ({contacts.length})
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contacts/new?companyId=${companyId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No contacts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding a contact for this company.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href={`/contacts/new?companyId=${companyId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {contact.firstName[0]}
                        {contact.lastName[0]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.title && (
                      <p className="text-sm text-muted-foreground">
                        {contact.title}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-1">
                      {contact.email && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="mr-1 h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Phone className="mr-1 h-3 w-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Added {format(new Date(contact.createdAt), 'MMM dd')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}