-- 性能优化索引
-- 在 Supabase SQL Editor 中运行

-- 1. poems 表全文搜索索引
CREATE INDEX IF NOT EXISTS idx_poems_title ON poems USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poems_author ON poems USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poems_dynasty_id ON poems(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_poems_content_fts ON poems USING gin (to_tsvector('simple', content));

-- 2. places 表索引
CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);
CREATE INDEX IF NOT EXISTS idx_places_ancient_names ON places USING gin (ancient_names);

-- 3. poem_places 表复合索引
CREATE INDEX IF NOT EXISTS idx_poem_places_place_poem ON poem_places(place_id, poem_id);
CREATE INDEX IF NOT EXISTS idx_poem_places_poem ON poem_places(poem_id);

-- 4. 验证
SELECT indexname FROM pg_indexes WHERE tablename IN ('poems', 'places', 'poem_places');
