-- ============================================================
-- Tasks.md - Schema Migration v2
-- 日期：2026-07-21
-- 变更内容：
--   1. 新增「退回」lane（sort_order=2，位于「待分配」之后）
--   2. 调整原 lanes 的 sort_order（未完成 3、已完成 4、长期 5）
--   3. 扩展匿名 RLS：允许匿名用户对「退回」列的卡片进行 INSERT/UPDATE/DELETE
--   4. 新建 card_status_logs 表（完成/退回备注历史）
--   5. 新建 card-images Storage Bucket + RLS
--   6. 扩展 cards_with_details 视图（加入最近一次完成/退回备注）
--
-- 执行方式：在 Supabase SQL Editor 全文粘贴执行
-- 幂等性：所有语句含 IF NOT EXISTS / ON CONFLICT 守卫，可重复执行
-- ============================================================

-- ============================================================
-- 1. 新增「退回」lane 并调整 sort_order
-- ============================================================

-- 先把现有的「未完成/已完成/长期」往后挪一位（给「退回」腾出 sort_order=2）
UPDATE lanes SET sort_order = 5 WHERE name = '长期' AND sort_order = 4;
UPDATE lanes SET sort_order = 4 WHERE name = '已完成' AND sort_order = 3;
UPDATE lanes SET sort_order = 3 WHERE name = '未完成' AND sort_order = 2;

-- 插入「退回」lane（如果不存在）
INSERT INTO lanes (name, sort_order) VALUES ('退回', 2)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- 验证最终顺序（执行后在 Results 面板应看到 6 行：即时/待分配/退回/未完成/已完成/长期）
-- SELECT name, sort_order FROM lanes ORDER BY sort_order;


-- ============================================================
-- 2. 扩展匿名 RLS：允许匿名用户对「退回」列的卡片操作
-- 策略与「待分配」一致，把两个 lane 都纳入白名单
-- ============================================================

-- 删除旧的「仅待分配」匿名策略（先 DROP 再 CREATE，避免策略叠加）
DROP POLICY IF EXISTS cards_insert_anon_pending ON cards;
DROP POLICY IF EXISTS cards_update_anon_pending ON cards;
DROP POLICY IF EXISTS cards_delete_anon_pending ON cards;

-- 新策略：匿名 INSERT/UPDATE/DELETE 仅限「待分配」或「退回」列
CREATE POLICY cards_insert_anon_pending ON cards FOR INSERT
  TO anon
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  );

CREATE POLICY cards_update_anon_pending ON cards FOR UPDATE
  TO anon
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  )
  WITH CHECK (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  );

CREATE POLICY cards_delete_anon_pending ON cards FOR DELETE
  TO anon
  USING (
    lane_id IN (SELECT id FROM lanes WHERE name IN ('待分配', '退回'))
  );


-- ============================================================
-- 3. 新建 card_status_logs 表（完成/退回备注历史）
-- ============================================================

CREATE TABLE IF NOT EXISTS card_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  -- action: 'complete' = 完成（移到「已完成」），'return' = 退回（移到「退回」）
  action TEXT NOT NULL CHECK (action IN ('complete', 'return')),
  remark TEXT NOT NULL DEFAULT '',
  -- 操作人邮箱：登录用户填邮箱，匿名场景留 NULL（当前设计仅登录用户可完成/退回）
  actor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE card_status_logs ENABLE ROW LEVEL SECURITY;

-- 所有人可读（与 cards 一致，匿名同事能看到流转历史）
CREATE POLICY status_logs_select_all ON card_status_logs FOR SELECT USING (true);

-- 仅登录用户可 INSERT（业务设计：完成/退回仅管理员触发）
CREATE POLICY status_logs_insert_auth ON card_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 仅登录用户可 DELETE（用于纠正误录）
CREATE POLICY status_logs_delete_auth ON card_status_logs FOR DELETE
  TO authenticated
  USING (true);

-- 索引：按 card_id 查询历史（StatusLogTimeline 组件会用）
CREATE INDEX IF NOT EXISTS idx_status_logs_card_id ON card_status_logs(card_id, created_at DESC);


-- ============================================================
-- 4. 新建 card-images Storage Bucket + RLS
-- ============================================================

-- 4.1 创建 bucket（public = 公开读，前端可通过 getPublicUrl 直接访问）
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 4.2 Storage RLS 策略（注意：storage.objects 表的 RLS，不是 cards 表）
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 所有人可读（public bucket 的标准策略，getPublicUrl 才能访问到）
CREATE POLICY images_select_all ON storage.objects
  FOR SELECT
  USING (bucket_id = 'card-images');

-- 登录用户可在任意位置上传图片（管理员处理任务时可加图）
CREATE POLICY images_insert_auth ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'card-images');

-- 匿名用户也可上传图片（同事提交待办时附截图说明问题）
-- 安全控制在前端：uploadImage 里校验卡片必须在「待分配」或「退回」列才允许调上传
-- 客户端限制：类型 image/*，大小 < 5MB
CREATE POLICY images_insert_anon ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'card-images');

-- 仅登录用户可删除图片（避免匿名误删/恶意删）
CREATE POLICY images_delete_auth ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'card-images');

-- 仅登录用户可更新图片（覆盖上传场景）
CREATE POLICY images_update_auth ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'card-images')
  WITH CHECK (bucket_id = 'card-images');


-- ============================================================
-- 5. 扩展 cards_with_details 视图（加入最近一次完成/退回备注）
-- ============================================================

-- 用 LATERAL 子查询取每个卡片最近一次 complete / return 的 remark 和时间
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
  -- 任意状态的最近一次变更时间（用于排序）
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


-- ============================================================
-- 6. 验证（执行后在 Results 面板应看到）
-- ============================================================

-- lanes 应有 6 行：即时(0)/待分配(1)/退回(2)/未完成(3)/已完成(4)/长期(5)
-- SELECT name, sort_order FROM lanes ORDER BY sort_order;

-- card_status_logs 表应存在且 RLS 已启用
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'card_status_logs';

-- storage bucket 应存在且 public=true
-- SELECT id, name, public FROM storage.buckets WHERE id = 'card-images';

-- cards_with_details 视图应包含新增的备注字段
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'cards_with_details' AND column_name LIKE 'last_%';
