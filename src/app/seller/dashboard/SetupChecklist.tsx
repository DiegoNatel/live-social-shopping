import Link from 'next/link'
import { CheckCircle2, ChevronRight, MapPin, Wallet } from 'lucide-react'

export interface SetupState {
  // null while online payments are off (no wallet needed)
  wallet: boolean | null
  zip: boolean
}

export const setupComplete = (s: SetupState) => s.wallet !== false && s.zip

// What's still missing before buyers can buy from this seller, with a button that goes
// straight to the field to fill (/seller/settings?focus=...). Gone once everything is done.
export function SetupChecklist({ setup }: { setup: SetupState }) {
  if (setupComplete(setup)) return null
  const steps = [
    setup.wallet !== null && {
      key: 'wallet',
      icon: Wallet,
      done: setup.wallet,
      title: 'Onde receber suas vendas',
      text: 'Cole o Wallet ID da sua conta Asaas.',
    },
    { key: 'zip', icon: MapPin, done: setup.zip, title: 'De onde você envia', text: 'Informe o CEP de onde saem seus pacotes.' },
  ].filter(Boolean) as { key: string; icon: typeof Wallet; done: boolean; title: string; text: string }[]
  const done = steps.filter(s => s.done).length

  return (
    <section className="rounded-md bg-white shadow-card border-l-4 border-sunset-gold p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-gray-900 font-semibold">Falta pouco para vender</p>
        <span className="text-gray-500 text-sm shrink-0">
          {done} de {steps.length} feitos
        </span>
      </div>
      <p className="text-gray-500 text-sm mt-1">
        Seus produtos já aparecem para os compradores, mas só podem ser comprados depois destes passos.
      </p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
        <div className="h-full bg-sunset-gold rounded-full" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 divide-y divide-gray-100">
        {steps.map(step => (
          <li key={step.key} className="flex items-center gap-3 py-3">
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-tropical-green shrink-0" />
            ) : (
              <step.icon className="w-5 h-5 text-sunset-gold shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className={step.done ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}>{step.title}</p>
              {!step.done && <p className="text-gray-500 text-sm">{step.text}</p>}
            </div>
            {!step.done && (
              <Link
                href={`/seller/settings?focus=${step.key}`}
                className="shrink-0 inline-flex items-center gap-0.5 h-9 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                Fazer agora
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
