-- Shipping through Melhor Envio (src/lib/shipping.ts). Each seller ships their own items.

-- Package size and weight, for freight quotes (empty: DEFAULT_PACKAGE)
ALTER TABLE products ADD COLUMN weight_g INTEGER;
ALTER TABLE products ADD COLUMN height_cm INTEGER;
ALTER TABLE products ADD COLUMN width_cm INTEGER;
ALTER TABLE products ADD COLUMN length_cm INTEGER;

-- CEP the seller's packages leave from
ALTER TABLE users ADD COLUMN ship_from_zip TEXT;

-- One shipment per seller in an order: the service the buyer chose and its price (paid to
-- the seller in the payment split), then the tracking code the seller adds when shipping
CREATE TABLE order_shipments (
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id     TEXT NOT NULL REFERENCES users(id),
  service_id    INTEGER,
  service_name  TEXT NOT NULL,
  company       TEXT,
  price_cents   INTEGER NOT NULL,
  delivery_days INTEGER,
  tracking_code TEXT,
  shipped_at    TEXT,
  PRIMARY KEY (order_id, seller_id)
);
CREATE INDEX idx_order_shipments_seller ON order_shipments(seller_id);
