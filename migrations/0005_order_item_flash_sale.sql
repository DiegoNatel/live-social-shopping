-- Which flash sale priced an order line, so cancelling the order can give the units back
ALTER TABLE order_items ADD COLUMN flash_sale_id TEXT REFERENCES flash_sales(id) ON DELETE SET NULL;
