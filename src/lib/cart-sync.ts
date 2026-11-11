'use client'

import { useCartStore, variantKey } from '@/store'
import { availableStock } from '@/lib/pricing'
import type { CartItem } from '@/types'

// Keeps the shopping bag in this browser and the one saved to the account (/api/cart) the same.
//
// - Signed out: the bag lives only in this browser (owner = null).
// - Signing in: a bag started while signed out is added to the account's; otherwise the
//   account's bag replaces what's here.
// - While signed in: every change is sent to the account, and the bag is read again when
//   the tab comes back into view, so changes made on another device show up.
// - Signing out: the bag leaves this browser (it stays in the account).

const fingerprint = (items: CartItem[]) =>
  JSON.stringify(items.map(i => [i.id, i.product.id, i.quantity, variantKey(i.selectedVariants)]))

// The account's bag as far as this tab knows
let saved: string | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let lastRead = 0

const hydrated = () =>
  new Promise<void>(resolve => {
    if (useCartStore.persist.hasHydrated()) resolve()
    else useCartStore.persist.onFinishHydration(() => resolve())
  })

async function read() {
  lastRead = Date.now()
  const res = await fetch('/api/cart', { cache: 'no-store' }).catch(() => null)
  return res?.ok ? ((await res.json()) as CartItem[]) : null
}

async function send() {
  clearTimeout(timer)
  timer = undefined
  const { items, owner } = useCartStore.getState()
  if (!owner) return
  const sending = fingerprint(items)
  const res = await fetch('/api/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // Still delivered if the page is closed right after the change
    keepalive: true,
    body: JSON.stringify({
      items: items.map(i => ({ id: i.id, productId: i.product.id, quantity: i.quantity, variants: i.selectedVariants })),
    }),
  }).catch(() => null)
  if (!res?.ok) return
  saved = sending
  // `unsaved` survives a reload, so a change that never reached the account is sent next time
  if (fingerprint(useCartStore.getState().items) === sending) useCartStore.setState({ unsaved: false })
}

// The account's bag plus what was added here while signed out
function merge(account: CartItem[], local: CartItem[]) {
  const merged = account.map(i => ({ ...i }))
  for (const item of local) {
    const twin = merged.find(m => m.product.id === item.product.id && variantKey(m.selectedVariants) === variantKey(item.selectedVariants))
    if (twin) twin.quantity = Math.min(availableStock(twin.product, twin.selectedVariants), Math.max(twin.quantity, item.quantity))
    else merged.push(item)
  }
  return merged
}

export async function cartSignedIn(userId: string) {
  await hydrated()
  const cart = useCartStore.getState()
  if (cart.owner === userId && cart.unsaved) return send()
  // Someone else's bag was left in this browser: it isn't this account's
  if (cart.owner && cart.owner !== userId) useCartStore.setState({ items: [], appliedCoupon: null, owner: null, unsaved: false })
  const before = useCartStore.getState().items
  const account = await read()
  // Offline: try again on the next page load. Changed meanwhile: that change is on its way.
  // (Compared by content: refreshing prices replaces the list without changing the bag.)
  if (!account || fingerprint(useCartStore.getState().items) !== fingerprint(before)) return
  const wasGuest = useCartStore.getState().owner === null
  saved = fingerprint(account)
  // When signed-out items were added, the store listener below sends the merged bag
  useCartStore.setState({ items: wasGuest ? merge(account, before) : account, owner: userId })
}

export async function cartSignedOut() {
  await hydrated()
  clearTimeout(timer)
  timer = undefined
  saved = null
  if (useCartStore.getState().owner) useCartStore.setState({ items: [], appliedCoupon: null, owner: null, unsaved: false })
}

// Sends a change that's still waiting (called before signing out)
export const flushCart = () => (timer ? send() : Promise.resolve())

if (typeof window !== 'undefined') {
  // A bag loaded from this browser with nothing unsaved is what the account has. Without
  // this, the first refresh of prices would look like a change and overwrite the account's
  // bag (maybe changed on another device) with this browser's older copy.
  hydrated().then(() => {
    const { owner, unsaved, items } = useCartStore.getState()
    if (owner && !unsaved && saved === null) saved = fingerprint(items)
  })

  useCartStore.subscribe((state, prev) => {
    if (!useCartStore.persist.hasHydrated()) return
    if (!state.owner || (state.items === prev.items && state.owner === prev.owner)) return
    if (fingerprint(state.items) === saved) return
    if (!state.unsaved) useCartStore.setState({ unsaved: true })
    clearTimeout(timer)
    timer = setTimeout(send, 500)
  })

  // Back on this tab: pick up what changed on another device (at most every 15 seconds)
  document.addEventListener('visibilitychange', async () => {
    const { owner, unsaved, items } = useCartStore.getState()
    if (document.visibilityState !== 'visible' || !owner || unsaved || timer || Date.now() - lastRead < 15_000) return
    const account = await read()
    const now = useCartStore.getState()
    if (!account || fingerprint(now.items) !== fingerprint(items) || now.owner !== owner) return
    saved = fingerprint(account)
    if (saved !== fingerprint(items)) useCartStore.setState({ items: account })
  })
}
