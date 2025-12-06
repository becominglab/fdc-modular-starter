# バックアップ・災害復旧ガイド

**Version:** 2.0
**最終更新:** 2025-12-05
**適用範囲:** Founders Direct Cockpit 全データ

---

## 1. 概要

本ドキュメントは FDC (Founders Direct Cockpit) のバックアップ方針、災害対策、および復旧手順を定義します。

### 1.1 復旧目標

| 指標 | 目標値 | 説明 |
|------|--------|------|
| **RTO** (Recovery Time Objective) | 4時間 | サービス復旧までの最大時間 |
| **RPO** (Recovery Point Objective) | 24時間 | 最大データ損失許容時間 |

### 1.2 バックアップ対象

| データ種別 | 保存場所 | 重要度 | 方式 | 頻度 | 保持期間 |
|-----------|---------|--------|------|------|----------|
| ユーザーデータ | Supabase PostgreSQL | Critical | 自動 | 日次 | 30日 |
| ワークスペースデータ | Supabase PostgreSQL | Critical | 自動 | 日次 | 30日 |
| 暗号化キー | Supabase PostgreSQL | Critical | 自動 | 日次 | 30日 |
| 監査ログ | Supabase PostgreSQL | High | 自動+アーカイブ | 日次 | 2年（アーカイブ後5年） |
| セッションデータ | Supabase PostgreSQL | Low | - | - | 復旧不要 |
| 静的ファイル | Vercel / GitHub | Medium | Git管理 | - | 無期限 |
| 環境変数 | Vercel Dashboard | Critical | 手動記録 | - | 無期限 |

---

## 2. Supabase バックアップ設定

### 2.1 バックアップスケジュール

| 種別 | 頻度 | 保持期間 | 方法 |
|------|------|---------|------|
| **フルバックアップ** | 日次 00:00 JST | 30日 | Supabase自動バックアップ |
| **差分バックアップ** | 4時間毎 | 7日 | Supabase PITR |
| **WALアーカイブ** | リアルタイム | 7日 | Supabase PITR |
| **手動バックアップ** | 重要変更前 | 90日 | pg_dump |

### 2.2 設定確認手順

**日次バックアップ確認:**
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクト選択 → **Settings** → **Database**
3. **Backups** セクションで以下を確認:
   - Daily backups: Enabled
   - Retention: 30 days

**Point-in-Time Recovery (PITR) 確認:**
1. Dashboard → **Settings** → **Add Ons**
2. **Point in Time Recovery** が有効か確認

> **推奨:** 本番環境では PITR を必ず有効にしてください。

---

## 3. 手動バックアップ手順

### 3.1 pg_dump によるエクスポート

```bash
# 環境変数から接続情報を取得
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# 全データのダンプ
pg_dump $DATABASE_URL \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=backup-$(date +%Y%m%d-%H%M%S).dump

# 圧縮
gzip backup-*.dump
```

### 3.2 Supabase CLI によるエクスポート

```bash
# Supabase CLI インストール
npm install -g supabase

# ログイン
supabase login

# データベースダンプ
supabase db dump -p [PROJECT_ID] > backup.sql
```

### 3.3 重要テーブルの個別バックアップ

```bash
# ユーザーデータ
pg_dump $DATABASE_URL \
  --table=users \
  --table=workspace_members \
  --format=custom \
  --file=users-backup-$(date +%Y%m%d).dump

# ワークスペースデータ
pg_dump $DATABASE_URL \
  --table=workspaces \
  --table=workspace_data \
  --format=custom \
  --file=workspaces-backup-$(date +%Y%m%d).dump
```

---

## 4. リカバリ手順

### 4.1 復旧優先順位

```
1. users テーブル（認証に必要）
2. sessions テーブル（ログイン継続に必要）
3. workspaces テーブル（基本構造）
4. workspace_members テーブル（権限情報）
5. workspace_keys テーブル（暗号化キー）
6. workspace_data テーブル（業務データ）
7. audit_logs テーブル（監査記録）
```

### 4.2 Supabase Dashboard からの復元

**日次バックアップからの復元:**
1. Dashboard → **Settings** → **Database** → **Backups**
2. 復元したい日付のバックアップを選択
3. **Restore** をクリック
4. 確認ダイアログで **Confirm** を選択

⚠️ **注意**: 復元は現在のデータを上書きします。

**PITR による特定時点への復元:**
1. Dashboard → **Settings** → **Database** → **Point in Time Recovery**
2. 復元したい日時を選択
3. **Restore** をクリック

### 4.3 pg_restore による手動復元

```bash
# ダンプファイルからの復元
pg_restore $DATABASE_URL \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  backup-20250101-120000.dump

# テスト用DBにリストア
pg_restore -h localhost -p 5432 -U postgres -d test_db \
  -v backup_YYYYMMDD.dump

# データ整合性確認
psql -h localhost -d test_db -c "SELECT COUNT(*) FROM users;"
psql -h localhost -d test_db -c "SELECT COUNT(*) FROM workspaces;"
```

### 4.4 復旧確認チェックリスト

- [ ] 全テーブルのレコード数が期待値と一致
- [ ] ユーザーがログインできる
- [ ] ワークスペースデータが正常に復号できる
- [ ] 監査ログが正常に記録される
- [ ] 外部サービス連携（Google OAuth）が動作する

---

## 5. 災害復旧シナリオ

### 5.1 シナリオ別対応

| シナリオ | 発生確率 | 影響 | 対応策 |
|---------|---------|------|--------|
| 単一サーバー障害 | 中 | 低 | Supabase自動フェイルオーバー |
| AZ 障害 | 低 | 中 | Supabase自動フェイルオーバー |
| リージョン障害 | 極低 | 高 | 手動リージョン切り替え |
| Supabase全体障害 | 極低 | 高 | 別プロバイダへの移行 |
| Vercel障害 | 低 | 中 | Netlify等への切り替え |

### 5.2 Supabase 障害時

1. [Supabase Status](https://status.supabase.com/) で障害状況を確認
2. 復旧を待つ（通常は自動復旧）
3. 長時間の場合は手動バックアップからの復元を検討

### 5.3 データ破損時

1. 破損範囲を特定
2. PITR で破損前の時点に復元
3. 破損後に追加されたデータを手動で再入力

### 5.4 誤削除時

1. 削除時刻を特定（監査ログで確認）
2. PITR で削除前の時点に復元
3. または個別テーブルをバックアップから復元

```sql
-- 削除されたレコードを特定
SELECT * FROM audit_logs
WHERE action = 'delete'
AND resource_type = 'workspace_data'
ORDER BY created_at DESC;
```

### 5.5 リージョン切り替え手順

**前提条件:**
- 別リージョンのSupabaseプロジェクトを事前に準備
- バックアップファイルを複数箇所に保存

```bash
# 1. バックアップをDRサイトにリストア
pg_restore -h dr-db.xxx.supabase.co -p 5432 -U postgres -d postgres \
  -v latest_backup.dump

# 2. Vercel 環境変数を更新
vercel env rm NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 新しいSupabase URLを入力

# 3. 再デプロイ
vercel --prod --force

# 4. 動作確認
curl -I https://app.foundersdirect.jp/api/health
```

---

## 6. 暗号化キーの管理

### 6.1 必須環境変数

| 変数名 | 説明 | バックアップ方法 |
|--------|------|------------------|
| `ENCRYPTION_MASTER_KEY` | マスター暗号化キー | 1Password, AWS Secrets Manager 等 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスキー | Supabase Dashboard で確認可能 |
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |

### 6.2 環境変数バックアップ

```bash
# Vercel から環境変数をエクスポート
vercel env pull .env.backup

# 暗号化して保存
gpg --symmetric --cipher-algo AES256 .env.backup

# 安全な場所に保管（1Password, AWS Secrets Manager等）
```

### 6.3 環境変数復旧

```bash
# 暗号化ファイルを復号
gpg --decrypt .env.backup.gpg > .env.restore

# Vercel に環境変数を設定
vercel env add MASTER_ENCRYPTION_KEY production < <(echo "xxx")

# 再デプロイ
vercel --prod --force
```

### 6.4 キー紛失時の対応

⚠️ **ENCRYPTION_MASTER_KEY を紛失した場合、暗号化データは復元不可能です。**

**予防策:**
1. 複数の安全な場所にバックアップ
2. キーローテーション時は旧キーも保持
3. 定期的なキー存在確認

---

## 7. 監査ログのアーカイブ

### 7.1 自動アーカイブ

`migrations/022-audit-log-retention.sql` により以下が自動実行:

- **毎日 03:00 JST**: 2年経過したログを `audit_logs_archive` に移動
- **毎月 1日 04:00 JST**: 5年経過したアーカイブを削除

### 7.2 手動アーカイブ

```sql
-- 手動でアーカイブを実行
SELECT archive_old_audit_logs();

-- アーカイブ状況の確認
SELECT * FROM audit_logs_stats;
```

---

## 8. データ保持・廃棄

### 8.1 データ保持期間

| データ種別 | 保持期間 | 根拠 |
|-----------|---------|------|
| ユーザーデータ | アカウント削除後90日 | 個人情報保護法 |
| ワークスペースデータ | 解約後90日 | 契約条件 |
| 監査ログ | 2年間 | コンプライアンス要件 |
| バックアップ | 30日 | 運用要件 |
| アクセスログ | 90日 | セキュリティ要件 |

### 8.2 ユーザー削除リクエスト対応

```sql
-- 1. 関連データの特定
SELECT * FROM workspace_members WHERE user_id = {user_id};
SELECT * FROM sessions WHERE user_id = {user_id};

-- 2. 関連データの削除（CASCADE設定により自動）
DELETE FROM users WHERE id = {user_id};

-- 3. 監査ログに記録
INSERT INTO audit_logs (action, resource_type, resource_id, details)
VALUES ('user_deletion', 'user', {user_id}, '{"reason": "user_request"}');
```

---

## 9. 定期確認チェックリスト

### 月次確認

- [ ] Supabase Dashboard でバックアップ状態確認
- [ ] PITR が有効か確認（Pro プラン）
- [ ] 監査ログのアーカイブ状況確認
- [ ] 環境変数（暗号化キー）の存在確認
- [ ] バックアップからの復元テスト（開発環境）

### 四半期確認

- [ ] RTO/RPO 目標の妥当性レビュー
- [ ] 災害復旧手順の読み合わせ
- [ ] バックアップ検証（チェックサム確認）

### 年次確認

- [ ] 全体DRテスト（本番相当の復旧訓練）
- [ ] フェイルオーバーテスト（DR環境への切り替え訓練）

---

## 10. 連絡先

| 役割 | 連絡先 |
|------|--------|
| Supabase サポート | support@supabase.io |
| Vercel サポート | support@vercel.com |
| 社内セキュリティ | security@example.com |

### 参考ドキュメント

| ドキュメント | URL |
|-------------|-----|
| Supabase バックアップ | https://supabase.com/docs/guides/platform/backups |
| Vercel 環境変数 | https://vercel.com/docs/environment-variables |
| PostgreSQL pg_dump | https://www.postgresql.org/docs/current/app-pgdump.html |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-02 | 初版制定 |
| v2.0 | 2025-12-05 | BACKUP-RECOVERY-RUNBOOK.md と統合 |

---

**次回レビュー予定:** 2026-03-05
