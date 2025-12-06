-- ===================================================================
-- Phase 8-7: RLS ロールバックスクリプト
-- ===================================================================
--
-- 【目的】
-- RLS ポリシーを削除し、RLS を無効化する（緊急時のロールバック用）
--
-- 【使用方法】
-- psql $DATABASE_URL -f scripts/phase-8-7/rollback-rls.sql
--
-- 【警告】
-- このスクリプトはデータベースのセキュリティ設定を変更します。
-- 実行後は必ず再度 RLS を適用するか、データベースを完全に復元してください。
--
-- ===================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  ⚠️⚠️⚠️  RLS ロールバックを開始します  ⚠️⚠️⚠️'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

BEGIN;

-- ===================================================================
-- 1. users テーブルのポリシー削除
-- ===================================================================

\echo '1. users テーブルのポリシー削除中...'

DROP POLICY IF EXISTS users_select_self ON users;
DROP POLICY IF EXISTS users_update_self ON users;

\echo '  ✅ users ポリシー削除完了'

-- ===================================================================
-- 2. workspaces テーブルのポリシー削除
-- ===================================================================

\echo '2. workspaces テーブルのポリシー削除中...'

DROP POLICY IF EXISTS workspaces_select_member ON workspaces;
DROP POLICY IF EXISTS workspaces_update_admin ON workspaces;
DROP POLICY IF EXISTS workspaces_insert_authenticated ON workspaces;

\echo '  ✅ workspaces ポリシー削除完了'

-- ===================================================================
-- 3. workspace_members テーブルのポリシー削除
-- ===================================================================

\echo '3. workspace_members テーブルのポリシー削除中...'

DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
DROP POLICY IF EXISTS workspace_members_modify_admin ON workspace_members;

\echo '  ✅ workspace_members ポリシー削除完了'

-- ===================================================================
-- 4. workspace_data テーブルのポリシー削除
-- ===================================================================

\echo '4. workspace_data テーブルのポリシー削除中...'

DROP POLICY IF EXISTS workspace_data_select_member ON workspace_data;
DROP POLICY IF EXISTS workspace_data_modify_member ON workspace_data;

\echo '  ✅ workspace_data ポリシー削除完了'

-- ===================================================================
-- 5. audit_logs テーブルのポリシー削除
-- ===================================================================

\echo '5. audit_logs テーブルのポリシー削除中...'

DROP POLICY IF EXISTS audit_logs_select_admin ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_member ON audit_logs;

\echo '  ✅ audit_logs ポリシー削除完了'

-- ===================================================================
-- 6. RLS を無効化
-- ===================================================================

\echo '6. RLS を無効化中...'

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

\echo '  ✅ RLS 無効化完了'

COMMIT;

-- ===================================================================
-- 7. 確認
-- ===================================================================

\echo ''
\echo '7. RLS 無効化の確認:'

SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '❌ 有効'
    ELSE '✅ 無効'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs')
ORDER BY tablename;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  RLS ロールバックが完了しました'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '⚠️  重要: RLS が無効化されました'
\echo '  - データベースは保護されていない状態です'
\echo '  - 必ず再度 RLS を適用するか、バックアップから復元してください'
\echo ''
\echo '次のステップ:'
\echo '  1. 問題を修正する'
\echo '  2. 再度 RLS を適用: psql $DATABASE_URL -f migrations/001-rls-policies.sql'
\echo '  3. または、バックアップから復元: psql $DATABASE_URL < backups/prod_YYYYMMDD_HHMMSS.sql'
\echo ''
