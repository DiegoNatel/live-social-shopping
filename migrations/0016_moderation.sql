-- Moderation (see src/lib/moderation.ts). Removed things are hidden, not deleted, so a
-- wrong decision can be undone and there's a record if the authorities ask.

ALTER TABLE users ADD COLUMN banned_at TEXT;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
-- Taken down by an admin: the seller can't bring it back. A ban sets these to the user's
-- banned_at, which is how lifting the ban knows what to restore.
ALTER TABLE products ADD COLUMN blocked_at TEXT;
ALTER TABLE streams ADD COLUMN blocked_at TEXT;

-- When the buyer asked to return a shipped order, to spot sellers who never answer
ALTER TABLE orders ADD COLUMN refund_requested_at TEXT;

CREATE TABLE reports (
  id             TEXT PRIMARY KEY,
  reporter_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type    TEXT NOT NULL CHECK (target_type IN ('product', 'stream', 'message')),
  target_id      TEXT NOT NULL,
  -- Who is responsible for it: the seller, the host or the message's author
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- What was reported, kept even if it's edited or deleted later
  target_text    TEXT NOT NULL,
  stream_id      TEXT,
  reason         TEXT NOT NULL,
  details        TEXT,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  resolved_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_reports_open ON reports(created_at) WHERE status = 'open';
-- One open report per person per target
CREATE UNIQUE INDEX idx_reports_once ON reports(reporter_id, target_type, target_id) WHERE status = 'open';
