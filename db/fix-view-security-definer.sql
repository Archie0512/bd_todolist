-- ============================================================
-- 紧急修复：cards_with_details 视图被改为 SECURITY DEFINER
-- 导致所有匿名查询返回 401
-- 在 Supabase SQL Editor 执行本脚本
-- ============================================================

-- 1. 先删掉有问题的视图
DROP VIEW IF EXISTS cards_with_details;

-- 2. 重建为普通视图（无 SECURITY DEFINER）
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
  cl_complete.remark AS last_completion_remark,
  cl_complete.created_at AS last_completion_at,
  cl_complete.actor_email AS last_completion_by,
  cl_return.remark AS last_return_remark,
  cl_return.created_at AS last_return_at,
  cl_return.actor_email AS last_return_by,
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
