'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Points at one part of a page, for "show me where": scrolls it to the middle of the screen,
// rings it in orange for a few seconds, puts a tip above it and focuses its first field.
export function Spotlight({ active, tip, children }: { active: boolean; tip: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [glow, setGlow] = useState(active)

  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    // After the page has laid out
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.querySelector<HTMLInputElement>('input, textarea')?.focus({ preventScroll: true })
    }, 150)
    const off = setTimeout(() => setGlow(false), 6000)
    return () => {
      clearTimeout(t)
      clearTimeout(off)
    }
  }, [active])

  return (
    <div ref={ref} className="relative scroll-mt-24">
      {active && (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-white text-sm font-semibold px-3 py-1.5 shadow-card">
          <ArrowDown className="w-4 h-4" />
          {tip}
        </p>
      )}
      <div className={cn('relative rounded-md', active && 'ring-2 ring-primary')}>
        {children}
        {/* Only the outline pulses, so the text stays readable */}
        {glow && <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-lg ring-4 ring-primary/50 animate-pulse" />}
      </div>
    </div>
  )
}
