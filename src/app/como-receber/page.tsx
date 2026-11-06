import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { BackLink } from '@/components/ui/BackLink'
import { PLATFORM_FEE_PERCENT } from '@/lib/fees'

export const metadata: Metadata = {
  title: 'Como receber suas vendas',
  description: 'Passo a passo para criar sua conta grátis no Asaas e receber as vendas da Watchhaul.',
}

// Screenshots live in public/ajuda/asaas (taken from Asaas with personal data replaced).
// If Asaas changes its screens, retake them at an 800px-wide window.
const STEPS: { title: string; text: React.ReactNode; image?: { src: string; alt: string; width: number; height: number } }[] = [
  {
    title: 'Crie sua conta grátis no Asaas',
    text: (
      <>
        Entre em{' '}
        <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-sky-blue hover:underline inline-flex items-center gap-0.5">
          asaas.com <ExternalLink className="w-3 h-3" />
        </a>
        , digite seu e-mail e toque em <strong>Criar conta grátis</strong>. Dá para abrir com CPF ou CNPJ, sem mensalidade.
      </>
    ),
    image: { src: '/ajuda/asaas/criar-conta.png', alt: 'Formulário "Cadastre-se agora" do Asaas com o botão Criar conta grátis', width: 364, height: 236 },
  },
  {
    title: 'Complete o cadastro',
    text: 'Preencha seus dados, confirme o e-mail e o celular e envie os documentos que o Asaas pedir. Sua conta precisa estar aprovada para você sacar o dinheiro.',
  },
  {
    title: 'Abra o menu da sua conta',
    text: (
      <>
        Já dentro do Asaas, toque no <strong>ícone de perfil</strong>, no canto superior direito.
      </>
    ),
    image: { src: '/ajuda/asaas/icone-perfil.png', alt: 'Canto superior direito do Asaas com o ícone de perfil destacado', width: 260, height: 125 },
  },
  {
    title: 'Toque em Integrações',
    text: (
      <>
        No menu que abrir, escolha <strong>Integrações</strong>.
      </>
    ),
    image: { src: '/ajuda/asaas/menu-integracoes.png', alt: 'Menu da conta do Asaas com a opção Integrações destacada', width: 300, height: 340 },
  },
  {
    title: 'Copie o Wallet ID',
    text: (
      <>
        Na aba <strong>Início</strong>, procure o quadro <strong>Wallet ID</strong> e toque em <strong>Copiar</strong>. É um código parecido com
        o da imagem, mas com letras e números.
      </>
    ),
    image: { src: '/ajuda/asaas/wallet-id.png', alt: 'Campo do Wallet ID no Asaas com o botão Copiar ao lado', width: 444, height: 62 },
  },
  {
    title: 'Cole na Watchhaul',
    text: (
      <>
        Volte ao seu <Link href="/seller/dashboard" className="text-sky-blue hover:underline">painel de vendedor</Link>, cole o código em{' '}
        <strong>Receba suas vendas</strong> e toque em <strong>Salvar</strong>. Pronto: a cada venda paga, sua parte cai direto na sua conta
        Asaas, já descontada a taxa da Watchhaul de {PLATFORM_FEE_PERCENT}%.
      </>
    ),
  },
]

export default function ComoReceberPage() {
  return (
    <MainLayout headerProps={{ title: 'Como receber suas vendas', showSearch: false }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <BackLink fallback="/seller/dashboard" />
        <h1 className="text-gray-900 text-2xl font-semibold mt-3">Como receber suas vendas</h1>
        <p className="text-gray-500 mt-2">
          Os pagamentos da Watchhaul passam pelo Asaas, uma conta digital gratuita. Você cria a sua uma vez e copia um código para o seu
          painel. Leva uns 5 minutos, mais o tempo de aprovação do Asaas.
        </p>

        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="bg-white rounded-md shadow-card p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="text-gray-900 font-semibold leading-8">{step.title}</h2>
                  <p className="text-gray-600 text-sm mt-1">{step.text}</p>
                </div>
              </div>
              {step.image && (
                // Plain img: these are small static screenshots, no resizing needed
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={step.image.src}
                  alt={step.image.alt}
                  width={step.image.width}
                  height={step.image.height}
                  loading="lazy"
                  className="mt-4 w-full h-auto rounded-md border border-gray-200"
                  style={{ maxWidth: step.image.width }}
                />
              )}
            </li>
          ))}
        </ol>

        <Link
          href="/seller/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-1 w-full sm:w-auto bg-primary text-white font-semibold px-6 h-12 rounded-md hover:bg-primary-600 transition-colors"
        >
          Ir para o painel e colar o código
          <ChevronRight className="w-4 h-4" />
        </Link>

        <p className="text-gray-500 text-xs mt-6">
          Imagens do site do Asaas, só para mostrar onde tocar. As telas podem mudar um pouco com o tempo.
        </p>
      </div>
    </MainLayout>
  )
}
