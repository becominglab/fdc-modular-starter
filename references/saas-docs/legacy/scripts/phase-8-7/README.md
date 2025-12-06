# Phase 8-7: RLS マイグレーション適用 & 本番DB切替

**Version:** 1.0
**作成日:** 2025-11-14
**担当:** Claude Code

---

## 📋 概要

このディレクトリには、Phase 8-7「RLS マイグレーション適用 & 本番DB切替」の実行スクリプトが含まれています。

**重要**: これらのスクリプトは本番データベースに影響を与える操作を含みます。必ず手順を確認し、慎重に実行してください。

---

## 🚨 前提条件

### 1. Phase 8-1〜8-6 の完了確認

- [ ] 暗号化モジュール実装完了
- [ ] 鍵管理モジュール実装完了
- [ ] サーバー保存プロトコル実装完了
- [ ] Worker/オフライン同期実装完了
- [ ] Workspace 切替安定化完了
- [ ] セキュリティ検証完了

### 2. 環境変数の設定確認

```bash
# Vercel から環境変数を取得
cd /Users/5dmgmt/プラグイン/foundersdirect
vercel env pull .env.local

# 必要な環境変数が設定されているか確認
source .env.local
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "POSTGRES_URL: ${POSTGRES_URL:0:30}..."
echo "MASTER_ENCRYPTION_KEY: ${MASTER_ENCRYPTION_KEY:0:10}..."
```

**必須環境変数:**
- `DATABASE_URL` または `POSTGRES_URL`: PostgreSQL 接続文字列
- `MASTER_ENCRYPTION_KEY`: マスター暗号化キー（32バイト、base64エンコード）

### 3. pg_dump / psql コマンドの確認

```bash
# PostgreSQL クライアントのインストール確認
which pg_dump
which psql

# インストールされていない場合（macOS）
brew install postgresql
```

---

## 📝 実行手順

### STEP 1: 環境変数の設定

```bash
cd /Users/5dmgmt/プラグイン/foundersdirect

# Vercel から環境変数を取得
vercel env pull .env.local
source .env.local

# テスト環境の DATABASE_URL を設定（存在する場合）
export TEST_DATABASE_URL="postgres://..."
```

**注意**: テスト環境が存在しない場合、STEP 2〜5 をスキップして、STEP 6（本番DB バックアップ）から開始してください。

---

### STEP 2: テストDB バックアップ

```bash
# バックアップスクリプトを実行
./scripts/phase-8-7/backup-test-db.sh

# バックアップファイルが生成されたことを確認
ls -lh backups/test_*.sql
```

**生成されるファイル:**
- `backups/test_YYYYMMDD_HHMMSS.sql`: テストDB の完全バックアップ

---

### STEP 3: テストDB への RLS 適用

```bash
# RLS ポリシーを適用
./scripts/phase-8-7/apply-rls-test.sh

# 実行内容:
# - migrations/001-rls-policies.sql の適用
# - migrations/002-workspace-keys.sql の適用（未適用の場合）
```

**期待される出力:**
```
ALTER TABLE
CREATE POLICY
CREATE POLICY
...
COMMIT
```

**エラーが発生した場合:**
- エラーメッセージを確認し、必要に応じてロールバックを実施
- 詳細は `DOCS/RLS-VERIFICATION-GUIDE.md` を参照

---

### STEP 4: テストDB での RLS 検証

```bash
# RLS 動作確認スクリプトを実行（全12項目）
psql $TEST_DATABASE_URL -f scripts/phase-8-7/verify-rls-test.sql

# または、対話的に検証
psql $TEST_DATABASE_URL
\i scripts/phase-8-7/verify-rls-test.sql
```

**検証項目（FDC-GRAND-GUIDE.md 準拠）:**

1. **RLS 有効化状況の確認** - 全5テーブルで `rowsecurity = t`
2. **ポリシー一覧の確認** - 11ポリシーが存在
3. **セッション変数テスト（ユーザー1）** - ユーザー1のデータのみ表示
4. **セッション変数テスト（ユーザー2）** - ユーザー2のデータのみ表示
5. **アクセス制限のテスト** - 他ユーザーのデータにアクセス不可
6. **インデックスの確認** - 7インデックス存在
7. **workspace_keys テーブルの確認** - 4カラム + 2インデックス存在
8. **外部キー制約の確認** - 7外部キー制約存在
9. **RLS ポリシーの詳細内容確認** - USING句に `current_setting('app.current_user_id', true)` 含まれる
10. **セッション変数未設定時の動作確認** - 未設定時は0件
11. **パフォーマンステスト（EXPLAIN ANALYZE）** - インデックススキャン使用確認
12. **テスト完了** - エラーなく全項目実行完了

**✅ TEST DB 完了の総合判定基準（FDC-GRAND-GUIDE.md 576-641行目準拠）:**

- [ ] 上記12項目すべてクリア
- [ ] `psql $TEST_DATABASE_URL -f scripts/phase-8-7/verify-rls-test.sql` がエラーなく完了
- [ ] バックアップファイルが安全な場所に保存済み
- [ ] 検証結果を記録（スクリーンショット取得推奨）

**期待される結果:**
```
✅ 全5テーブルで rowsecurity = t
✅ 11ポリシー存在（users: 2, workspaces: 3, workspace_members: 2, workspace_data: 2, audit_logs: 2）
✅ ユーザーごとに自分のデータのみ閲覧可能
✅ 他ユーザーのデータは閲覧不可（0 rows）
✅ workspace_keys テーブル存在（4カラム: workspace_id, encrypted_key, created_at, updated_at）
✅ 7外部キー制約存在
✅ ポリシーUSING句に current_setting('app.current_user_id', true) 含まれる
✅ セッション変数未設定時は user_count = 0
✅ EXPLAIN ANALYZE で Index Scan 使用確認
```

**NG の場合:**
- ロールバック手順を実行（`scripts/phase-8-7/rollback-rls.sql`）
- 問題を修正後、再度 STEP 3 から実施

**TEST DB 検証の実行コマンド例:**

```bash
# 環境変数設定
cd /Users/5dmgmt/プラグイン/foundersdirect
export TEST_DATABASE_URL="postgres://..."

# バックアップ作成
./scripts/phase-8-7/backup-test-db.sh

# RLS 適用
./scripts/phase-8-7/apply-rls-test.sh

# 検証実行（全12項目）
psql $TEST_DATABASE_URL -f scripts/phase-8-7/verify-rls-test.sql

# 結果確認
# - 全項目で ✅ が表示されること
# - エラーメッセージが出力されないこと
# - 最後に「RLS 動作検証が完了しました（全12項目）」が表示されること
```

---

### STEP 5: テストDB での動作確認（API レベル）

テストDB で RLS が正常に動作することを確認したら、次はアプリケーションレベルでの動作確認を行います。

```bash
# ローカル開発サーバーを起動（テストDB に接続）
export DATABASE_URL=$TEST_DATABASE_URL
npm run dev

# ブラウザで http://localhost:3000 を開き、以下を確認:
# 1. ログインできるか
# 2. Workspace データが正常に読み込めるか
# 3. データの作成・更新・削除が正常に動作するか
# 4. 別ユーザーでログインして、他ユーザーのデータにアクセスできないか確認
```

**すべて OK の場合、本番DB への適用に進んでください。**

---

### STEP 6: 本番DB バックアップ（必須）

**重要**: 本番DB への変更を行う前に、必ずバックアップを作成してください。

```bash
# バックアップスクリプトを実行
./scripts/phase-8-7/backup-prod-db.sh

# バックアップファイルが生成されたことを確認
ls -lh backups/prod_*.sql

# ファイルサイズを確認（空でないことを確認）
du -h backups/prod_*.sql
```

**生成されるファイル:**
- `backups/prod_YYYYMMDD_HHMMSS.sql`: 本番DB の完全バックアップ

**バックアップファイルを安全な場所にコピー:**
```bash
# Google Drive や外部ストレージにコピー
cp backups/prod_*.sql ~/Google\ Drive/Backups/
```

---

### STEP 7: 本番DB への RLS 適用

**重要**: この操作は本番環境に影響を与えます。慎重に実行してください。

```bash
# 本番DB の DATABASE_URL を設定
export DATABASE_URL=$POSTGRES_URL  # または vercel env pull で取得した DATABASE_URL

# RLS ポリシーを適用
./scripts/phase-8-7/apply-rls-prod.sh

# 実行内容:
# - migrations/001-rls-policies.sql の適用
# - migrations/002-workspace-keys.sql の適用（未適用の場合）
```

**期待される出力:**
```
[Phase 8-7] Applying RLS policies to production database...
ALTER TABLE
CREATE POLICY
CREATE POLICY
...
COMMIT
[Phase 8-7] RLS policies applied successfully!
```

**エラーが発生した場合:**
- **すぐにロールバックを実行**してください
- 詳細は `DOCS/RLS-VERIFICATION-GUIDE.md` のロールバック手順を参照

---

### STEP 8: 本番DB での RLS 検証

```bash
# RLS 動作確認スクリプトを実行
psql $DATABASE_URL -f scripts/phase-8-7/verify-rls-prod.sql

# または、対話的に検証
psql $DATABASE_URL
```

**検証項目:**
1. RLS が有効になっているか確認
2. 本番データが正常に表示されるか確認
3. ユーザーごとのアクセス制限が効いているか確認

---

### STEP 9: 本番環境での動作確認（アプリケーションレベル）

```bash
# 本番環境 URL を開く
open https://your-app.vercel.app

# 以下を確認:
# 1. ログインできるか
# 2. Workspace データが正常に読み込めるか
# 3. データの作成・更新・削除が正常に動作するか
# 4. 別ユーザーでログインして、他ユーザーのデータにアクセスできないか確認
```

**問題が発生した場合:**
- すぐにロールバックを実行
- Vercel のログを確認: `vercel logs --follow`

---

### STEP 10: Vercel 環境変数の確認

```bash
# Vercel 環境変数確認スクリプトを実行
./scripts/phase-8-7/verify-vercel-env.sh

# 実行内容:
# - MASTER_ENCRYPTION_KEY が設定されているか確認
# - DATABASE_URL が設定されているか確認
# - 本番/ステージング環境で同じ設定がされているか確認
```

**期待される出力:**
```
✅ MASTER_ENCRYPTION_KEY is set (production)
✅ MASTER_ENCRYPTION_KEY is set (preview)
✅ DATABASE_URL is set (production)
✅ DATABASE_URL is set (preview)
```

---

### STEP 11: 暗号化/復号の動作確認

本番環境で暗号化・復号が正常に動作するか確認します。

```bash
# ブラウザの開発者ツールを開き、以下を実行:
# 1. Workspace データを作成・更新
# 2. ネットワークタブで /api/workspaces/{id}/data への PUT リクエストを確認
# 3. レスポンスが正常に返ってくるか確認
# 4. GET リクエストで暗号化されたデータが復号されて返ってくるか確認
```

**データベースで確認:**
```sql
-- workspace_data テーブルのデータが暗号化されているか確認
SELECT workspace_id, data::text FROM workspace_data LIMIT 1;

-- 期待される結果: data カラムに暗号化された JSON が格納されている
-- 例: {"version":"1","iv":"...","authTag":"...","ciphertext":"..."}
```

---

## 🔄 ロールバック手順

RLS 適用後に問題が発生した場合のロールバック手順です。

### テストDB ロールバック

```bash
# バックアップから復元
psql $TEST_DATABASE_URL < backups/test_YYYYMMDD_HHMMSS.sql
```

### 本番DB ロールバック

```bash
# バックアップから復元
psql $DATABASE_URL < backups/prod_YYYYMMDD_HHMMSS.sql
```

### RLS ポリシーのみ削除（データは保持）

```bash
# ロールバック SQL を実行
psql $DATABASE_URL -f scripts/phase-8-7/rollback-rls.sql
```

**詳細は `DOCS/RLS-VERIFICATION-GUIDE.md` を参照してください。**

---

## ✅ 完了確認チェックリスト

### データベースレベル

- [ ] すべてのテーブルで RLS が有効（`rowsecurity = t`）
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
- [ ] Workspace 切り替えが正常に動作する
- [ ] データの作成・更新・削除が正常に動作する
- [ ] エラーハンドリングが適切に機能する

### 暗号化レベル

- [ ] MASTER_ENCRYPTION_KEY が本番/ステージングで設定されている
- [ ] Workspace データが暗号化されて保存されている
- [ ] 暗号化データが正常に復号される
- [ ] Workspace 鍵が暗号化されて workspace_keys テーブルに保存されている

---

## 📊 Phase 8-7 デプロイメントレポート

作業完了後、以下のレポートを作成してください:

**ファイル:** `DOCS/Phase-8-7-Deployment-Report.md`

**含める内容:**
1. 実施日時と担当者
2. 各 STEP の実行結果（成功/失敗）
3. 発生した問題とその対処方法
4. バックアップファイルの保存場所
5. 検証結果（スクリーンショット等）
6. ロールバック手順の確認結果
7. Phase 9 への引き継ぎ事項

---

## 🔗 関連ドキュメント

- [DOCS/Phase-8-6-Final-Review.md](../../DOCS/Phase-8-6-Final-Review.md) - Phase 8-6 最終レビュー
- [DOCS/RLS-VERIFICATION-GUIDE.md](../../DOCS/RLS-VERIFICATION-GUIDE.md) - RLS 適用・検証ガイド
- [DOCS/FDC-GRAND-GUIDE.md](../../DOCS/FDC-GRAND-GUIDE.md) - プロジェクト全体規範書
- [migrations/001-rls-policies.sql](../../migrations/001-rls-policies.sql) - RLS ポリシー定義
- [migrations/002-workspace-keys.sql](../../migrations/002-workspace-keys.sql) - Workspace 鍵テーブル

---

**最終更新日:** 2025-11-14
**次回レビュー予定:** Phase 8-7 完了時
