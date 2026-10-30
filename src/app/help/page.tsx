import Link from 'next/link'
import { TextPage } from '@/components/layout/TextPage'
import { COMPANY } from '@/lib/company'
import { PIX_DISCOUNT_PERCENT } from '@/lib/pricing'
import { formatCurrency } from '@/lib/utils'

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Como compro durante uma live?',
    a: 'Toque no produto mostrado na live, escolha tamanho e cor quando houver e toque em "Comprar agora" ou "Adicionar". Você finaliza no carrinho.',
  },
  {
    q: 'Quais as formas de pagamento?',
    a: (
      <>
        PIX (com {PIX_DISCOUNT_PERCENT}% de desconto), cartão de crédito em até 12x e boleto. Veja{' '}
        <Link href="/payment-methods">formas de pagamento</Link>.
      </>
    ),
  },
  {
    q: 'Quanto custa o frete?',
    a: 'O frete é calculado pelo seu CEP no checkout, com as opções dos Correios e transportadoras parceiras. Você escolhe entre a mais econômica e a mais rápida. Se o carrinho tem produtos de vendedores diferentes, cada um envia o seu e o frete é a soma dos envios.',
  },
  {
    q: 'Onde acompanho meu pedido?',
    a: (
      <>
        Em <Link href="/orders">Meus pedidos</Link>. Você também recebe uma notificação a cada mudança de status.
      </>
    ),
  },
  {
    q: 'Posso devolver um produto?',
    a: 'Sim. Pelo Código de Defesa do Consumidor, você pode desistir de uma compra feita pela internet em até 7 dias depois de receber o produto, sem precisar justificar, e recebe o valor de volta. Produtos com defeito podem ser trocados dentro da garantia.',
  },
  {
    q: 'Como funcionam os leilões?',
    a: 'Durante a live, dê um lance maior que o atual somado ao incremento mínimo. Quem tiver o maior lance quando o tempo acabar leva o produto. Avisamos você se alguém cobrir seu lance.',
  },
  {
    q: 'Como começo a vender?',
    a: (
      <>
        Acesse o <Link href="/seller/dashboard">painel do vendedor</Link>, ative sua conta de vendedor, cadastre produtos e agende sua primeira live.
      </>
    ),
  },
  {
    q: 'Esqueci minha senha',
    a: `Escreva para ${COMPANY.supportEmail} a partir do e-mail da sua conta. Se você entrou com o Google, use o botão "Continuar com Google".`,
  },
]

export default function HelpPage() {
  return (
    <TextPage title="Ajuda">
      <div className="divide-y divide-gray-100 -mx-2">
        {FAQ.map(item => (
          <details key={item.q} className="group px-2 py-3">
            <summary className="cursor-pointer list-none flex justify-between gap-4 text-gray-900 font-medium">
              {item.q}
              <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-2 text-gray-600">{item.a}</p>
          </details>
        ))}
      </div>
      <h2>Ainda precisa de ajuda?</h2>
      <p>
        Fale com a gente pelo e-mail {COMPANY.supportEmail}. Leia também os <Link href="/terms">Termos de uso</Link> e a{' '}
        <Link href="/privacy">Política de privacidade</Link>.
      </p>
    </TextPage>
  )
}
