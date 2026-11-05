// Watchhaul's cut of each sale, in percent (shown to sellers; charged by lib/payments.ts)
export const PLATFORM_FEE_PERCENT = 10

// Unpaid orders are cancelled after this long, so abandoned checkouts don't hold stock
// (flash sale units especially). Boleto waits for its due date (it takes days to clear).
export const PAY_WITHIN_MINUTES = { pix: 30, credit_card: 120 } as const

// Days after shipping a buyer can give up a purchase: the 7 the law gives from receipt, plus delivery
export const REFUND_WINDOW_DAYS = 30

// Card installments, without interest. Asaas's fee comes out of every part of the sale
export const MAX_INSTALLMENTS = 12
export const MIN_INSTALLMENT_CENTS = 1000

// How many installments a total can be split into (1 = paid in full)
export const maxInstallments = (totalCents: number) =>
  Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(totalCents / MIN_INSTALLMENT_CENTS)))
