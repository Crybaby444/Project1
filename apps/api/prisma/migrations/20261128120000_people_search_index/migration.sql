-- Finding people by name or @username without reading every account (owner, 2026-11-28: the site must
-- carry 1000+ active people). The name is matched anywhere, folded like the catalog (trigrams); the
-- username from its start (a pattern index).
CREATE INDEX IF NOT EXISTS "User_name_trgm" ON "User" USING gin (yoyo_fold("name") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_username_prefix" ON "User" ("username" text_pattern_ops);
