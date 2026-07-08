-- 搜索函数（替代 REST API 的 ILIKE 查询，解决中文搜索失效问题）
-- 在 Supabase SQL Editor 中运行

CREATE OR REPLACE FUNCTION search_poems(
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
  annotation TEXT,
  translation TEXT,
  appreciation TEXT,
  places JSONB
)
LANGUAGE plpgsql
AS $func$
DECLARE
  dynasty_name TEXT;
BEGIN
  -- 将朝代 ID 转为中文名
  IF dynasty_filter != 'all' THEN
    SELECT name INTO dynasty_name FROM dynasties WHERE id = dynasty_filter;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.author,
    p.dynasty,
    p.dynasty_id,
    p.content,
    p.annotation,
    p.translation,
    p.appreciation,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', pl.id, 'name', pl.name, 'type', pl.type))
       FROM poem_places pp2
       JOIN places pl ON pl.id = pp2.place_id
       WHERE pp2.poem_id = p.id),
      '[]'::jsonb
    ) AS places
  FROM poems p
  WHERE
    -- keyword match (title / author / content / ancient place names)
    (
      keyword = ''
      OR p.title ILIKE '%' || keyword || '%'
      OR p.author ILIKE '%' || keyword || '%'
      OR p.content ILIKE '%' || keyword || '%'
      OR EXISTS (
        SELECT 1 FROM poem_places pp3
        JOIN places pl2 ON pl2.id = pp3.place_id
        WHERE pp3.poem_id = p.id
          AND (pl2.name ILIKE '%' || keyword || '%'
               OR pl2.ancient_names @> ARRAY[keyword])
      )
    )
    -- type filter
    AND (
      type_filter = 'all'
      OR EXISTS (
        SELECT 1 FROM poem_places pp4
        JOIN places pl3 ON pl3.id = pp4.place_id
        WHERE pp4.poem_id = p.id AND pl3.type = type_filter
      )
    )
    -- dynasty filter
    AND (
      dynasty_filter = 'all'
      OR p.dynasty = dynasty_name
    )
  LIMIT 50;
END;
$func$;

-- test
-- SELECT count(*) FROM search_poems('黄鹤楼');
