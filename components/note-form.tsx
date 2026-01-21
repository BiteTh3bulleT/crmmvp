'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, FileText } from 'lucide-react'
import { RelatedType } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { getUserFriendlyError } from '@/lib/error-messages'

const createNoteSchema = z.object({
  body: z.string().min(1, 'Note body is required'),
})

type CreateNoteInput = z.infer<typeof createNoteSchema>

interface NoteFormProps {
  relatedType: RelatedType
  relatedId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function NoteForm({ relatedType, relatedId, onSuccess, onCancel }: NoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
  })

  const onSubmit = async (data: CreateNoteInput) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          relatedType,
          relatedId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create note')
      }

      reset()
      toast({
        title: "Note added",
        description: "Your note has been saved successfully.",
        variant: "success",
      })
      onSuccess?.()
    } catch (error) {
      console.error('Error creating note:', error)
      const friendlyError = getUserFriendlyError(error, {
        action: 'create',
        entity: 'note'
      })
      toast({
        title: friendlyError.title,
        description: friendlyError.message + (friendlyError.suggestion ? ` ${friendlyError.suggestion}` : ''),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm">
            <FileText className="mr-2 h-4 w-4" />
            Add Note
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="body">Note</Label>
            <Textarea
              id="body"
              {...register('body')}
              placeholder="Enter your note here..."
              rows={4}
            />
            {errors.body && (
              <p className="text-sm text-destructive">{errors.body.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}