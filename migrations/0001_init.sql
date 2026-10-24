-- VivoBuy initial schema (Cloudflare D1 / SQLite)
-- Money is stored in centavos (INTEGER). Timestamps are ISO-8601 UTC text.
-- Small lists (images, tags, benefits) are JSON text columns.
-- D1 always enforces foreign keys, so no PRAGMA is needed.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  avatar        TEXT,
  bio           TEXT,
  is_verified   INTEGER NOT NULL DEFAULT 0,
  is_seller     INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,  -- kept in sync with follows by the app
  following_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE follows (
  follower_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_followee ON follows(followee_id);

CREATE TABLE categories (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  icon          TEXT,
  color         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id                   TEXT PRIMARY KEY,
  seller_id            TEXT NOT NULL REFERENCES users(id),
  category_slug        TEXT REFERENCES categories(slug),
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  price_cents          INTEGER NOT NULL CHECK (price_cents >= 0),
  original_price_cents INTEGER CHECK (original_price_cents IS NULL OR original_price_cents >= 0),
  stock                INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images               TEXT NOT NULL DEFAULT '[]',
  tags                 TEXT NOT NULL DEFAULT '[]',
  rating               REAL NOT NULL DEFAULT 0,
  reviews_count        INTEGER NOT NULL DEFAULT 0,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_slug);

CREATE TABLE product_variants (
  id                    TEXT PRIMARY KEY,
  product_id            TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL CHECK (type IN ('size', 'color')),
  name                  TEXT NOT NULL,
  value                 TEXT NOT NULL,
  stock                 INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_modifier_cents  INTEGER NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE courses (
  id                   TEXT PRIMARY KEY,
  instructor_id        TEXT NOT NULL REFERENCES users(id),
  category_slug        TEXT REFERENCES categories(slug),
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  price_cents          INTEGER NOT NULL CHECK (price_cents >= 0),
  original_price_cents INTEGER,
  thumbnail            TEXT,
  tags                 TEXT NOT NULL DEFAULT '[]',
  rating               REAL NOT NULL DEFAULT 0,
  reviews_count        INTEGER NOT NULL DEFAULT 0,
  duration             TEXT,
  lessons_count        INTEGER NOT NULL DEFAULT 0,
  students_count       INTEGER NOT NULL DEFAULT 0,
  level                TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  language             TEXT NOT NULL DEFAULT 'Português',
  certificate_included INTEGER NOT NULL DEFAULT 0,
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE course_modules (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  duration      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_modules_course ON course_modules(course_id);

CREATE TABLE course_lessons (
  id            TEXT PRIMARY KEY,
  module_id     TEXT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  duration      TEXT,
  is_free       INTEGER NOT NULL DEFAULT 0,
  type          TEXT NOT NULL CHECK (type IN ('video', 'quiz', 'exercise', 'download')),
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_lessons_module ON course_lessons(module_id);

CREATE TABLE streams (
  id             TEXT PRIMARY KEY,
  host_id        TEXT NOT NULL REFERENCES users(id),
  category_slug  TEXT REFERENCES categories(slug),
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  thumbnail      TEXT,
  video_url      TEXT,
  status         TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  scheduled_at   TEXT,
  started_at     TEXT,
  ended_at       TEXT,
  viewer_count   INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  tags           TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_host ON streams(host_id);

CREATE TABLE stream_products (
  stream_id     TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (stream_id, product_id)
);

CREATE TABLE auctions (
  id                       TEXT PRIMARY KEY,
  product_id               TEXT NOT NULL REFERENCES products(id),
  stream_id                TEXT REFERENCES streams(id),
  starting_price_cents     INTEGER NOT NULL,
  current_bid_cents        INTEGER NOT NULL,
  minimum_increment_cents  INTEGER NOT NULL,
  starts_at                TEXT NOT NULL,
  ends_at                  TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  winner_id                TEXT REFERENCES users(id)
);
CREATE INDEX idx_auctions_stream ON auctions(stream_id);

CREATE TABLE bids (
  id            TEXT PRIMARY KEY,
  auction_id    TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id),
  amount_cents  INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_bids_auction ON bids(auction_id, amount_cents DESC);

CREATE TABLE addresses (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  street        TEXT NOT NULL,
  number        TEXT NOT NULL,
  complement    TEXT,
  neighborhood  TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  zip_code      TEXT NOT NULL,
  phone         TEXT NOT NULL,
  is_default    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

CREATE TABLE orders (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'boleto', 'wallet')),
  subtotal_cents   INTEGER NOT NULL,
  shipping_cents   INTEGER NOT NULL DEFAULT 0,
  discount_cents   INTEGER NOT NULL DEFAULT 0,
  total_cents      INTEGER NOT NULL,
  shipping_address TEXT NOT NULL,           -- JSON snapshot of the address at order time
  tracking_code    TEXT,
  payment_ref      TEXT,                    -- payment provider's charge id
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_orders_user ON orders(user_id);

CREATE TABLE order_items (
  id                TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        TEXT NOT NULL REFERENCES products(id),
  seller_id         TEXT NOT NULL REFERENCES users(id),
  name              TEXT NOT NULL,          -- snapshot so later edits don't change past orders
  unit_price_cents  INTEGER NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  variants          TEXT                    -- JSON of selected variants
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_seller ON order_items(seller_id);
