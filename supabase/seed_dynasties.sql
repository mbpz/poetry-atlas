-- Seed dynasties (run after alter_schema_v2.sql)
INSERT INTO dynasties (id, name, name_en, start_year, end_year, sort_order) VALUES
  ('pre_qin', '先秦', 'Pre-Qin', -1046, -221, 1),
  ('han',     '汉',   'Han',     -202,  220,  2),
  ('wei_jin', '魏晋', 'Wei-Jin', 220,   420,  3),
  ('nanbei',  '南北朝', 'N. & S. Dynasties', 420, 589, 4),
  ('sui',     '隋',   'Sui',     581,   618,  5),
  ('tang',    '唐',   'Tang',    618,   907,  6),
  ('wudai',   '五代', 'Five Dyn.', 907,  960, 7),
  ('song',    '宋',   'Song',    960,   1279, 8),
  ('yuan',    '元',   'Yuan',    1271,  1368, 9),
  ('ming',    '明',   'Ming',    1368,  1644, 10),
  ('qing',    '清',   'Qing',    1644,  1912, 11),
  ('modern',  '近现代','Modern', 1912,  1949, 12),
  ('contemp', '当代','Contemporary', 1949, NULL, 13);
