-- Users can change their username. Their old ones keep pointing to them, so links already
-- shared (watchhaul.com/creator/<old>) still open the right page, and nobody else can take
-- an old name and pass as them.
CREATE TABLE username_redirects (
  old_username TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_username_redirects_user ON username_redirects(user_id);
