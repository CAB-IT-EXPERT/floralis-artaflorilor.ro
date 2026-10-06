CREATE TABLE message_replies(
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 message_id BIGINT NOT NULL,
 outbox_id BIGINT,
 subject VARCHAR(255) NOT NULL,
 body TEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
 FOREIGN KEY (outbox_id) REFERENCES outbox(id) ON DELETE SET NULL,
 INDEX idx_message_replies_message(message_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
