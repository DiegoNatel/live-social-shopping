import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/moderation', label: 'Moderação' },
]

export function AdminTabs({ active }: { active: string }) {
  return (
    <nav className="flex gap-4 border-b border-gray-200 mb-6">
      {TABS.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn('pb-2 text-sm font-medium border-b-2 -mb-px', tab.href === active ? 'border-primary text-gray-900' : 'border-transparent text-gray-500')}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
