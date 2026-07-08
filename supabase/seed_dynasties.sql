-- 朝代表 + poems 表 dynasty_id 映射
-- 在 Supabase SQL Editor 中运行: https://supabase.com/dashboard/project/{your-project}/sql/new

-- 1. 创建朝代表
CREATE TABLE IF NOT EXISTS dynasties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  start_year INTEGER,
  end_year INTEGER,
  sort_order INTEGER NOT NULL
);

-- 2. 插入 13 个朝代（先秦 → 当代）
INSERT INTO dynasties (id, name, name_en, start_year, end_year, sort_order) VALUES
  ('pre_qin', '先秦', 'Pre-Qin', -1046, -221, 1),
  ('han',     '汉',   'Han',     -202,  220,  2),
  ('wei_jin', '魏晋', 'Wei-Jin', 220,   420,  3),
  ('nanbei',  '南北朝', 'N. & S. Dyn.', 420, 589, 4),
  ('sui',     '隋',   'Sui',     581,   618,  5),
  ('tang',    '唐',   'Tang',    618,   907,  6),
  ('wudai',   '五代', 'Five Dyn.', 907,  960, 7),
  ('song',    '宋',   'Song',    960,   1279, 8),
  ('yuan',    '元',   'Yuan',    1271,  1368, 9),
  ('ming',    '明',   'Ming',    1368,  1644, 10),
  ('qing',    '清',   'Qing',    1644,  1912, 11),
  ('modern',  '近现代','Modern', 1912,  1949, 12),
  ('contemp', '当代','Contemporary', 1949, NULL, 13)
ON CONFLICT (id) DO NOTHING;

-- 3. poems 表加 dynasty_id 列
DO $$ BEGIN
  ALTER TABLE poems ADD COLUMN dynasty_id TEXT REFERENCES dynasties(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_poems_dynasty_id ON poems(dynasty_id);

-- 4. 根据 dynasty 字段填充 dynasty_id
UPDATE poems SET dynasty_id='tang'    WHERE dynasty='唐';
UPDATE poems SET dynasty_id='song'    WHERE dynasty='宋';
UPDATE poems SET dynasty_id='ming'    WHERE dynasty='明';
UPDATE poems SET dynasty_id='qing'    WHERE dynasty='清';
UPDATE poems SET dynasty_id='yuan'    WHERE dynasty='元';
UPDATE poems SET dynasty_id='han'     WHERE dynasty='汉';
UPDATE poems SET dynasty_id='wei_jin' WHERE dynasty='魏晋';
UPDATE poems SET dynasty_id='wei_jin' WHERE dynasty='晋';      -- 晋 → 魏晋
UPDATE poems SET dynasty_id='wei_jin' WHERE dynasty='三国';    -- 三国 → 魏晋
UPDATE poems SET dynasty_id='nanbei'  WHERE dynasty='南北朝';
UPDATE poems SET dynasty_id='nanbei'  WHERE dynasty='金';      -- 金 → 南北朝（同期）
UPDATE poems SET dynasty_id='nanbei'  WHERE dynasty='先秦';
UPDATE poems SET dynasty_id='sui'     WHERE dynasty='隋';
UPDATE poems SET dynasty_id='wudai'   WHERE dynasty='五代';
UPDATE poems SET dynasty_id='modern'  WHERE dynasty='近现代';
UPDATE poems SET dynasty_id='contemp' WHERE dynasty='当代';

-- 5. RLS
ALTER TABLE dynasties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public dynasties" ON dynasties;
CREATE POLICY "Public dynasties" ON dynasties FOR SELECT USING (true);

-- 6. 验证
SELECT dynasty_id, count(*) FROM poems GROUP BY dynasty_id ORDER BY count(*) DESC;
