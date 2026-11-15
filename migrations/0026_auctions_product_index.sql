-- Products are checked for units held by auctions on every product list and order
-- (auctionHold in src/lib/db.ts), so auctions need a lookup by product.
CREATE INDEX idx_auctions_product ON auctions(product_id);
