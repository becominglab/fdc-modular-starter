-- workspace_data 容量監視クエリ（Phase 9.7-C）
-- 目的: workspace_data の P95 サイズが 200KB 以下であることを確認
-- 実行: psql $DATABASE_URL -f scripts/monitor-workspace-size.sql

-- P95 サイズ計測
WITH size_stats AS (
  SELECT
    wd.workspace_id,
    w.name,
    pg_column_size(wd.data) AS size_bytes,
    ROUND(pg_column_size(wd.data) / 1024.0, 2) AS size_kb
  FROM workspace_data wd
  INNER JOIN workspaces w ON w.id = wd.workspace_id
)
SELECT
  COUNT(*) AS total_workspaces,
  ROUND(AVG(size_kb)::numeric, 2) AS avg_size_kb,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY size_kb)::numeric, 2) AS p50_size_kb,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY size_kb)::numeric, 2) AS p95_size_kb,
  ROUND(MAX(size_kb)::numeric, 2) AS max_size_kb
FROM size_stats;

-- P95超過ワークスペース一覧（200KB以上）
SELECT
  wd.workspace_id AS id,
  w.name,
  ROUND(pg_column_size(wd.data) / 1024.0, 2) AS size_kb
FROM workspace_data wd
INNER JOIN workspaces w ON w.id = wd.workspace_id
WHERE pg_column_size(wd.data) > 204800  -- 200KB
ORDER BY pg_column_size(wd.data) DESC;

-- 完了条件（Phase 9.7-C DOD）:
-- ✅ P95 < 200KB であること
-- ⚠️ P95 >= 200KB の場合、Phase 10 開始前に軽量化策を実施すること
