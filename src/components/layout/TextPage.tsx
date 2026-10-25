import { MainLayout } from './MainLayout'

// Long-form text pages (terms, privacy, help)
export function TextPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <MainLayout headerProps={{ title }}>
      <article className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-card p-6 sm:p-8 text-gray-700 text-sm leading-relaxed space-y-4 [&_h2]:text-gray-900 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:pt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-sky-blue [&_a:hover]:underline">
          <h1 className="text-gray-900 font-semibold text-xl">{title}</h1>
          {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
          {children}
        </div>
      </article>
    </MainLayout>
  )
}
