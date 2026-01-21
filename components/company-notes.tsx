'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import { NoteForm } from '@/components/note-form'
import { ActivityTimeline } from '@/components/activity-timeline'
import { getActivityTimeline } from '@/lib/actions/notes'
import { RelatedType } from '@prisma/client'

interface Note {
  id: string
  body: string
  createdAt: Date
}

interface CompanyNotesProps {
  companyId: string
  notes: Note[]
}

export function CompanyNotes({ companyId, notes }: CompanyNotesProps) {
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [activities, setActivities] = useState<any[]>([])

  // Load activities on mount
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getActivityTimeline(RelatedType.COMPANY, companyId)
        setActivities(data)
      } catch (error) {
        console.error('Error loading activities:', error)
      }
    }
    loadActivities()
  }, [companyId])

  const handleNoteSuccess = () => {
    setShowNoteForm(false)
    // Reload activities
    const loadActivities = async () => {
      try {
        const data = await getActivityTimeline(RelatedType.COMPANY, companyId)
        setActivities(data)
      } catch (error) {
        console.error('Error reloading activities:', error)
      }
    }
    loadActivities()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Notes & Activity
            </CardTitle>
            {!showNoteForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoteForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showNoteForm && (
            <div className="mb-6">
              <NoteForm
                relatedType={RelatedType.COMPANY}
                relatedId={companyId}
                onSuccess={handleNoteSuccess}
                onCancel={() => setShowNoteForm(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {activities ? (
        <ActivityTimeline
          activities={activities}
          relatedType={RelatedType.COMPANY}
          relatedId={companyId}
        />
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
              <p className="mt-2 text-sm text-muted-foreground">Loading activity...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}