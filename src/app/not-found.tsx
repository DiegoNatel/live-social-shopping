import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'

// Shown for any address that doesn't exist (and lives or auctions that were removed)
export default function NotFound() {
  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-5xl font-bold text-primary mb-2">404</p>
        <h1 className="text-gray-900 text-xl font-semibold mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-6">O link pode estar errado, ou essa live ou produto não está mais disponível.</p>
        <div className="flex flex-col gap-2 items-center">
          <Link href="/" className="text-white bg-primary rounded-full px-6 h-11 leading-[2.75rem] font-medium">
            Ver lives ao vivo
          </Link>
          <Link href="/help" className="text-sky-blue text-sm hover:underline">
            Precisa de ajuda?
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
