-- Product the host is showing right now, highlighted for viewers
ALTER TABLE streams ADD COLUMN pinned_product_id TEXT REFERENCES products(id) ON DELETE SET NULL;
