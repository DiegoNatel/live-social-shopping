// Shared bits for the seller forms (light, Mercado Livre-style inputs)
export const inputClass =
  'w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/20'

export function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}
