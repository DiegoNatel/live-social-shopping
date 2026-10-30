// VivoBuy's cut of each sale, in percent (shown to sellers; charged by lib/payments.ts)
export const PLATFORM_FEE_PERCENT = 10

// Unpaid orders are cancelled after this long, so abandoned checkouts don't hold stock
// (flash sale units especially). Boleto waits for its due date (it takes days to clear).
export const PAY_WITHIN_MINUTES = { pix: 30, credit_card: 120 } as const
