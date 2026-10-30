-- Asaas sandbox and production are separate: a customer or charge made in one doesn't exist
-- in the other. Remember where each was made, so switching ASAAS_ENV doesn't break checkout.
ALTER TABLE orders ADD COLUMN payment_env TEXT;
UPDATE orders SET payment_env = 'sandbox' WHERE payment_ref IS NOT NULL;
-- Customer ids become '<env>:<id>'; everything so far was made in the sandbox
UPDATE users SET asaas_customer_id = 'sandbox:' || asaas_customer_id
WHERE asaas_customer_id IS NOT NULL AND asaas_customer_id NOT LIKE '%:%';
