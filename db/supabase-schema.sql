-- ============================================================
-- Tasks.md - Supabase Database Schema（主 schema，全量）
-- 用于初始化全新数据库
-- 已包含：6 个 lanes（含「退回」）、card_status_logs、card-images bucket policy、扩展视图
-- 日期：2026-07-21
--
-- ⚠️ 执行方式（重要，不能全文粘贴一次跑完）：
--   【步骤 A】在 Dashboard -> Storage -> New bucket 创建 card-images（public）
--            （用 SQL 创建 bucket 会报 RLS 错，必须走 UI，详见第 5 节注释）
--   【步骤 B】本 SQL 文件全文可在 SQL Editor 粘贴执行
--            （storage bucket 的 INSERT 已从 SQL 中移除，只保留 CREATE POLICY）
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

-- 完成/退回备注历史表（2026-07-21 新增）
CREATE TABLE IF NOT EXISTS card_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  -- action: 'complete' = 完成（移到「已完成」），'return' = 退回（移到「退回」）
  action TEXT NOT NULL CHECK (action IN ('complete', 'return')),
  remark TEXT NOT NULL DEFAULT '',
  -- 操作人邮箱：登录用户填邮箱，匿名场景留 NULL
  actor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_logs_card_id ON card_status_logs(card_id, created_at DESC);

-- 2. Insert default lanes（含「退回」，sort_order=2）
INSERT INTO lanes (name, sort_order) VALUES
  ('即时', 0),
  ('待分配', 1),
  ('退回', 2),
  ('未完成', 3),
  ('已完成', 4),
  ('长期', 5)
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
ALTER TABLE card_status_logs ENABLE ROW LEVEL SECURITY;
-- 注意：不要写 `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`
-- 那行会报 `must be owner of table objects`，且 Supabase 新版默认已启用 storage RLS，无需 ALTER。
-- storage bucket 的创建和 policy 见下方第 5 节末尾的说明。

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
--   - Anonymous users can INSERT/UPDATE/DELETE cards only in "待分配" or "退回" lane
--   - Authenticated (admin) can do everything
CREATE POLICY "cards_select_all" ON cards FOR SELECT USING (true);

-- Anonymous insert: only into 待分配 or 退回 lane
CREATE POLICY cards_insert_anon_pending ON cards FOR INSERT
  TO anon
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  );

CREATE POLICY "cards_insert_admin" ON cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anonymous update: only cards in 待分配 or 退回 lane
CREATE POLICY cards_update_anon_pending ON cards FOR UPDATE
  TO anon
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  )
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  );

CREATE POLICY "cards_update_admin" ON cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous delete: only cards in 待分配 or 退回 lane
CREATE POLICY cards_delete_anon_pending ON cards FOR DELETE
  TO anon
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
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

-- card_status_logs: 所有人可读，仅登录用户可写入/删除（完成/退回仅管理员触发）
CREATE POLICY status_logs_select_all ON card_status_logs FOR SELECT USING (true);
CREATE POLICY status_logs_insert_auth ON card_status_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY status_logs_delete_auth ON card_status_logs FOR DELETE TO authenticated USING (true);

-- card-images Storage Bucket + RLS
-- ------------------------------------------------------------
-- ⚠️ 重要：storage bucket 必须在 Supabase Dashboard UI 创建，不能用 SQL！
--   用 SQL `INSERT INTO storage.buckets` 会报：
--     ERROR: new row violates row-level security policy for table "buckets"
--   原因：storage.buckets 表本身有 RLS，postgres 角色不是 owner。
--
-- 操作步骤：
--   1. 打开 Dashboard -> Storage -> New bucket
--      - Name: card-images
--      - Public bucket: ✅ 打开
--      - Save
--   2. bucket 创建后，下面的 5 条 CREATE POLICY 可以在本 SQL Editor 跑
--      （注意：不要执行 `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`，
--       会报 `must be owner of table objects`，且本就多余）
-- ------------------------------------------------------------

CREATE POLICY images_select_all ON storage.objects
  FOR SELECT
  USING (bucket_id = 'card-images');

CREATE POLICY images_insert_auth ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'card-images');

-- 匿名上传（同事提交待办附图）：客户端校验卡片必须在「待分配」或「退回」列
CREATE POLICY images_insert_anon ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'card-images');

CREATE POLICY images_delete_auth ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'card-images');

CREATE POLICY images_update_auth ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'card-images')
  WITH CHECK (bucket_id = 'card-images');

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

-- 7. Create a view for easy card+lane+tags+status_logs querying
--    加入最近一次完成/退回备注（LATERAL 子查询取每个 card 最近一条）
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
  ) AS tags,
  -- 最近一次「完成」备注
  cl_complete.remark AS last_completion_remark,
  cl_complete.created_at AS last_completion_at,
  cl_complete.actor_email AS last_completion_by,
  -- 最近一次「退回」备注
  cl_return.remark AS last_return_remark,
  cl_return.created_at AS last_return_at,
  cl_return.actor_email AS last_return_by,
  -- 任意状态的最近一次变更时间
  GREATEST(
    cl_complete.created_at,
    cl_return.created_at
  ) AS last_status_change_at
FROM cards c
JOIN lanes l ON c.lane_id = l.id
LEFT JOIN card_tags ct ON ct.card_id = c.id
LEFT JOIN tags t ON ct.tag_id = t.id
LEFT JOIN LATERAL (
  SELECT remark, created_at, actor_email
  FROM card_status_logs
  WHERE card_id = c.id AND action = 'complete'
  ORDER BY created_at DESC
  LIMIT 1
) cl_complete ON true
LEFT JOIN LATERAL (
  SELECT remark, created_at, actor_email
  FROM card_status_logs
  WHERE card_id = c.id AND action = 'return'
  ORDER BY created_at DESC
  LIMIT 1
) cl_return ON true
GROUP BY c.id, l.name,
  cl_complete.remark, cl_complete.created_at, cl_complete.actor_email,
  cl_return.remark, cl_return.created_at, cl_return.actor_email;
