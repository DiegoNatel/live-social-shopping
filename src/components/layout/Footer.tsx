import Link from 'next/link'
import { CreditCard, FileText } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { PixIcon } from '@/components/ui/Icons'
import { COMPANY } from '@/lib/company'
import { MAX_INSTALLMENTS } from '@/lib/fees'

const COLUMNS = [
  {
    title: 'Comprar',
    links: [
      { href: '/discover', label: 'Explorar' },
      { href: '/deals', label: 'Ofertas' },
      { href: '/trending', label: 'Em alta' },
      { href: '/schedule', label: 'Agenda de lives' },
    ],
  },
  {
    title: 'Vender',
    links: [
      { href: '/para-vendedores', label: 'Venda ao vivo' },
      { href: '/vender', label: 'Criar conta de vendedor' },
      { href: '/seller/dashboard', label: 'Painel do vendedor' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { href: '/help', label: 'Central de ajuda' },
      { href: '/orders', label: 'Meus pedidos' },
      { href: '/terms', label: 'Termos de uso' },
      { href: '/privacy', label: 'Privacidade' },
    ],
  },
]

// Company details show once they're filled in (lib/company.ts still has placeholders)
const hasCompany = !COMPANY.cnpj.startsWith('[') && !COMPANY.legalName.startsWith('[')

export function Footer() {
  return (
    <footer className="mt-12 bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-black flex items-center justify-center">
                <BrandMark className="w-full h-full" />
              </span>
              <span className="font-semibold text-lg text-gray-900">{COMPANY.brand}</span>
            </Link>
            <p className="text-gray-500 text-sm mt-3 max-w-xs">Compre ao vivo, direto de quem vende.</p>
            <div className="mt-4">
              <p className="text-gray-400 text-xs mb-2">Formas de pagamento</p>
              <div className="flex flex-wrap gap-2 text-gray-600 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100">
                  <PixIcon className="w-3.5 h-3.5 text-tropical-green" />
                  Pix
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100">
                  <CreditCard className="w-3.5 h-3.5" />
                  Cartão em até {MAX_INSTALLMENTS}x
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100">
                  <FileText className="w-3.5 h-3.5" />
                  Boleto
                </span>
              </div>
            </div>
          </div>

          {COLUMNS.map(column => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-gray-900 text-sm font-semibold mb-3">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-500 text-sm hover:text-gray-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-gray-400 text-xs flex flex-col sm:flex-row sm:justify-between gap-2">
          <p>
            © {new Date().getFullYear()} {COMPANY.brand}
            {hasCompany && ` · ${COMPANY.legalName} · CNPJ ${COMPANY.cnpj}`}
          </p>
          <p>Pagamentos processados com segurança pela Asaas.</p>
        </div>
      </div>
    </footer>
  )
}
