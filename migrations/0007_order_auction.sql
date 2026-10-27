-- Orders that pay for a won auction; an auction becomes at most one active order
ALTER TABLE orders ADD COLUMN auction_id TEXT REFERENCES auctions(id);
CREATE UNIQUE INDEX idx_orders_auction ON orders(auction_id) WHERE auction_id IS NOT NULL AND status != 'cancelled';
