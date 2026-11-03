-- Data for the founders' dashboard (see src/lib/founders.ts)

-- One row per browser per day, sent by SessionSync. visitor_id is a random id kept in the
-- browser; user_id is filled in when that visitor is signed in. Days are in Brasília time.
CREATE TABLE visits (
  day        TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (day, visitor_id)
);
CREATE INDEX idx_visits_user ON visits(user_id, day) WHERE user_id IS NOT NULL;

-- Failures the team should see, written by logError in src/lib/errors.ts. Kept for 30 days.
CREATE TABLE error_log (
  id         TEXT PRIMARY KEY,
  source     TEXT NOT NULL,
  message    TEXT NOT NULL,
  ref        TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_error_log_created ON error_log(created_at);
