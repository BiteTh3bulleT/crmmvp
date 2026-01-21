'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Target } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { getUserFriendlyError } from '@/lib/error-messages'
import { DealStage } from '@prisma/client'

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amountCents: z.number().optional(),
  stage: z.nativeEnum(DealStage),
  closeDate: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
})

type CreateDealInput = z.infer<typeof createDealSchema>

function NewDealForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const companyId = searchParams.get('companyId')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateDealInput>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      stage: DealStage.LEAD,
      companyId: companyId || undefined,
    },
  })

  useEffect(() => {
    if (companyId) {
      setValue('companyId', companyId)
    }
  }, [companyId, setValue])

  const onSubmit = async (data: CreateDealInput) => {
    setIsSubmitting(true)

    try {
      const payload: any = {
        title: data.title,
        stage: data.stage,
        amountCents: data.amountCents ? Math.round(data.amountCents * 100) : undefined,
        closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
        companyId: data.companyId || undefined,
        contactId: data.contactId || undefined,
      }

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create deal')
      }

      const deal = await response.json()
      toast({
        title: "Deal created",
        description: `${deal.title} has been added to your CRM.`,
      })
      router.push(`/deals`)
    } catch (error) {
      console.error('Error creating deal:', error)
      const friendlyError = getUserFriendlyError(error, {
        action: 'create',
        entity: 'deal'
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
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/deals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Deal</h1>
          <p className="text-muted-foreground">
            Create a new deal in your CRM.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Deal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter deal title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountCents">Amount ($)</Label>
                <Input
                  id="amountCents"
                  type="number"
                  step="0.01"
                  {...register('amountCents', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.amountCents && (
                  <p className="text-sm text-destructive">{errors.amountCents.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage *</Label>
                <select
                  id="stage"
                  {...register('stage')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={DealStage.LEAD}>Lead</option>
                  <option value={DealStage.QUALIFIED}>Qualified</option>
                  <option value={DealStage.PROPOSAL}>Proposal</option>
                  <option value={DealStage.NEGOTIATION}>Negotiation</option>
                  <option value={DealStage.WON}>Won</option>
                  <option value={DealStage.LOST}>Lost</option>
                </select>
                {errors.stage && (
                  <p className="text-sm text-destructive">{errors.stage.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="closeDate">Expected Close Date</Label>
                <Input
                  id="closeDate"
                  type="date"
                  {...register('closeDate')}
                />
                {errors.closeDate && (
                  <p className="text-sm text-destructive">{errors.closeDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID (optional)</Label>
                <Input
                  id="companyId"
                  {...register('companyId')}
                  placeholder="Company ID"
                  defaultValue={companyId || ''}
                />
                {errors.companyId && (
                  <p className="text-sm text-destructive">{errors.companyId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactId">Contact ID (optional)</Label>
                <Input
                  id="contactId"
                  {...register('contactId')}
                  placeholder="Contact ID"
                />
                {errors.contactId && (
                  <p className="text-sm text-destructive">{errors.contactId.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Deal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NewDealPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewDealForm />
    </Suspense>
  )
}
