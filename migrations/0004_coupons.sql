-- Discount coupons, validated and applied by the order API

CREATE TABLE coupons (
  code                TEXT PRIMARY KEY,          -- stored uppercase
  percent_off         INTEGER NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  max_discount_cents  INTEGER,                   -- cap on the discount, optional
  min_subtotal_cents  INTEGER NOT NULL DEFAULT 0,
  starts_at           TEXT,
  ends_at             TEXT,
  max_uses            INTEGER,                   -- across all customers, optional
  uses_count          INTEGER NOT NULL DEFAULT 0,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (max_uses IS NULL OR uses_count <= max_uses)
);

ALTER TABLE orders ADD COLUMN coupon_code TEXT REFERENCES coupons(code);
ALTER TABLE orders ADD COLUMN coupon_discount_cents INTEGER NOT NULL DEFAULT 0;

-- Each account can use a coupon once (cancelled orders don't count)
CREATE UNIQUE INDEX idx_orders_user_coupon ON orders(user_id, coupon_code)
  WHERE coupon_code IS NOT NULL AND status != 'cancelled';

INSERT INTO coupons (code, percent_off) VALUES ('VIVOBUY10', 10);
