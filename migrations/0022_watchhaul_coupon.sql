-- Rename to Watchhaul: the welcome coupon becomes WATCHHAUL10. The old code is switched off,
-- not deleted, because past orders reference it.
INSERT OR IGNORE INTO coupons (code, percent_off) VALUES ('WATCHHAUL10', 10);
UPDATE coupons SET is_active = 0 WHERE code = 'VIVOBUY10';
