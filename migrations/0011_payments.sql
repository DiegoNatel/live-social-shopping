-- Payments through Asaas (see src/lib/payments.ts)

-- Buyer's CPF (Asaas needs it to charge) and their Asaas customer
ALTER TABLE users ADD COLUMN tax_id TEXT;
ALTER TABLE users ADD COLUMN asaas_customer_id TEXT;
-- Seller's Asaas wallet: their part of each sale is sent there by the payment split
ALTER TABLE users ADD COLUMN asaas_wallet_id TEXT;

-- orders.payment_ref (already there) holds the Asaas charge id
-- Asaas page where the buyer pays by card or boleto
ALTER TABLE orders ADD COLUMN payment_url TEXT;
-- JSON: how the charge was split, e.g. [{"userId":"…","role":"seller","cents":1234,"walletId":"…"}].
-- Parts without a walletId stayed with VivoBuy and must be paid out by hand.
ALTER TABLE orders ADD COLUMN payment_split TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
CREATE UNIQUE INDEX idx_orders_payment_ref ON orders(payment_ref);
