-- video_room: 1 once the live's LiveKit room was opened. Only those lives are ended
-- automatically (by the cron in worker.ts) when the host stops broadcasting.
-- video_idle_since: when the cron first found the room without a broadcaster
ALTER TABLE streams ADD COLUMN video_room INTEGER NOT NULL DEFAULT 0;
ALTER TABLE streams ADD COLUMN video_idle_since TEXT;

-- The sample lives from the seed were never broadcast; stop showing them as on air
UPDATE streams
SET status = 'ended', viewer_count = 0, ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN ('stream-1', 'stream-2', 'stream-4') AND status = 'live';
