CREATE TABLE message_replies(
 id INTEGER PRIMARY KEY,
 message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 outbox_id INTEGER REFERENCES outbox(id) ON DELETE SET NULL,
 subject TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_message_replies_message ON message_replies(message_id,created_at);
