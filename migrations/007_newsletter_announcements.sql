ALTER TABLE outbox ADD COLUMN template TEXT NOT NULL DEFAULT 'default';
ALTER TABLE outbox ADD COLUMN template_data TEXT NOT NULL DEFAULT '{}';

CREATE TABLE newsletter_campaigns(
 id INTEGER PRIMARY KEY,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('product','post')),
 entity_id INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(entity_type,entity_id)
);

INSERT OR IGNORE INTO newsletter_campaigns(entity_type,entity_id)
 SELECT 'product',id FROM products WHERE status='publish';
INSERT OR IGNORE INTO newsletter_campaigns(entity_type,entity_id)
 SELECT 'post',id FROM pages WHERE type='post' AND status='publish';
