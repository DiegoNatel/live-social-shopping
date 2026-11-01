'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/Button'
import { useUserStore } from '@/store'
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@/lib/report-reasons'
import { Flag } from 'lucide-react'

interface ReportButtonProps {
  type: ReportTarget
  id: string
  className: string
  iconClassName?: string
  // Text beside the flag; icon only without it
  label?: string
}

// Flag that opens the report dialog; signed-out visitors are sent to log in
export function ReportButton({ type, id, className, iconClassName = 'w-5 h-5', label }: ReportButtonProps) {
  const router = useRouter()
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setIsSending(true)
    setError('')
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, reason, details }),
    })
    setIsSending(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível enviar')
    }
    setSent(true)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Denunciar"
        className={className}
        onClick={e => {
          e.stopPropagation()
          if (isAuthenticated) setOpen(true)
          else router.push('/login')
        }}
      >
        <Flag className={iconClassName} />
        {label}
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
          <Dialog.Content
            onClick={e => e.stopPropagation()}
            className="fixed z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-md shadow-card p-5"
          >
            <Dialog.Title className="text-gray-900 font-semibold mb-3">Denunciar</Dialog.Title>
            {sent ? (
              <>
                <Dialog.Description className="text-gray-500 text-sm mb-4">Recebemos sua denúncia e vamos analisar. Obrigado por avisar.</Dialog.Description>
                <Button fullWidth onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </>
            ) : (
              <>
                <Dialog.Description className="text-gray-500 text-sm mb-3">Qual é o problema?</Dialog.Description>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value as ReportReason)}
                  aria-label="Motivo"
                  className="w-full h-10 px-2 rounded border border-gray-300 text-gray-900 text-sm mb-3 bg-white"
                >
                  <option value="">Escolha um motivo</option>
                  {Object.entries(REPORT_REASONS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
                <textarea
                  value={details}
                  maxLength={500}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Detalhes (opcional)"
                  className="w-full h-20 px-2 py-2 rounded border border-gray-300 text-gray-900 text-sm mb-3"
                />
                {error && <p className="text-coral-pink text-xs mb-2">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button fullWidth disabled={!reason} isLoading={isSending} onClick={send}>
                    Enviar
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
