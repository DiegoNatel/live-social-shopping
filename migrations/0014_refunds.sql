-- Refunds and chargebacks (see src/lib/refunds.ts). A refunded order is status 'cancelled'
-- with refunded_at set, so it leaves sales, stats and coupon use like any cancelled order.

-- requested: buyer asked, waiting for the sellers who shipped to get the product back
-- processing: sent to Asaas. failed: Asaas refused it (retried, except boleto)
-- chargeback: the card holder disputed the charge. refunded: money returned
ALTER TABLE orders ADD COLUMN refund_status TEXT
  CHECK (refund_status IN ('requested', 'processing', 'failed', 'chargeback', 'refunded'));
ALTER TABLE orders ADD COLUMN refund_attempted_at TEXT;
ALTER TABLE orders ADD COLUMN refunded_at TEXT;
-- Boleto: Asaas page where the buyer gives the bank account for the refund
ALTER TABLE orders ADD COLUMN refund_url TEXT;
CREATE INDEX idx_orders_refund_status ON orders(refund_status) WHERE refund_status IS NOT NULL;

-- The seller got the shipped product back
ALTER TABLE order_shipments ADD COLUMN return_confirmed_at TEXT;
