-- The shopping bag is saved to the account, so it follows the buyer across devices and
-- doesn't stay behind in a browser after they sign out. One row per buyer; `items` is a
-- JSON list of { id, productId, quantity, variants } (prices and stock are read fresh).
CREATE TABLE carts (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items      TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
