ALTER TABLE users
ADD COLUMN require_alt_text bool NOT NULL DEFAULT false;

ALTER TABLE users ADD INDEX idx_require_alt_text (require_alt_text);
