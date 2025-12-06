-- ===================================================================
-- Phase 8-7: RLS 動作検証スクリプト（テスト環境用）
-- ===================================================================
--
-- 【目的】
-- RLS ポリシーが正しく適用され、ユーザーごとのアクセス制限が効いているか確認する
--
-- 【使用方法】
-- psql $TEST_DATABASE_URL -f scripts/phase-8-7/verify-rls-test.sql
--
-- または、対話的に検証:
-- psql $TEST_DATABASE_URL
-- \i scripts/phase-8-7/verify-rls-test.sql
--
-- ===================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  Phase 8-7: RLS 動作検証'
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
-- 3. セッション変数のテスト（ユーザー1）
-- ===================================================================

\echo '3. セッション変数のテスト（ユーザー1）'
\echo 'SET LOCAL app.current_user_id = ''1'';'
\echo ''

BEGIN;

-- ユーザー1としてログイン
SET LOCAL app.current_user_id = '1';

\echo 'ユーザー1で users テーブルを SELECT:'
\echo '期待: ユーザーID=1のレコードのみ表示される'
\echo ''

SELECT id, email, name FROM users LIMIT 5;

\echo ''
\echo 'ユーザー1で workspaces テーブルを SELECT:'
\echo '期待: ユーザー1が所属する Workspace のみ表示される'
\echo ''

SELECT w.id, w.name FROM workspaces w LIMIT 5;

ROLLBACK;

\echo ''

-- ===================================================================
-- 4. セッション変数のテスト（ユーザー2）
-- ===================================================================

\echo '4. セッション変数のテスト（ユーザー2）'
\echo 'SET LOCAL app.current_user_id = ''2'';'
\echo ''

BEGIN;

-- ユーザー2としてログイン
SET LOCAL app.current_user_id = '2';

\echo 'ユーザー2で users テーブルを SELECT:'
\echo '期待: ユーザーID=2のレコードのみ表示される'
\echo ''

SELECT id, email, name FROM users LIMIT 5;

\echo ''
\echo 'ユーザー2で workspaces テーブルを SELECT:'
\echo '期待: ユーザー2が所属する Workspace のみ表示される'
\echo ''

SELECT w.id, w.name FROM workspaces w LIMIT 5;

ROLLBACK;

\echo ''

-- ===================================================================
-- 5. アクセス制限のテスト
-- ===================================================================

\echo '5. アクセス制限のテスト'
\echo '期待: 他ユーザーのデータにアクセスできない（0 rows）'
\echo ''

BEGIN;

-- ユーザー1としてログイン
SET LOCAL app.current_user_id = '1';

\echo 'ユーザー1で全ユーザーを SELECT（期待: 1行のみ）:'
SELECT COUNT(*) as user_count FROM users;

\echo ''
\echo 'ユーザー1で workspace_members を SELECT（期待: ユーザー1の所属のみ）:'
SELECT COUNT(*) as member_count FROM workspace_members WHERE user_id = 1;

ROLLBACK;

\echo ''

-- ===================================================================
-- 6. インデックスの確認
-- ===================================================================

\echo '6. インデックスの確認'
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
-- 7. workspace_keys テーブルの確認
-- ===================================================================

\echo '7. workspace_keys テーブルの確認'
\echo '期待: テーブルが存在し、必要なカラムが定義されている'
\echo ''

-- テーブル存在確認
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workspace_keys'
ORDER BY ordinal_position;

\echo ''
\echo '期待される出力:'
\echo '  workspace_id    | integer | NO'
\echo '  encrypted_key   | jsonb   | NO'
\echo '  created_at      | timestamp without time zone | YES'
\echo '  updated_at      | timestamp without time zone | YES'
\echo ''

-- インデックス確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'workspace_keys';

\echo ''

-- ===================================================================
-- 8. 外部キー制約の確認
-- ===================================================================

\echo '8. 外部キー制約の確認'
\echo '期待: workspace_keys が workspaces を参照している'
\echo ''

SELECT
  tc.table_name AS table_name,
  kcu.column_name AS column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('workspace_keys', 'workspace_members', 'workspace_data', 'audit_logs', 'workspaces')
ORDER BY tc.table_name, kcu.column_name;

\echo ''

-- ===================================================================
-- 9. RLS ポリシーの詳細内容確認
-- ===================================================================

\echo '9. RLS ポリシーの詳細内容確認'
\echo '期待: USING 句で app.current_user_id を参照している'
\echo ''

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

\echo ''
\echo '期待: users_select_self の USING 句に app.current_user_id が含まれる'
\echo ''

-- ===================================================================
-- 10. セッション変数未設定時の動作確認
-- ===================================================================

\echo '10. セッション変数未設定時の動作確認'
\echo '期待: app.current_user_id が未設定の場合、データが見えない（0 rows）'
\echo ''

BEGIN;

-- セッション変数を明示的にリセット
RESET app.current_user_id;

\echo 'セッション変数未設定で users テーブルを SELECT:'
SELECT COUNT(*) as user_count FROM users;

\echo ''
\echo '期待: user_count = 0'
\echo ''

ROLLBACK;

\echo ''

-- ===================================================================
-- 11. パフォーマンステスト（EXPLAIN ANALYZE）
-- ===================================================================

\echo '11. パフォーマンステスト（EXPLAIN ANALYZE）'
\echo '期待: インデックススキャンが使用されている'
\echo ''

-- テストデータを挿入（トランザクション内）
BEGIN;

-- ユーザー挿入
INSERT INTO users (google_sub, email, name, global_role) VALUES
  ('test-sub-1', 'test1@example.com', 'Test User 1', 'normal'),
  ('test-sub-2', 'test2@example.com', 'Test User 2', 'normal');

-- Workspace 挿入
INSERT INTO workspaces (name, created_by) VALUES
  ('Test Workspace 1', 1),
  ('Test Workspace 2', 2);

-- Workspace Members 挿入
INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  (1, 1, 'owner'),
  (2, 2, 'owner');

-- セッション変数設定
SET LOCAL app.current_user_id = '1';

-- EXPLAIN ANALYZE 実行
\echo 'ユーザー1で workspaces テーブルを SELECT（EXPLAIN ANALYZE）:'
EXPLAIN ANALYZE
SELECT * FROM workspaces;

\echo ''

ROLLBACK;

\echo '期待: Index Scan または Bitmap Index Scan が使用されている'
\echo ''

-- ===================================================================
-- 12. テスト完了
-- ===================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '  RLS 動作検証が完了しました（全12項目）'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '次のステップ:'
\echo '  1. すべてのテーブルで RLS が有効（✅）であることを確認'
\echo '  2. ユーザーごとにアクセス制限が効いていることを確認'
\echo '  3. workspace_keys テーブルが存在することを確認'
\echo '  4. 外部キー制約が正しく設定されていることを確認'
\echo '  5. 問題がなければ本番環境への適用に進む'
\echo ''
\echo '問題がある場合:'
\echo '  - ロールバック: psql $TEST_DATABASE_URL -f scripts/phase-8-7/rollback-rls.sql'
\echo '  - または: psql $TEST_DATABASE_URL < backups/test_YYYYMMDD_HHMMSS.sql'
\echo ''
