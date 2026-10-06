ALTER TABLE message_replies ADD COLUMN delivery_status VARCHAR(40) NOT NULL DEFAULT 'sent';
ALTER TABLE message_replies ADD COLUMN error TEXT NULL;

UPDATE message_replies replies
LEFT JOIN outbox messages ON messages.id=replies.outbox_id
SET replies.delivery_status=COALESCE(messages.status,'sent'),
    replies.error=COALESCE(messages.error,'');

UPDATE message_replies SET outbox_id=NULL;
DELETE FROM outbox;
ALTER TABLE message_replies MODIFY error TEXT NOT NULL;
