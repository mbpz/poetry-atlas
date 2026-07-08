-- 古今地名映射（安全版，仅确认存在的 id）
-- 在 Supabase SQL Editor 中运行

-- 1. places 表增加古地名列
DO $$ BEGIN
  ALTER TABLE places ADD COLUMN ancient_names TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. 建立常见古今映射
UPDATE places SET ancient_names = '{长安}'       WHERE id = 'xian';
UPDATE places SET ancient_names = '{金陵, 建康}'  WHERE id = 'nanjing';
UPDATE places SET ancient_names = '{姑苏}'       WHERE id = 'suzhou';
UPDATE places SET ancient_names = '{临安}'       WHERE id = 'hangzhou';
UPDATE places SET ancient_names = '{广陵}'       WHERE id = 'yangzhou';
UPDATE places SET ancient_names = '{汴京}'       WHERE id = 'kaifeng';
UPDATE places SET ancient_names = '{幽州}'       WHERE id = 'beijing';
UPDATE places SET ancient_names = '{锦官城}'      WHERE id = 'chengdu';
UPDATE places SET ancient_names = '{浔阳}'       WHERE id = 'jiujiang';
UPDATE places SET ancient_names = '{武汉}'       WHERE id = 'wuchang';
UPDATE places SET ancient_names = '{会稽}'       WHERE id = 'shaoxing';
UPDATE places SET ancient_names = '{历下}'       WHERE id = 'jinan';
UPDATE places SET ancient_names = '{益州, 锦官城}' WHERE id = 'yizhou';

-- 3. 验证
SELECT name, ancient_names FROM places WHERE ancient_names != '{}' ORDER BY name;
