-- 作者数据库 + 旅行路线
-- 在 Supabase SQL Editor 中运行

-- 1. 创建作者表
CREATE TABLE IF NOT EXISTS authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  dynasty TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  courtesy_name TEXT,
  art_name TEXT,
  biography TEXT,
  avatar_url TEXT,
  poem_count INTEGER DEFAULT 0,
  place_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 从 poems 表提取作者（出现 >= 3 次）
INSERT INTO authors (name, dynasty, poem_count)
SELECT author, dynasty, COUNT(*) as cnt
FROM poems
GROUP BY author, dynasty
HAVING COUNT(*) >= 3
ON CONFLICT (name) DO UPDATE SET poem_count = EXCLUDED.poem_count;

-- 3. 更新每个作者的地点数
UPDATE authors a SET place_count = (
  SELECT COUNT(DISTINCT pp.place_id)
  FROM poem_places pp
  JOIN poems p ON p.id = pp.poem_id
  WHERE p.author = a.name
);

-- 4. 创建作者旅行路线 view
CREATE OR REPLACE VIEW author_routes AS
SELECT
  a.id AS author_id,
  a.name AS author_name,
  a.dynasty,
  a.poem_count,
  a.place_count,
  p.id AS place_id,
  p.name AS place_name,
  p.type AS place_type,
  p.lng,
  p.lat,
  COUNT(pp.poem_id) AS poem_count_at_place
FROM authors a
JOIN poems pm ON pm.author = a.name
JOIN poem_places pp ON pp.poem_id = pm.id
JOIN places p ON p.id = pp.place_id
GROUP BY a.id, a.name, a.dynasty, a.poem_count, a.place_count, p.id, p.name, p.type, p.lng, p.lat;

-- 5. 验证：热门作者 TOP 10
SELECT name, dynasty, poem_count, place_count
FROM authors
ORDER BY poem_count DESC
LIMIT 10;

-- 6. RLS
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public authors" ON authors;
CREATE POLICY "Public authors" ON authors FOR SELECT USING (true);

-- 7. 补充作者生卒年与字号（热门作者）
UPDATE authors SET birth_year=701, death_year=762, courtesy_name='字太白', art_name='青莲居士' WHERE name='李白';
UPDATE authors SET birth_year=712, death_year=770, courtesy_name='字子美', art_name='少陵野老' WHERE name='杜甫';
UPDATE authors SET birth_year=1037, death_year=1101, courtesy_name='字子瞻', art_name='东坡居士' WHERE name='苏轼';
UPDATE authors SET birth_year=772, death_year=846, courtesy_name='字乐天', art_name='香山居士' WHERE name='白居易';
UPDATE authors SET birth_year=701, death_year=761, courtesy_name='字摩诘' WHERE name='王维';
UPDATE authors SET birth_year=1125, death_year=1210, courtesy_name='字务观', art_name='放翁' WHERE name='陆游';
UPDATE authors SET birth_year=1140, death_year=1207, courtesy_name='字幼安', art_name='稼轩' WHERE name='辛弃疾';
UPDATE authors SET birth_year=813, death_year=858, courtesy_name='字义山', art_name='玉谿生' WHERE name='李商隐';
UPDATE authors SET birth_year=768, death_year=832, courtesy_name='字退之' WHERE name='韩愈';
