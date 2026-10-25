import { CreditCard, FileText } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { PixIcon } from '@/components/ui/Icons'
import { PIX_DISCOUNT_PERCENT } from '@/lib/pricing'

const METHODS = [
  {
    icon: <PixIcon className="w-6 h-6 text-tropical-green" />,
    name: 'PIX',
    text: `Aprovação na hora e ${PIX_DISCOUNT_PERCENT}% de desconto. Você recebe o QR Code ao finalizar o pedido.`,
  },
  {
    icon: <CreditCard className="w-6 h-6 text-sky-blue" />,
    name: 'Cartão de crédito',
    text: 'Em até 12x. Os dados do cartão são digitados no momento da compra.',
  },
  {
    icon: <FileText className="w-6 h-6 text-gray-500" />,
    name: 'Boleto',
    text: 'Compensação em até 3 dias úteis. O pedido é separado após a confirmação.',
  },
]

export default function PaymentMethodsPage() {
  return (
    <MainLayout headerProps={{ title: 'Formas de pagamento' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <p className="text-gray-500 text-sm">Você escolhe como pagar ao finalizar cada pedido.</p>
        {METHODS.map(m => (
          <div key={m.name} className="bg-white rounded-md shadow-card p-4 flex gap-3">
            <div className="flex-shrink-0">{m.icon}</div>
            <div>
              <p className="text-gray-900 font-medium text-sm">{m.name}</p>
              <p className="text-gray-500 text-sm">{m.text}</p>
            </div>
          </div>
        ))}
        <p className="text-gray-400 text-xs">
          Ainda não guardamos cartões. Quando for possível salvar um cartão para compras mais rápidas, ele aparecerá aqui.
        </p>
      </div>
    </MainLayout>
  )
}
