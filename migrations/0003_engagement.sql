-- Everything the app shows that wasn't stored yet: notifications, favorites,
-- reviews, flash sales, polls and chat history.

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('stream_live', 'order_update', 'promotion', 'follow', 'message')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  action_url  TEXT,
  image       TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE favorites (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, product_id)
);

-- products.rating / reviews_count are kept in sync when a review is written
CREATE TABLE reviews (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (product_id, user_id)
);

CREATE TABLE flash_sales (
  id                  TEXT PRIMARY KEY,
  product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stream_id           TEXT REFERENCES streams(id) ON DELETE CASCADE,
  discount_percent    INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 99),
  starts_at           TEXT NOT NULL,
  ends_at             TEXT NOT NULL,
  quantity_available  INTEGER NOT NULL CHECK (quantity_available > 0),
  quantity_sold       INTEGER NOT NULL DEFAULT 0,
  CHECK (quantity_sold <= quantity_available)
);
CREATE INDEX idx_flash_sales_stream ON flash_sales(stream_id);

CREATE TABLE polls (
  id          TEXT PRIMARY KEY,
  stream_id   TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  ends_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_polls_stream ON polls(stream_id);

CREATE TABLE poll_options (
  id          TEXT PRIMARY KEY,
  poll_id     TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  -- Starting count (seeded/imported votes); real votes live in poll_votes
  base_votes  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE poll_votes (
  poll_id     TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (poll_id, user_id)
);

-- Chat history (live delivery comes with the real-time phase)
CREATE TABLE chat_messages (
  id          TEXT PRIMARY KEY,
  stream_id   TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'question', 'purchase', 'system')),
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  product_id  TEXT REFERENCES products(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_chat_stream ON chat_messages(stream_id, created_at);

-- Faster "my orders" and stock lookups
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
