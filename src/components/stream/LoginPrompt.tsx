'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/Button'

export interface LoginAsk {
  title: string
  // Runs on "Agora não", for actions that also work without an account
  onSkip?: () => void
}

// Asks a signed-out viewer to log in, over the video so the live keeps playing. Logging in
// or signing up brings them back to this live.
export function LoginPrompt({ ask, onClose }: { ask: LoginAsk | null; onClose: () => void }) {
  const next = encodeURIComponent(usePathname())
  const skip = () => {
    ask?.onSkip?.()
    onClose()
  }
  return (
    <Dialog.Root open={!!ask} onOpenChange={open => !open && skip()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-md shadow-card p-5 text-center">
          <Dialog.Title className="text-gray-900 font-semibold text-lg mb-1">{ask?.title}</Dialog.Title>
          <Dialog.Description className="text-gray-500 text-sm mb-4">
            Crie sua conta grátis para comentar, dar lances e comprar ao vivo.
          </Dialog.Description>
          <div className="space-y-2">
            <Link href={`/signup?next=${next}`} className="block">
              <Button fullWidth>Criar conta</Button>
            </Link>
            <Link href={`/login?next=${next}`} className="block">
              <Button fullWidth variant="secondary">
                Já tenho conta
              </Button>
            </Link>
            <button onClick={skip} className="w-full py-2 text-gray-500 text-sm hover:underline">
              Agora não
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
