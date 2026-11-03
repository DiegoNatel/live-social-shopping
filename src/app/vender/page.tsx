import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// The link to share with sellers: new people land straight on sign-up
export default async function SellPage() {
  redirect((await getSession()) ? '/seller/dashboard' : '/signup?next=/vender')
}
