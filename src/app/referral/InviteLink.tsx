'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'

export function InviteLink({ username }: { username: string }) {
  // The origin is only known in the browser
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => setLink(`${window.location.origin}/signup${username ? `?ref=${encodeURIComponent(username)}` : ''}`), [username])

  const message = `Vem comprar ao vivo comigo no VivoBuy! ${link}`

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'VivoBuy', text: message, url: link }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className={`${inputClass} bg-gray-50`} value={link} readOnly aria-label="Seu link de convite" />
        <Button variant="secondary" onClick={copy} leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <Button fullWidth onClick={share} leftIcon={<Share2 className="w-4 h-4" />}>
        Compartilhar
      </Button>
    </div>
  )
}
