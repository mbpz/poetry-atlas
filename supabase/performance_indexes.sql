-- 性能优化索引
-- 在 Supabase SQL Editor 中运行

-- 0. 启用 pg_trgm 扩展（GIN trigram 索引所需）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. poems 表搜索索引（trigram + B-tree）
CREATE INDEX IF NOT EXISTS idx_poems_title_trgm ON poems USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poems_author_trgm ON poems USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poems_dynasty_id ON poems(dynasty_id);

-- 2. places 表索引
CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);

-- 3. poem_places 表复合索引
CREATE INDEX IF NOT EXISTS idx_poem_places_poem ON poem_places(poem_id, place_id);

-- 4. 清理旧索引（如存在）
DROP INDEX IF EXISTS idx_places_ancient_names;

-- 5. 验证
SELECT indexname FROM pg_indexes WHERE tablename IN ('poems', 'places', 'poem_places') ORDER BY indexname;
