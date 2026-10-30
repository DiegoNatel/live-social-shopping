// Buyer or seller mode. Seller mode swaps the top menu for the seller's (painel, produtos,
// lives) and stays on until the seller switches back. Kept in a cookie so the server renders
// the same menu the browser shows, and so it lasts across visits.

export type AppMode = 'buyer' | 'seller'

export const MODE_COOKIE = 'vivobuy-mode'

export const parseMode = (value: string | null | undefined): AppMode => (value === 'seller' ? 'seller' : 'buyer')

export function saveMode(mode: AppMode) {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}
