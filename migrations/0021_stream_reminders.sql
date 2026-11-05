-- "Lembrar-me" on a scheduled live: when it starts, these users get a notification and an e-mail
CREATE TABLE stream_reminders (
  stream_id   TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (stream_id, user_id)
);
CREATE INDEX idx_stream_reminders_user ON stream_reminders(user_id);
