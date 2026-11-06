'use client'

import Link from 'next/link'
import { MapPin, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SetupState } from './SetupChecklist'

// Shown when the seller does something that needs buyers to be able to buy (going live,
// creating an auction) while their shop isn't set up yet. Says what's missing and goes
// straight to it; onContinue (when given) lets them go ahead anyway.
export function SetupGate({
  setup,
  title,
  text,
  onClose,
  onContinue,
  continueLabel,
}: {
  setup: SetupState
  title: string
  text: string
  onClose: () => void
  onContinue?: () => void
  continueLabel?: string
}) {
  const missing = [
    setup.wallet === false && { key: 'wallet', icon: Wallet, label: 'Onde receber suas vendas (Wallet ID do Asaas)' },
    !setup.zip && { key: 'zip', icon: MapPin, label: 'O CEP de onde você envia os pedidos' },
  ].filter(Boolean) as { key: string; icon: typeof Wallet; label: string }[]

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-gate-title"
        className="w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="setup-gate-title" className="text-gray-900 font-semibold text-lg">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-1">{text}</p>
        <ul className="mt-4 space-y-2">
          {missing.map(m => (
            <li key={m.key} className="flex items-center gap-2 text-gray-900 text-sm">
              <m.icon className="w-4 h-4 text-sunset-gold shrink-0" />
              {m.label}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 mt-5">
          <Link
            href={`/seller/settings?focus=${missing[0]?.key ?? 'zip'}`}
            className="inline-flex items-center justify-center h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-600 transition-colors"
          >
            Resolver agora
          </Link>
          {onContinue && (
            <Button variant="ghost" fullWidth onClick={onContinue}>
              {continueLabel ?? 'Continuar mesmo assim'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
