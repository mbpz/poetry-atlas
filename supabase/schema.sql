-- Poetry Atlas — Supabase Database Schema
-- Run this in Supabase SQL Editor to create the tables

-- 地点表
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 诗词表
CREATE TABLE poems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  dynasty TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 诗词-地点关联表
CREATE TABLE poem_places (
  poem_id UUID REFERENCES poems(id) ON DELETE CASCADE,
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'description',
  PRIMARY KEY (poem_id, place_id)
);

-- 索引
CREATE INDEX idx_poem_places_place ON poem_places(place_id);
CREATE INDEX idx_poem_places_poem ON poem_places(poem_id);
CREATE INDEX idx_poems_author ON poems(author);
CREATE INDEX idx_poems_dynasty ON poems(dynasty);

-- RLS: 公开数据所有人可读
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE poem_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public places" ON places FOR SELECT USING (true);
CREATE POLICY "Public poems" ON poems FOR SELECT USING (true);
CREATE POLICY "Public poem_places" ON poem_places FOR SELECT USING (true);
