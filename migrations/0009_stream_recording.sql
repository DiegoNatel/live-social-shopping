-- R2 key the live's recording is uploaded to (set when the host goes live, if recording is on).
-- When the live ends, video_url points at it so the stream page plays the recording.
ALTER TABLE streams ADD COLUMN recording_key TEXT;
