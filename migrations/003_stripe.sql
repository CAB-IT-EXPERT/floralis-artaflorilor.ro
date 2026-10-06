CREATE TABLE stripe_catalog(product_id INTEGER PRIMARY KEY REFERENCES products(id), stripe_product_id TEXT NOT NULL, stripe_price_id TEXT, amount_cents INTEGER, synced_hash TEXT NOT NULL DEFAULT '', synced_at TEXT);
CREATE TABLE stripe_shipping(shipping_id INTEGER PRIMARY KEY REFERENCES shipping_methods(id), stripe_rate_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, synced_hash TEXT NOT NULL DEFAULT '');
CREATE TABLE stripe_sync(entity TEXT NOT NULL, local_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', error TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(entity,local_id));
CREATE TABLE stripe_events(id TEXT PRIMARY KEY, type TEXT NOT NULL, processed_at TEXT NOT NULL DEFAULT (datetime('now')));
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_checkout_url TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent TEXT;
ALTER TABLE orders ADD COLUMN stripe_error TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN stripe_refund_id TEXT;
