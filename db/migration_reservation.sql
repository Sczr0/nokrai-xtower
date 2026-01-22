ALTER TABLE invite_codes ADD COLUMN trade_no TEXT;
CREATE INDEX IF NOT EXISTS idx_invite_codes_trade_no ON invite_codes(trade_no);