import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Building blocks of the profile menu (buyer and seller versions)

export function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-card overflow-hidden">
      <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wide px-4 py-2 bg-gray-50 border-b border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  )
}

// Like MenuItem, for an action instead of a link
export function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
      <div className="flex items-center gap-3">
        <span className="text-gray-500">{icon}</span>
        <span className="text-gray-900">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  href: string
  badge?: string
  hint?: string
}

export function MenuItem({ icon, label, href, badge, hint }: MenuItemProps) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gray-500">{icon}</span>
          <div className="min-w-0">
            <span className="text-gray-900">{label}</span>
            {hint && <p className="text-gray-400 text-xs truncate">{hint}</p>}
          </div>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-sky-blue-50 text-sky-blue text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </div>
    </Link>
  )
}
