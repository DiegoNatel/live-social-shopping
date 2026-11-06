'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// "Voltar" to the page the visitor came from. When there is none inside the site (link opened
// directly or in a new tab), it goes to `fallback` instead of leaving the site.
export function BackLink({ fallback, label = 'Voltar' }: { fallback: string; label?: string }) {
  const router = useRouter()

  const goBack = () => {
    let cameFromSite = false
    try {
      // Reached by a link inside the site: the page first loaded in this tab was another one
      const loaded = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (loaded && new URL(loaded.name).pathname !== window.location.pathname) cameFromSite = true
      // Opened by a full page load from another page of the site
      else if (document.referrer && new URL(document.referrer).origin === window.location.origin) cameFromSite = true
    } catch {}
    if (cameFromSite && window.history.length > 1) router.back()
    else router.push(fallback)
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-0.5 -ml-1 text-sky-blue text-sm font-medium hover:underline"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
