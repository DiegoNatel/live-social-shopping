'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'
import { cn } from '@/lib/utils'
import type { ReviewItem } from '@/lib/reviews'

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="Nota">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          className={cn(onChange && 'hover:scale-110 transition-transform')}
        >
          <Star className={cn('w-6 h-6', n <= value ? 'fill-sunset-gold text-sunset-gold' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const [review, setReview] = useState(item.review)
  const [editing, setEditing] = useState(!item.review)
  const [rating, setRating] = useState(item.review?.rating ?? 0)
  const [comment, setComment] = useState(item.review?.comment ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!rating) return setError('Escolha uma nota')
    setIsSaving(true)
    setError('')
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.productId, rating, comment }),
    })
    setIsSaving(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível salvar')
    }
    setReview({ rating, comment: comment.trim() || undefined, createdAt: new Date().toISOString() })
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-md shadow-card p-4 flex gap-3">
      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm font-medium truncate mb-1">{item.productName}</p>
        {editing ? (
          <div className="space-y-2">
            <Stars value={rating} onChange={setRating} />
            <textarea
              className={`${inputClass} h-20 py-2`}
              placeholder="Conte o que achou (opcional)"
              value={comment}
              maxLength={1000}
              onChange={e => setComment(e.target.value)}
            />
            {error && <p className="text-coral-pink text-xs">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} isLoading={isSaving}>
                {review ? 'Salvar' : 'Avaliar'}
              </Button>
              {review && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ) : (
          review && (
            <div>
              <Stars value={review.rating} />
              {review.comment && <p className="text-gray-600 text-sm mt-1">{review.comment}</p>}
              <button onClick={() => setEditing(true)} className="text-sky-blue text-xs hover:underline mt-1">
                Editar avaliação
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function ReviewList({ items }: { items: ReviewItem[] }) {
  const pending = items.filter(i => !i.review).length
  return (
    <div className="space-y-3">
      {pending > 0 && (
        <p className="text-gray-500 text-sm">
          {pending} {pending === 1 ? 'produto aguarda' : 'produtos aguardam'} sua avaliação.
        </p>
      )}
      {items.map(item => (
        <ReviewCard key={item.productId} item={item} />
      ))}
    </div>
  )
}
