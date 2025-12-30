ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateEnabled BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS messageTemplateText TEXT DEFAULT 'سلام {name}
مبلغ: {amount} تومان
لینک پرداخت:
{link}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsappTemplateText TEXT DEFAULT 'سلام {name}!
لینک پرداخت شما آماده است:
{link}
مبلغ: {amount} تومان';
