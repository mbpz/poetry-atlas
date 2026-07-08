-- Schema v2: Add multi-dimensional place support
-- Run this in Supabase SQL Editor AFTER schema.sql

-- Add place type column (city / tower / mountain / lake / temple / pass / river / bridge / garden / palace)
ALTER TABLE places ADD COLUMN type TEXT DEFAULT 'city'
  CHECK (type IN ('city', 'tower', 'mountain', 'lake', 'temple', 'pass', 'river', 'bridge', 'garden', 'palace'));

-- Index for type filtering
CREATE INDEX idx_places_type ON places(type);

-- RLS: allow insert (for seed script)
CREATE POLICY "Allow insert" ON places FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON poems FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON poem_places FOR INSERT WITH CHECK (true);
