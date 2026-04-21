ALTER TABLE comments ADD COLUMN locked_at DATETIME NULL;
ALTER TABLE comments ADD COLUMN locked_by BINARY(12) NULL;
ALTER TABLE comments ADD COLUMN locked_by_group TINYINT NOT NULL DEFAULT 0;
CREATE INDEX idx_comments_locked_at ON comments(locked_at);
