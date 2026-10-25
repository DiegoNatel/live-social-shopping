import Link from 'next/link'

export function EmptyState({ title, text, href, linkLabel }: { title: string; text?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="bg-white rounded-md shadow-card p-8 text-center">
      <p className="text-gray-900 font-medium mb-1">{title}</p>
      {text && <p className="text-gray-500 text-sm mb-2">{text}</p>}
      {href && (
        <Link href={href} className="text-sky-blue text-sm hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
