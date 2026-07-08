-- 给现有 poems 表增加注释、译文、赏析字段
-- 在 Supabase SQL Editor 中运行

ALTER TABLE poems ADD COLUMN IF NOT EXISTS annotation TEXT;
ALTER TABLE poems ADD COLUMN IF NOT EXISTS translation TEXT;
ALTER TABLE poems ADD COLUMN IF NOT EXISTS appreciation TEXT;

-- 为经典诗词添加注释数据（示例）
UPDATE poems SET
  annotation = '〔1〕故人：老朋友，指孟浩然。
〔2〕黄鹤楼：故址在今湖北武汉蛇山黄鹄矶上。
〔3〕烟花：指柳絮如烟、繁花似锦的暮春景物。
〔4〕碧空尽：在碧蓝的天际消失。
〔5〕唯见：只见。
〔6〕天际流：流向天边。',
  translation = '老朋友在黄鹤楼与我辞别，在柳絮如烟、繁花似锦的阳春三月去扬州远游。
孤帆的影子远去，在碧空中消逝，只看见浩浩荡荡的长江向天边流去。',
  appreciation = '这首诗描写了李白在黄鹤楼送别孟浩然的情景。诗人将离别的意境与无边春色、长江流水融为一体的景象融合在一起，以景见情，含蓄蕴藉，不愧为送别诗中的千古名篇。'
WHERE title = '黄鹤楼送孟浩然之广陵' AND author = '李白';

UPDATE poems SET
  annotation = '〔1〕昔人：传说中的仙人。
〔2〕黄鹤楼：故址在今湖北武汉蛇山上。
〔3〕悠悠：飘荡的样子。
〔4〕晴川：阳光照耀下的江面。
〔5〕汉阳：今湖北省武汉市汉阳区。
〔6〕芳草萋萋：形容草木茂盛。
〔7〕晴川阁：在今汉阳龟山东麓。
〔8〕日暮：傍晚。
〔9〕乡关：故乡。
〔10〕烟波：江上烟雾迷蒙的水波。',
  translation = '传说中的仙人早已乘着黄鹤飞去，这里只留下一座空荡荡的黄鹤楼。
黄鹤一去再也没有返回，千百年来只有白云悠悠在空中飘荡。
阳光照耀下的汉阳树木清晰可见，碧绿的芳草覆盖着鹦鹉洲。
黄昏时分天色已暗，何处是我的故乡？江上烟雾迷蒙，一片苍茫，更添愁绪。',
  appreciation = '这首诗一直被人们推崇为题黄鹤楼的绝唱。诗人将昔日的神话与眼前的景物巧妙地结合起来，以景抒情，气韵生动，极富艺术魅力。'
WHERE title = '黄鹤楼' AND author = '崔颢';

UPDATE poems SET
  annotation = '〔1〕西湖：位于浙江省杭州市。
〔2〕潋滟：水面波光闪动的样子。
〔3〕方好：正显出美。
〔4〕空蒙：细雨迷蒙的样子。
〔5〕亦：也。
〔6〕奇：奇妙。
〔7〕西子：西施，春秋时期越国美女。
〔8〕淡妆浓抹：指淡雅和浓艳两种不同的妆饰。
〔9〕相宜：合适。',
  translation = '晴天时，在阳光照耀下，西湖水波荡漾，波光闪动，美极了。
雨天时，在雨幕笼罩下，西湖周围的群山迷蒙一片，景色也非常奇妙。
如果把西湖比作美女西施，淡妆浓抹都是那么合适。',
  appreciation = '这首诗把西湖比作西施，形象地概括了西湖晴雨皆宜的动人美景，想象新颖，比喻精当，成为西湖诗歌的绝唱。'
WHERE title = '饮湖上初晴后雨' AND author = '苏轼';

UPDATE poems SET
  annotation = '〔1〕题：题写。
〔2〕临安邸：南宋都城临安的旅邸。
〔3〕林升：南宋诗人。
〔4〕暖风：南宋统治者的奢靡之风。
〔5〕游人：指寻欢作乐的权贵。
〔6〕汴州：北宋都城汴京，今河南开封。',
  translation = '青山之外还是青山，高楼之外还是高楼。
西湖上的歌舞何时才能停止？暖洋洋的春风把这些游人吹得醉醺醺的，他们简直是把杭州当成了汴州。',
  appreciation = '这首诗是南宋诗人林升讽刺统治者苟且偷安、荒淫无度的小诗。全诗以景起句，妙用一个“熏”字，把“西湖歌舞”的“热闹”渲染出来，再用“醉”字把“游人”纸醉金迷的丑态刻画入微。末句冷峻一问，鞭辟入里，发人深省。'
WHERE title = '题临安邸' AND author = '林升';

-- 验证
SELECT title, author,
  CASE WHEN annotation IS NOT NULL THEN '✓' ELSE '✗' END AS has_annotation,
  CASE WHEN translation IS NOT NULL THEN '✓' ELSE '✗' END AS has_translation,
  CASE WHEN appreciation IS NOT NULL THEN '✓' ELSE '✗' END AS has_appreciation
FROM poems WHERE annotation IS NOT NULL LIMIT 5;
