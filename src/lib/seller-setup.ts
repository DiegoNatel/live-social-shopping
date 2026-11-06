import 'server-only'
import { asaasEnabled } from './payments/asaas'

// A seller can be bought from once their shop is set up:
// - an Asaas wallet, so their share of each sale goes to them (only while online payments are on;
//   without it Watchhaul would hold their money and pay it out by hand)
// - the CEP they ship from, so buyers pay the real freight instead of a flat guess
// Until then they can still add products and go live; only buying is held back, and the
// seller is guided to what's missing (dashboard checklist, /seller/settings?focus=...).

export type SetupStep = 'wallet' | 'zip'

export const SETUP_STEP_LABEL: Record<SetupStep, string> = {
  wallet: 'onde receber suas vendas (Wallet ID do Asaas)',
  zip: 'o CEP de onde você envia os pedidos',
}

export function missingSetup(seller: { shipFromZip: string | null | undefined; hasWallet: boolean }): SetupStep[] {
  const missing: SetupStep[] = []
  if (asaasEnabled() && !seller.hasWallet) missing.push('wallet')
  if (!seller.shipFromZip) missing.push('zip')
  return missing
}

// SQL columns (joined users table as `alias`) that missingSetup needs, under a prefix
export const setupCols = (alias: string, prefix: string) =>
  `${alias}.ship_from_zip AS ${prefix}ship_from_zip, (${alias}.asaas_wallet_id IS NOT NULL) AS ${prefix}has_wallet`

// "a e b" for the messages
export function listSteps(steps: SetupStep[]) {
  const labels = steps.map(s => SETUP_STEP_LABEL[s])
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}
