-- Guest sellers: a host invites other sellers into a live, and once they accept they can
-- add their products, auctions and flash sales to it
CREATE TABLE stream_guests (
  stream_id     TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  seller_id     TEXT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'removed')),
  invited_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at  TEXT,
  PRIMARY KEY (stream_id, seller_id)
);
CREATE INDEX idx_stream_guests_seller ON stream_guests(seller_id, status);

-- A guest's product sold through a host's live: the line's revenue is split between the
-- seller and the host (50/50 for now). host_share_cents is the host's part; the seller
-- gets the rest. Both are NULL for sales outside a guest arrangement.
ALTER TABLE order_items ADD COLUMN stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN host_id TEXT REFERENCES users(id);
ALTER TABLE order_items ADD COLUMN host_share_cents INTEGER;
