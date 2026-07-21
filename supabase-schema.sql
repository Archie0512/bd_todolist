-- ============================================================
-- Tasks.md - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS lanes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT DEFAULT '',
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_moved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  -- Track if this card was submitted by a colleague (anonymous user)
  is_submitted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE IF NOT EXISTS sort_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
  sort_data JSONB DEFAULT '{}'
);

-- 2. Insert default lanes
INSERT INTO lanes (name, sort_order) VALUES
  ('即时', 0),
  ('待分配', 1),
  ('未完成', 2),
  ('已完成', 3),
  ('长期', 4)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert default tags
INSERT INTO tags (name, color) VALUES
  ('EAS业务', '#2563eb'),
  ('EAS财务', '#dc2626'),
  ('EAS开发', '#7c3aed'),
  ('金蝶星瀚', '#ea580c'),
  ('二手车系统Demo', '#16a34a'),
  ('宝德拍系统', '#0891b2'),
  ('日常运维', '#65a30d')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS (Row Level Security)
ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sort_orders ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Lanes: everyone can read, only admin can write
CREATE POLICY "lanes_select_all" ON lanes FOR SELECT USING (true);
CREATE POLICY "lanes_insert_admin" ON lanes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lanes_update_admin" ON lanes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lanes_delete_admin" ON lanes FOR DELETE TO authenticated USING (true);

-- Tags: everyone can read, only admin can write
CREATE POLICY "tags_select_all" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_insert_admin" ON tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tags_update_admin" ON tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tags_delete_admin" ON tags FOR DELETE TO authenticated USING (true);

-- Cards: 
--   - Everyone can read all cards
--   - Anonymous users can INSERT cards only into "待分配" lane
--   - Anonymous users can UPDATE cards only in "待分配" lane
--   - Authenticated (admin) can do everything
CREATE POLICY "cards_select_all" ON cards FOR SELECT USING (true);

-- Anonymous insert: only into 待分配 lane, mark as submitted
CREATE POLICY "cards_insert_anon_pending" ON cards FOR INSERT 
  TO anon 
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name = '待分配')
  );

CREATE POLICY "cards_insert_admin" ON cards FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Anonymous update: only cards in 待分配 lane
CREATE POLICY "cards_update_anon_pending" ON cards FOR UPDATE 
  TO anon 
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name = '待分配')
  )
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name = '待分配')
  );

CREATE POLICY "cards_update_admin" ON cards FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Anonymous delete: only cards in 待分配 lane
CREATE POLICY "cards_delete_anon_pending" ON cards FOR DELETE 
  TO anon 
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name = '待分配')
  );

CREATE POLICY "cards_delete_admin" ON cards FOR DELETE 
  TO authenticated 
  USING (true);

-- card_tags: everyone can read, only admin can write
CREATE POLICY "card_tags_select_all" ON card_tags FOR SELECT USING (true);
CREATE POLICY "card_tags_insert_admin" ON card_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "card_tags_delete_admin" ON card_tags FOR DELETE TO authenticated USING (true);

-- sort_orders: everyone can read, only admin can write
CREATE POLICY "sort_orders_select_all" ON sort_orders FOR SELECT USING (true);
CREATE POLICY "sort_orders_insert_admin" ON sort_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sort_orders_update_admin" ON sort_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sort_orders_delete_admin" ON sort_orders FOR DELETE TO authenticated USING (true);

-- 6. Create updated_at trigger for cards
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at 
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. Create a view for easy card+lane+tags querying
CREATE OR REPLACE VIEW cards_with_details AS
SELECT 
  c.id,
  c.name,
  c.content,
  c.lane_id,
  l.name AS lane_name,
  c.sort_order,
  c.created_at,
  c.updated_at,
  c.last_moved_at,
  c.is_submitted,
  c.created_by,
  COALESCE(
    ARRAY_AGG(
      JSON_BUILD_OBJECT('name', t.name, 'backgroundColor', t.color)
    ) FILTER (WHERE t.name IS NOT NULL),
    ARRAY[]::JSON[]
  ) AS tags
FROM cards c
JOIN lanes l ON c.lane_id = l.id
LEFT JOIN card_tags ct ON ct.card_id = c.id
LEFT JOIN tags t ON ct.tag_id = t.id
GROUP BY c.id, l.name;