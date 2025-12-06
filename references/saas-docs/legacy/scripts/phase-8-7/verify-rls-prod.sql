-- ===================================================================
-- Phase 8-7: RLS 動作検証スクリプト（本番環境用）
-- ===================================================================
--
-- 【目的】
-- 本番環境で RLS ポリシーが正しく適用され、ユーザーごとのアクセス制限が効いているか確認する
--
-- 【使用方法】
-- psql $DATABASE_URL -f scripts/phase-8-7/verify-rls-prod.sql
--
-- または、対話的に検証:
-- psql $DATABASE_URL
-- \i scripts/phase-8-7/verify-rls-prod.sql
--
-- ===================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  ⚠️  Phase 8-7: 本番環境 RLS 動作検証 ⚠️'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ===================================================================
-- 1. RLS が有効になっているか確認
-- ===================================================================

\echo '1. RLS が有効になっているか確認'
\echo '期待: すべてのテーブルで rowsecurity = t'
\echo ''

SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ 有効'
    ELSE '❌ 無効'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs')
ORDER BY tablename;

\echo ''

-- ===================================================================
-- 2. ポリシー一覧の確認
-- ===================================================================

\echo '2. ポリシー一覧の確認'
\echo '期待: すべてのテーブルにポリシーが設定されている'
\echo ''

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''

-- ===================================================================
-- 3. ユーザー数とワークスペース数の確認
-- ===================================================================

\echo '3. 本番環境のデータ確認'
\echo ''

\echo 'ユーザー数:'
SELECT COUNT(*) as total_users FROM users;

\echo ''
\echo 'ワークスペース数:'
SELECT COUNT(*) as total_workspaces FROM workspaces;

\echo ''
\echo 'ワークスペースメンバー数:'
SELECT COUNT(*) as total_members FROM workspace_members;

\echo ''

-- ===================================================================
-- 4. セッション変数のテスト（本番環境の実際のユーザーID）
-- ===================================================================

\echo '4. セッション変数のテスト（サンプル）'
\echo '注意: 実際のユーザーID で検証してください'
\echo ''

-- 本番環境の最初のユーザーID を取得
\set first_user_id `psql -t -c "SELECT id FROM users LIMIT 1"`

BEGIN;

\echo '最初のユーザーでログイン:'
SET LOCAL app.current_user_id = :'first_user_id';

\echo 'users テーブルを SELECT（期待: 1行のみ）:'
SELECT COUNT(*) as user_count FROM users;

\echo ''
\echo 'workspaces テーブルを SELECT（期待: 所属 Workspace のみ）:'
SELECT COUNT(*) as workspace_count FROM workspaces;

ROLLBACK;

\echo ''

-- ===================================================================
-- 5. インデックスの確認
-- ===================================================================

\echo '5. インデックスの確認'
\echo '期待: パフォーマンス最適化インデックスが作成されている'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('workspace_members', 'audit_logs')
ORDER BY tablename, indexname;

\echo ''

-- ===================================================================
-- 6. workspace_keys テーブルの確認
-- ===================================================================

\echo '6. workspace_keys テーブルの確認'
\echo '期待: Workspace 鍵が暗号化されて保存されている'
\echo ''

SELECT
  workspace_id,
  encrypted_key::jsonb->>'version' as version,
  LENGTH(encrypted_key::jsonb->>'ciphertext') as ciphertext_length,
  created_at,
  updated_at
FROM workspace_keys
LIMIT 5;

\echo ''

-- ===================================================================
-- 7. テスト完了
-- ===================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  本番環境 RLS 動作検証が完了しました'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '次のステップ:'
\echo '  1. すべてのテーブルで RLS が有効（✅）であることを確認'
\echo '  2. 本番アプリケーションで動作確認'
\echo '  3. ログインして Workspace データが正常に読み込めるか確認'
\echo '  4. データの作成・更新・削除が正常に動作するか確認'
\echo ''
\echo '問題がある場合:'
\echo '  - 即座にロールバック実行'
\echo '  - psql $DATABASE_URL < backups/prod_YYYYMMDD_HHMMSS.sql'
\echo ''
