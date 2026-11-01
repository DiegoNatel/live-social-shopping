-- Card installments (see src/lib/payments.ts). Asaas turns the charge into a plan with one
-- charge per installment: payment_ref stays the first one, payment_installment is the plan.
ALTER TABLE orders ADD COLUMN installments INTEGER NOT NULL DEFAULT 1 CHECK (installments >= 1);
ALTER TABLE orders ADD COLUMN payment_installment TEXT;
CREATE INDEX idx_orders_payment_installment ON orders(payment_installment) WHERE payment_installment IS NOT NULL;
