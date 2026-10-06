CREATE TABLE stripe_catalog(product_id BIGINT PRIMARY KEY, stripe_product_id VARCHAR(255) NOT NULL, stripe_price_id VARCHAR(255), amount_cents BIGINT, synced_hash VARCHAR(255) NOT NULL DEFAULT '', synced_at DATETIME,FOREIGN KEY (product_id) REFERENCES products(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE stripe_shipping(shipping_id BIGINT PRIMARY KEY, stripe_rate_id VARCHAR(255) NOT NULL, amount_cents BIGINT NOT NULL, synced_hash VARCHAR(255) NOT NULL DEFAULT '',FOREIGN KEY (shipping_id) REFERENCES shipping_methods(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE stripe_sync(entity VARCHAR(255) NOT NULL, local_id BIGINT NOT NULL, status VARCHAR(255) NOT NULL DEFAULT 'pending', error TEXT NOT NULL DEFAULT (''), updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(entity,local_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE stripe_events(id VARCHAR(255) PRIMARY KEY, type VARCHAR(255) NOT NULL, processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE orders ADD COLUMN stripe_session_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN stripe_checkout_url TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent VARCHAR(255);
ALTER TABLE orders ADD COLUMN stripe_error TEXT NOT NULL DEFAULT ('');
ALTER TABLE orders ADD COLUMN stripe_refund_id VARCHAR(255);
