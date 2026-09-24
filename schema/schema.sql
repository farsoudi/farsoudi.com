-- farsoudi.com journal schema
-- mysql 8.0, utf8mb4
--
-- apply with:
--   mysql -h <host> -P <port> -u <user> -p <database> < schema/schema.sql
--
-- idempotent: safe to run repeatedly, never drops or alters existing data.

CREATE TABLE IF NOT EXISTS journal_entry (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(255)    NOT NULL,
  body         LONGTEXT        NOT NULL,               -- literal paragraph text
  created_at   DATETIME        NOT NULL,               -- the post date (from frontmatter)
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- upsert key: a title + date pair identifies a post
  -- note: title is case-insensitive under utf8mb4_unicode_ci
  UNIQUE KEY uq_journal_entry_title_date (title, created_at),
  KEY idx_journal_entry_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tag (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journal_entry_tag (
  entry_id  BIGINT UNSIGNED NOT NULL,
  tag_id    INT UNSIGNED    NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  KEY idx_journal_entry_tag_tag (tag_id),
  CONSTRAINT fk_journal_entry_tag_entry
    FOREIGN KEY (entry_id) REFERENCES journal_entry (id) ON DELETE CASCADE,
  CONSTRAINT fk_journal_entry_tag_tag
    FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
