# RLS 適用・検証ガイド

**Version:** 1.1
**作成日:** 2025-11-13
**最終更新:** 2025-01-24（Phase 9 完了対応）
**Phase:** 7-12 STEP4.9 → Phase 9 完了

---

## 📋 概要

本ドキュメントは、Vercel Postgres における Row Level Security (RLS) ポリシーの適用手順と、
動作確認方法を記述します。

**RLS の重要性:**
- データベースレベルでのアクセス制御
- アプリケーションロジックのバグがあっても、DB レベルで保護
- ユーザーごとのデータ隔離を保証

---

## 🚨 重要な前提条件

### 1. データベース接続情報

RLS 適用には、PostgreSQL への直接アクセスが必要です。

**Phase 9 完了: Supabase PostgreSQL 17.6 移行済み**

```bash
# Phase 9 完了後の接続方式（二重化）

# API routes用 (Transaction Pooler)
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# マイグレーション/管理スクリプト用 (Direct Connection)
DIRECT_DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"

# RLS 適用時は Direct Connection を使用
echo $DIRECT_DATABASE_URL

# Vercel から取得する場合
vercel env pull .env.local
source .env.local
```

**重要**: RLS ポリシー適用やマイグレーション実行には、必ず `DIRECT_DATABASE_URL` を使用してください。Transaction Pooler（`DATABASE_URL`）では prepared statements がサポートされないため、複雑な SQL 操作に失敗します。

### 2. バックアップの作成

**必須**: RLS 適用前に必ずデータベースのバックアップを作成してください。

```bash
# Vercel Dashboard でバックアップを作成
# Settings > Storage > Postgres > Backups > Create Backup

# または pg_dump でローカルバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. テスト環境での検証

本番環境に適用する前に、**必ずテスト環境で検証**してください。

```bash
# テスト環境の DATABASE_URL を使用
export DATABASE_URL=$TEST_DATABASE_URL
```

---

## 📦 Phase 1: RLS ポリシーの適用

### Step 1: マイグレーションファイルの確認

```bash
cd /Users/5dmgmt/プラグイン/foundersdirect

# マイグレーションファイルを確認
cat migrations/001-rls-policies.sql
```

### Step 2: RLS ポリシーの適用

#### 方法A: psql コマンドで適用（推奨）

```bash
# マイグレーション適用
psql $DATABASE_URL -f migrations/001-rls-policies.sql

# 成功した場合の出力例:
# ALTER TABLE
# CREATE POLICY
# CREATE POLICY
# ...
# COMMIT
```

#### 方法B: Vercel Dashboard で適用

1. Vercel Dashboard を開く
2. プロジェクトを選択
3. **Storage** > **Postgres** > **Query** タブを開く
4. `migrations/001-rls-policies.sql` の内容をコピー＆ペースト
5. **Run Query** を実行

### Step 3: RLS 適用の確認

```bash
# RLS が有効になっているか確認
psql $DIRECT_DATABASE_URL -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs', 'sessions');
"

# 期待される出力（Phase 9 完了版）:
#       tablename       | rowsecurity
# ----------------------+-------------
#  users                | t
#  workspaces           | t
#  workspace_members    | t
#  workspace_data       | t
#  audit_logs           | t
#  sessions             | t  ← Phase 9 で追加
```

### Step 4: ポリシー一覧の確認

```bash
# ポリシー一覧を表示
psql $DIRECT_DATABASE_URL -c "
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"

# 期待される出力例（Phase 9 完了版 - 15ポリシー）:
#  schemaname |      tablename      |            policyname             | cmd
# ------------+---------------------+-----------------------------------+------
#  public     | audit_logs          | audit_logs_insert_member          | INSERT
#  public     | audit_logs          | audit_logs_select_admin           | SELECT
#  public     | sessions            | sessions_delete_own               | DELETE  ← Phase 9 追加
#  public     | sessions            | sessions_insert_authenticated     | INSERT  ← Phase 9 追加
#  public     | sessions            | sessions_select_own               | SELECT  ← Phase 9 追加
#  public     | sessions            | sessions_update_own               | UPDATE  ← Phase 9 追加
#  public     | users               | users_select_self                 | SELECT
#  public     | users               | users_update_self                 | UPDATE
#  public     | workspace_data      | workspace_data_modify_member      | ALL
#  public     | workspace_data      | workspace_data_select_member      | SELECT
#  public     | workspace_members   | workspace_members_modify_admin    | ALL
#  public     | workspace_members   | workspace_members_select          | SELECT
#  public     | workspaces          | workspaces_insert_authenticated   | INSERT
#  public     | workspaces          | workspaces_select_member          | SELECT
#  public     | workspaces          | workspaces_update_admin           | UPDATE
# (15 rows)
```

---

## 🧪 Phase 2: RLS 動作確認

### Test 1: セッション変数の設定とクエリ

```bash
# PostgreSQL に接続
psql $DATABASE_URL

# ユーザー1としてログイン（ユーザーID = 1）
SET LOCAL app.current_user_id = '1';

# 自分のユーザー情報のみ閲覧可能
SELECT * FROM users;
-- ユーザーID=1のレコードのみ表示されるはず

# 自分が所属するワークスペースのみ閲覧可能
SELECT * FROM workspaces;
-- workspace_members にユーザーID=1が登録されているワークスペースのみ表示

# ユーザー2に切り替え
SET LOCAL app.current_user_id = '2';

# ユーザー2のデータが表示される
SELECT * FROM users;
-- ユーザーID=2のレコードのみ表示されるはず

# セッション終了
\q
```

### Test 2: 別ユーザーでのアクセス制限確認

```sql
-- ユーザー1としてログイン
SET LOCAL app.current_user_id = '1';

-- ユーザー2のデータにアクセス（失敗するはず）
SELECT * FROM users WHERE id = 2;
-- 結果: 0 rows （RLS により隠される）

-- ユーザー2のワークスペースにアクセス（失敗するはず）
-- ユーザー1が workspace_members に登録されていないワークスペース
SELECT * FROM workspaces WHERE id = 99;
-- 結果: 0 rows （RLS により隠される）
```

### Test 3: RLS バイパス（管理者のみ）

```sql
-- スーパーユーザーとして接続
-- RLS はスーパーユーザーには適用されない

-- すべてのユーザーが表示される
SELECT * FROM users;

-- RLS を一時的に無効化（必要な場合）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- RLS を再度有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 Phase 3: API レベルでの動作確認

### Test 1: API 経由での RLS 確認

#### 準備: テストユーザーの作成

```sql
-- ユーザー1を作成
INSERT INTO users (google_sub, email, name, system_role)
VALUES ('test-user-1', 'user1@example.com', 'User 1', 'USER');

-- ユーザー2を作成
INSERT INTO users (google_sub, email, name, system_role)
VALUES ('test-user-2', 'user2@example.com', 'User 2', 'USER');

-- ワークスペース1を作成（ユーザー1のみ所属）
INSERT INTO workspaces (name, created_by)
VALUES ('Workspace 1', 1);

-- ユーザー1をワークスペース1に追加
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES (1, 1, 'OWNER');

-- ワークスペース2を作成（ユーザー2のみ所属）
INSERT INTO workspaces (name, created_by)
VALUES ('Workspace 2', 2);

-- ユーザー2をワークスペース2に追加
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES (2, 2, 'OWNER');
```

#### テスト: ユーザー1でアクセス

```bash
# ユーザー1のトークンを取得（実際の Google OAuth トークン）
USER1_TOKEN="..."

# ユーザー1でワークスペース1にアクセス（成功するはず）
curl -X GET "http://localhost:3000/api/workspaces/1/data" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json"

# 期待される結果: 200 OK, データが返される

# ユーザー1でワークスペース2にアクセス（失敗するはず）
curl -X GET "http://localhost:3000/api/workspaces/2/data" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json"

# 期待される結果: 403 Forbidden
```

### Test 2: RLS の多層防御確認

#### シナリオ: アプリケーション層のバグがあっても保護される

```typescript
// 仮に、アプリケーション層で認可チェックをスキップしてしまった場合
// （バグや脆弱性）

// ユーザー1のセッションで実行
await setRLSUserId('1');

// 他ユーザーのデータを取得しようとする
const data = await sql`SELECT * FROM workspace_data WHERE workspace_id = 2`;

// RLS により、結果は空になる
// アプリケーション層のバグがあっても、DB レベルで保護される
```

---

## 🛠️ トラブルシューティング

### 問題1: RLS 適用後にデータが見えない

**原因**: `app.current_user_id` が設定されていない

**解決策**:
```typescript
// API エンドポイントで必ず setRLSUserId() を呼び出す
import { setRLSUserId } from '../_lib/db.js';

const user = await getUserByGoogleSub(payload.sub);
await setRLSUserId(user.id);  // ← これが必須
```

### 問題2: 管理ツール（Vercel Dashboard など）からアクセスできない

**原因**: RLS はすべての接続に適用される

**解決策A**: スーパーユーザーとして接続

```bash
# Vercel Dashboard の Query タブで実行
SET ROLE postgres;
SELECT * FROM users;
```

**解決策B**: RLS を一時的に無効化

```sql
-- 特定テーブルの RLS を無効化（慎重に）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 作業完了後、再度有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### 問題3: パフォーマンスが低下した

**原因**: ポリシー内のサブクエリが複雑

**解決策**: インデックスの追加

```sql
-- workspace_members テーブルにインデックスを追加（マイグレーションに含まれています）
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON workspace_members(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role
  ON workspace_members(workspace_id, role);
```

---

## 🔄 Phase 4: ロールバック手順

RLS に問題が発生した場合のロールバック手順です。

### ロールバック SQL

```sql
BEGIN;

-- すべてのポリシーを削除
DROP POLICY IF EXISTS users_select_self ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS workspaces_select_member ON workspaces;
DROP POLICY IF EXISTS workspaces_update_admin ON workspaces;
DROP POLICY IF EXISTS workspaces_insert_authenticated ON workspaces;
DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
DROP POLICY IF EXISTS workspace_members_modify_admin ON workspace_members;
DROP POLICY IF EXISTS workspace_data_select_member ON workspace_data;
DROP POLICY IF EXISTS workspace_data_modify_member ON workspace_data;
DROP POLICY IF EXISTS audit_logs_select_admin ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_member ON audit_logs;

-- RLS を無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

COMMIT;
```

### ロールバック実行

```bash
# ロールバック SQL を保存
cat > rollback-rls.sql <<'EOF'
-- （上記のロールバック SQL をコピー）
EOF

# ロールバック実行
psql $DATABASE_URL -f rollback-rls.sql
```

---

## ✅ 検証チェックリスト

RLS 適用後、以下の項目を確認してください。

### データベースレベル

- [ ] すべてのテーブルで RLS が有効になっている（`rowsecurity = t`）
- [ ] すべてのポリシーが正しく作成されている
- [ ] インデックスが作成されている
- [ ] セッション変数 `app.current_user_id` が正しく設定される

### API レベル

- [ ] すべての API エンドポイントで `setRLSUserId()` が呼び出されている
- [ ] ユーザーが自分のデータのみアクセスできる
- [ ] 他ユーザーのデータにアクセスできない（403 または空の結果）
- [ ] 管理者は適切な権限を持つ

### アプリケーションレベル

- [ ] ログイン・ログアウトが正常に動作する
- [ ] ワークスペース切り替えが正常に動作する
- [ ] データの作成・更新・削除が正常に動作する
- [ ] エラーハンドリングが適切に機能する

### パフォーマンス

- [ ] クエリのパフォーマンスが許容範囲内
- [ ] インデックスが効いている（`EXPLAIN ANALYZE` で確認）

---

## 📊 監視とログ

### RLS 関連のログ

```sql
-- RLS により拒否されたクエリをログに記録（PostgreSQL 設定）
ALTER DATABASE your_database SET log_row_security = on;

-- ログを確認
SELECT * FROM pg_stat_statements
WHERE query LIKE '%app.current_user_id%'
ORDER BY calls DESC
LIMIT 20;
```

### アプリケーションログ

```typescript
// api/_lib/db.ts

export async function setRLSUserId(userId: string): Promise<void> {
  try {
    await sql`SET LOCAL app.current_user_id = ${userId}`;
    console.log(`[RLS] User ID set: ${userId}`);  // ログ出力
  } catch (error) {
    console.error('[RLS] Failed to set user ID:', error);
    throw error;
  }
}
```

---

## 🎓 ベストプラクティス

### 1. 必ず setRLSUserId() を呼び出す

```typescript
// ✅ 正しい
const user = await getUserByGoogleSub(payload.sub);
await setRLSUserId(user.id);
const data = await getWorkspaceData(workspaceId);

// ❌ 誤り
const user = await getUserByGoogleSub(payload.sub);
const data = await getWorkspaceData(workspaceId);  // RLS が効かない！
```

### 2. エラーハンドリング

```typescript
try {
  await setRLSUserId(user.id);
} catch (error) {
  console.error('[API] Failed to set RLS user ID:', error);
  return jsonError('Internal server error', 500);
}
```

### 3. テストでの RLS 確認

```typescript
// E2E テストで RLS を確認
test('別ユーザーのデータにアクセスできない', async () => {
  const user1Token = await login('user1@example.com');
  const user2Token = await login('user2@example.com');

  // ユーザー2のワークスペースにユーザー1でアクセス
  const response = await fetch('/api/workspaces/2/data', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  expect(response.status).toBe(403);  // Forbidden
});
```

---

## 📚 参考資料

- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [DOCS/RLS-POLICY-GUIDE.md](./RLS-POLICY-GUIDE.md)
- [DOCS/SECURITY.md](./SECURITY.md)

---

**このドキュメントは、RLS 適用時の重要なガイドです。必ず手順に従って実施してください。**

## 📝 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-11-13 | 初版作成（Phase 7-12 STEP4.9） |
| v1.1 | 2025-01-24 | Phase 9 完了対応（sessions テーブル RLS、DB接続二重化、Supabase移行） |

**最終更新日:** 2025-01-24
**次回レビュー予定:** Phase 10 完了時
