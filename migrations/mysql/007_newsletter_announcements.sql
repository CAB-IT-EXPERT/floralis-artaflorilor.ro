ALTER TABLE outbox ADD COLUMN template VARCHAR(80) NOT NULL DEFAULT 'default';
ALTER TABLE outbox ADD COLUMN template_data TEXT NOT NULL DEFAULT ('{}');

CREATE TABLE newsletter_campaigns(
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 entity_type VARCHAR(20) NOT NULL,
 entity_id BIGINT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_newsletter_campaign_entity(entity_type,entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO newsletter_campaigns(entity_type,entity_id)
 SELECT 'product',id FROM products WHERE status='publish';
INSERT IGNORE INTO newsletter_campaigns(entity_type,entity_id)
 SELECT 'post',id FROM pages WHERE type='post' AND status='publish';
