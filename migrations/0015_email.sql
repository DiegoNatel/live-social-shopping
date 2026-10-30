-- E-mails for order notifications (see src/lib/email.ts). notify() marks a notification
-- 'pending' and the cron sends it, so webhooks and checkout never wait for the e-mail service.
ALTER TABLE notifications ADD COLUMN email_status TEXT CHECK (email_status IN ('pending', 'sent', 'failed'));
CREATE INDEX idx_notifications_email_pending ON notifications(created_at) WHERE email_status = 'pending';
