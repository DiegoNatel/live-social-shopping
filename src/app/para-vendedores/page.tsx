import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BarChart3,
  ChevronRight,
  Clock,
  CreditCard,
  Gavel,
  MessageCircle,
  PackagePlus,
  Radio,
  Smartphone,
  Truck,
  Users,
  Video,
  Wallet,
  Zap,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { MAX_INSTALLMENTS, PLATFORM_FEE_PERCENT } from '@/lib/fees'

export const dynamic = 'force-dynamic'

// Who's on the page decides where "Começar" goes: /vender sends guests to sign up and sellers to
// their dashboard, so this page never adds a step for someone who already decided
const STEPS = [
  {
    icon: PackagePlus,
    title: 'Cadastre um produto',
    text: 'Crie sua conta, tire uma foto e coloque preço e estoque. Leva um minuto.',
  },
  {
    icon: Radio,
    title: 'Entre ao vivo',
    text: 'Pelo celular mesmo. Mostre os produtos, converse no chat e fixe o que está apresentando.',
  },
  {
    icon: Wallet,
    title: 'Venda e receba',
    text: 'O comprador paga na hora pela Luma. Você envia o pedido e recebe sua parte.',
  },
]

const TOOLS = [
  { icon: Video, title: 'Live com a câmera do celular', text: 'Sem equipamento nem programa extra.' },
  { icon: MessageCircle, title: 'Chat ao vivo', text: 'Responda dúvidas enquanto mostra o produto.' },
  { icon: Gavel, title: 'Leilões', text: 'Os compradores dão lances durante a live.' },
  { icon: Zap, title: 'Ofertas relâmpago', text: 'Desconto por tempo limitado, só para quem está assistindo.' },
  { icon: BarChart3, title: 'Enquetes', text: 'Pergunte o que o público quer ver a seguir.' },
  { icon: Users, title: 'Convidados', text: 'Chame outro vendedor para dividir a live.' },
  { icon: Clock, title: 'Gravações', text: 'A live fica gravada e continua vendendo depois.' },
  { icon: Truck, title: 'Frete calculado', text: 'O frete sai pelo CEP do comprador e é pago a você.' },
]

const FAQ = [
  {
    q: 'Quanto custa?',
    a: `Não há mensalidade nem taxa de cadastro. A Luma fica com ${PLATFORM_FEE_PERCENT}% de cada venda, e a taxa do meio de pagamento é descontada do valor recebido.`,
  },
  {
    q: 'Como recebo o dinheiro?',
    a: 'Os pagamentos são processados pela Asaas. Cadastre sua carteira Asaas no painel de vendedor e, a cada venda paga, sua parte é separada automaticamente e vai para ela.',
  },
  {
    q: 'Quais formas de pagamento meus clientes têm?',
    a: `Pix, boleto e cartão de crédito em até ${MAX_INSTALLMENTS}x sem juros para o comprador.`,
  },
  {
    q: 'Preciso de equipamento?',
    a: 'Não. Um celular com câmera e internet basta para entrar ao vivo. Você também pode transmitir do computador.',
  },
  {
    q: 'Quem envia os pedidos?',
    a: 'Você. O comprador escolhe o frete no checkout e o valor do frete vai para você junto com a venda.',
  },
]

export default async function SellersPage() {
  const signedIn = !!(await getSession())
  const cta = signedIn ? 'Ir para o painel de vendedor' : 'Começar a vender'

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Hero */}
        <section className="bg-white rounded-md shadow-card p-6 md:p-10 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/10" aria-hidden />
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Smartphone className="w-3.5 h-3.5" />
              Para vendedores
            </span>
            <h1 className="text-gray-900 text-3xl md:text-4xl font-semibold leading-tight">
              Venda ao vivo para quem já quer comprar
            </h1>
            <p className="text-gray-500 mt-3 md:text-lg">
              Mostre seus produtos numa live, tire dúvidas no chat e venda na hora, com Pix, cartão e boleto.
              Sem mensalidade: você só paga quando vende.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                href="/vender"
                className="inline-flex items-center justify-center gap-1 bg-primary text-white font-semibold px-6 h-12 rounded-md hover:bg-primary-600 transition-colors"
              >
                {cta}
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center px-6 h-12 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Como funciona
              </a>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="mt-10 scroll-mt-20">
          <h2 className="text-gray-900 text-xl font-semibold mb-4">Como funciona</h2>
          <ol className="grid md:grid-cols-3 gap-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-white rounded-md shadow-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-gray-900 font-semibold">{step.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Fees */}
        <section className="mt-10 grid md:grid-cols-3 gap-3">
          <div className="bg-white rounded-md shadow-card p-5">
            <p className="text-gray-500 text-sm">Mensalidade</p>
            <p className="text-gray-900 text-3xl font-semibold mt-1">R$ 0</p>
            <p className="text-gray-500 text-sm mt-1">Nem taxa de cadastro.</p>
          </div>
          <div className="bg-white rounded-md shadow-card p-5">
            <p className="text-gray-500 text-sm">Comissão por venda</p>
            <p className="text-gray-900 text-3xl font-semibold mt-1">{PLATFORM_FEE_PERCENT}%</p>
            <p className="text-gray-500 text-sm mt-1">Só quando você vende, mais a taxa do pagamento.</p>
          </div>
          <div className="bg-white rounded-md shadow-card p-5">
            <p className="text-gray-500 text-sm">Seus clientes pagam com</p>
            <p className="text-gray-900 text-lg font-semibold mt-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Pix, cartão e boleto
            </p>
            <p className="text-gray-500 text-sm mt-1">Cartão em até {MAX_INSTALLMENTS}x sem juros.</p>
          </div>
        </section>

        {/* Tools */}
        <section className="mt-10">
          <h2 className="text-gray-900 text-xl font-semibold mb-4">Tudo o que você precisa na live</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TOOLS.map(tool => (
              <div key={tool.title} className="bg-white rounded-md shadow-card p-4">
                <tool.icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="text-gray-900 font-medium text-sm">{tool.title}</h3>
                <p className="text-gray-500 text-sm mt-0.5">{tool.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-gray-900 text-xl font-semibold mb-4">Perguntas frequentes</h2>
          <div className="bg-white rounded-md shadow-card divide-y divide-gray-100">
            {FAQ.map(item => (
              <details key={item.q} className="group p-4">
                <summary className="flex items-center justify-between cursor-pointer list-none text-gray-900 font-medium">
                  {item.q}
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-gray-500 text-sm mt-2">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing call */}
        <section className="mt-10 mb-6 bg-white rounded-md shadow-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-gray-900 text-xl font-semibold">Pronto para sua primeira live?</h2>
            <p className="text-gray-500 text-sm mt-1">Cadastre um produto agora e entre ao vivo quando quiser.</p>
          </div>
          <Link
            href="/vender"
            className="inline-flex items-center justify-center gap-1 bg-primary text-white font-semibold px-6 h-12 rounded-md hover:bg-primary-600 transition-colors self-start md:self-auto"
          >
            {cta}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </MainLayout>
  )
}

export const metadata: Metadata = {
  title: 'Venda ao vivo',
  description: `Venda ao vivo na Luma: sem mensalidade, ${PLATFORM_FEE_PERCENT}% por venda, Pix, cartão e boleto.`,
}
