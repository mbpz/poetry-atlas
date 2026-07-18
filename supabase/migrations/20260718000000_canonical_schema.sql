-- Poetry Atlas canonical Supabase schema.
-- This migration is safe for the existing project and for a fresh Supabase project.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dynasties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  start_year INTEGER,
  end_year INTEGER,
  sort_order INTEGER NOT NULL UNIQUE
);

INSERT INTO dynasties (id, name, name_en, start_year, end_year, sort_order) VALUES
  ('pre_qin', '先秦', 'Pre-Qin', -1046, -221, 10),
  ('han', '汉', 'Han', -202, 220, 20),
  ('wei_jin', '魏晋', 'Wei-Jin', 220, 420, 30),
  ('nanbei', '南北朝', 'Northern and Southern Dynasties', 420, 589, 40),
  ('sui', '隋', 'Sui', 581, 618, 50),
  ('tang', '唐', 'Tang', 618, 907, 60),
  ('wudai', '五代', 'Five Dynasties', 907, 960, 70),
  ('song', '宋', 'Song', 960, 1279, 80),
  ('jin', '金', 'Jin', 1115, 1234, 90),
  ('yuan', '元', 'Yuan', 1271, 1368, 100),
  ('ming', '明', 'Ming', 1368, 1644, 110),
  ('qing', '清', 'Qing', 1644, 1912, 120),
  ('modern', '近现代', 'Modern', 1912, 1949, 130),
  ('contemp', '当代', 'Contemporary', 1949, NULL, 140)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  start_year = EXCLUDED.start_year,
  end_year = EXCLUDED.end_year,
  sort_order = EXCLUDED.sort_order;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dynasties_name ON dynasties(name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dynasties_sort_order ON dynasties(sort_order);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'city',
  lng NUMERIC(10, 7) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  ancient_names TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE places ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'city';
ALTER TABLE places ADD COLUMN IF NOT EXISTS ancient_names TEXT[] NOT NULL DEFAULT '{}';

UPDATE places SET type = 'city' WHERE type IS NULL;
UPDATE places SET ancient_names = '{}' WHERE ancient_names IS NULL;
ALTER TABLE places ALTER COLUMN type SET DEFAULT 'city';
ALTER TABLE places ALTER COLUMN type SET NOT NULL;
ALTER TABLE places ALTER COLUMN ancient_names SET DEFAULT '{}';
ALTER TABLE places ALTER COLUMN ancient_names SET NOT NULL;
UPDATE places SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE places ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE places ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE places DROP CONSTRAINT IF EXISTS places_type_check;
ALTER TABLE places ADD CONSTRAINT places_type_check CHECK (
  type IN ('city', 'tower', 'mountain', 'lake', 'temple', 'pass', 'river', 'bridge', 'garden', 'palace')
);

CREATE TABLE IF NOT EXISTS poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  dynasty TEXT NOT NULL,
  dynasty_id TEXT NOT NULL REFERENCES dynasties(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE poems ADD COLUMN IF NOT EXISTS dynasty_id TEXT REFERENCES dynasties(id);

-- Annotation content is not part of the current product/data contract.
ALTER TABLE poems DROP COLUMN IF EXISTS annotation;
ALTER TABLE poems DROP COLUMN IF EXISTS translation;
ALTER TABLE poems DROP COLUMN IF EXISTS appreciation;

UPDATE poems SET dynasty_id = CASE dynasty
  WHEN '先秦' THEN 'pre_qin'
  WHEN '汉' THEN 'han'
  WHEN '三国' THEN 'wei_jin'
  WHEN '晋' THEN 'wei_jin'
  WHEN '魏晋' THEN 'wei_jin'
  WHEN '南北朝' THEN 'nanbei'
  WHEN '隋' THEN 'sui'
  WHEN '唐' THEN 'tang'
  WHEN '五代' THEN 'wudai'
  WHEN '宋' THEN 'song'
  WHEN '金' THEN 'jin'
  WHEN '元' THEN 'yuan'
  WHEN '明' THEN 'ming'
  WHEN '清' THEN 'qing'
  WHEN '近现代' THEN 'modern'
  WHEN '当代' THEN 'contemp'
  ELSE dynasty_id
END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM poems WHERE dynasty_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce poems.dynasty_id: unmapped dynasty values exist';
  END IF;
END $$;

ALTER TABLE poems ALTER COLUMN dynasty_id SET NOT NULL;
ALTER TABLE poems ALTER COLUMN title SET NOT NULL;
ALTER TABLE poems ALTER COLUMN author SET NOT NULL;
ALTER TABLE poems ALTER COLUMN dynasty SET NOT NULL;
ALTER TABLE poems ALTER COLUMN content SET NOT NULL;
UPDATE poems SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE poems ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE poems ALTER COLUMN created_at SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_poems_title_author ON poems(title, author);

CREATE TABLE IF NOT EXISTS poem_places (
  poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'description',
  PRIMARY KEY (poem_id, place_id)
);

UPDATE poem_places SET relation_type = 'description' WHERE relation_type IS NULL;
ALTER TABLE poem_places ALTER COLUMN relation_type SET DEFAULT 'description';
ALTER TABLE poem_places ALTER COLUMN relation_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  dynasty TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  courtesy_name TEXT,
  art_name TEXT,
  biography TEXT,
  avatar_url TEXT,
  poem_count INTEGER NOT NULL DEFAULT 0,
  place_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE authors ADD COLUMN IF NOT EXISTS poem_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS place_count INTEGER NOT NULL DEFAULT 0;
UPDATE authors SET poem_count = 0 WHERE poem_count IS NULL;
UPDATE authors SET place_count = 0 WHERE place_count IS NULL;
ALTER TABLE authors ALTER COLUMN poem_count SET DEFAULT 0;
ALTER TABLE authors ALTER COLUMN poem_count SET NOT NULL;
ALTER TABLE authors ALTER COLUMN place_count SET DEFAULT 0;
ALTER TABLE authors ALTER COLUMN place_count SET NOT NULL;
UPDATE authors SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE authors ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE authors ALTER COLUMN created_at SET NOT NULL;

CREATE OR REPLACE VIEW author_routes WITH (security_invoker = true) AS
SELECT
  a.id AS author_id,
  a.name AS author_name,
  a.dynasty,
  a.poem_count,
  a.place_count,
  pl.id AS place_id,
  pl.name AS place_name,
  pl.type AS place_type,
  pl.lng,
  pl.lat,
  COUNT(pp.poem_id) AS poem_count_at_place
FROM authors a
JOIN poems p ON p.author = a.name
JOIN poem_places pp ON pp.poem_id = p.id
JOIN places pl ON pl.id = pp.place_id
GROUP BY a.id, a.name, a.dynasty, a.poem_count, a.place_count,
  pl.id, pl.name, pl.type, pl.lng, pl.lat;

CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);
CREATE INDEX IF NOT EXISTS idx_poems_author ON poems(author);
CREATE INDEX IF NOT EXISTS idx_poems_dynasty ON poems(dynasty);
CREATE INDEX IF NOT EXISTS idx_poems_dynasty_id ON poems(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_poems_title_trgm ON poems USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poems_author_trgm ON poems USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_poem_places_place ON poem_places(place_id);

-- PostgreSQL cannot replace a function when its returned row type changes.
DROP FUNCTION IF EXISTS search_poems(TEXT, TEXT, TEXT);

CREATE FUNCTION search_poems(
  keyword TEXT DEFAULT '',
  type_filter TEXT DEFAULT 'all',
  dynasty_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  dynasty TEXT,
  dynasty_id TEXT,
  content TEXT,
  places JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    p.author,
    p.dynasty,
    p.dynasty_id,
    p.content,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', pl.id, 'name', pl.name, 'type', pl.type)
          ORDER BY pl.name, pl.id
        )
        FROM poem_places pp
        JOIN places pl ON pl.id = pp.place_id
        WHERE pp.poem_id = p.id
      ),
      '[]'::jsonb
    )
  FROM poems p
  WHERE (
    keyword = ''
    OR p.title ILIKE '%' || keyword || '%'
    OR p.author ILIKE '%' || keyword || '%'
    OR p.content ILIKE '%' || keyword || '%'
    OR EXISTS (
      SELECT 1
      FROM poem_places pp
      JOIN places pl ON pl.id = pp.place_id
      WHERE pp.poem_id = p.id
        AND (
          pl.name ILIKE '%' || keyword || '%'
          OR EXISTS (
            SELECT 1
            FROM unnest(pl.ancient_names) AS ancient_name
            WHERE ancient_name ILIKE '%' || keyword || '%'
          )
        )
    )
  )
  AND (
    type_filter = 'all'
    OR EXISTS (
      SELECT 1
      FROM poem_places pp
      JOIN places pl ON pl.id = pp.place_id
      WHERE pp.poem_id = p.id AND pl.type = type_filter
    )
  )
  AND (dynasty_filter = 'all' OR p.dynasty_id = dynasty_filter)
  ORDER BY p.title, p.author
  LIMIT 50;
$$;

ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE poem_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynasties ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('places', 'poems', 'poem_places', 'dynasties', 'authors')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

CREATE POLICY "Public read places" ON places FOR SELECT USING (true);
CREATE POLICY "Public read poems" ON poems FOR SELECT USING (true);
CREATE POLICY "Public read poem_places" ON poem_places FOR SELECT USING (true);
CREATE POLICY "Public read dynasties" ON dynasties FOR SELECT USING (true);
CREATE POLICY "Public read authors" ON authors FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON places, poems, poem_places, dynasties, authors FROM anon, authenticated;
GRANT SELECT ON places, poems, poem_places, dynasties, authors, author_routes
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_poems(TEXT, TEXT, TEXT) TO anon, authenticated;
