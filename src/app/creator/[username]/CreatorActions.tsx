'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUserStore } from '@/store'
import { loginHrefHere } from '@/lib/utils'

// Follow and share on a creator's page. Guests are sent to log in and come back here.
export function CreatorActions({ creatorId, name }: { creatorId: string; name: string }) {
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const self = useUserStore(s => s.user?.id === creatorId)
  const following = useUserStore(s => s.followedHosts.includes(creatorId))
  const followHost = useUserStore(s => s.followHost)
  const unfollowHost = useUserStore(s => s.unfollowHost)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `${name} na Luma`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // The share sheet was closed
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!self && (
        <Button
          size="sm"
          variant={following ? 'secondary' : 'primary'}
          aria-pressed={following}
          onClick={() => {
            if (!isAuthenticated) window.location.href = loginHrefHere()
            else if (following) unfollowHost(creatorId)
            else followHost(creatorId)
          }}
        >
          {following ? 'Seguindo' : 'Seguir'}
        </Button>
      )}
      <button
        onClick={share}
        aria-label={copied ? 'Link copiado' : 'Compartilhar'}
        title={copied ? 'Link copiado' : 'Compartilhar'}
        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-tropical-green" /> : <Share2 className="w-4 h-4 text-gray-500" />}
      </button>
    </div>
  )
}
