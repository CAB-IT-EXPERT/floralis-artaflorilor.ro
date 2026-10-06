ALTER TABLE message_replies ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE message_replies ADD COLUMN error TEXT NOT NULL DEFAULT '';

UPDATE message_replies
SET delivery_status=COALESCE((SELECT status FROM outbox WHERE outbox.id=message_replies.outbox_id),'sent'),
    error=COALESCE((SELECT error FROM outbox WHERE outbox.id=message_replies.outbox_id),'');

UPDATE message_replies SET outbox_id=NULL;
DELETE FROM outbox;
