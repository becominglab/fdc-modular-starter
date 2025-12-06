# Vercel 環境変数チェックリスト

**Version:** 2.0
**Last Updated:** 2025-12-03
**Purpose:** Vercel Dashboard で設定すべき環境変数の完全なチェックリスト

---

## 必須環境変数（Production / Preview / Development）

以下の環境変数は、Vercel Dashboard > Settings > Environment Variables で設定してください。

### Critical（必須）

| 変数名 | 説明 | 環境 | 取得方法 |
|--------|------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Production, Preview, Development | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | Production, Preview, Development | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（RLSバイパス用） | Production, Preview | Supabase Dashboard > Settings > API |
| `DATABASE_URL` | Supabase PostgreSQL 接続文字列（Transaction Pooler） | Production, Preview, Development | Supabase Dashboard > Settings > Database > Connection string > Transaction |
| `DIRECT_DATABASE_URL` | Supabase Direct Connection（マイグレーション用） | Production, Preview | Supabase Dashboard > Settings > Database > Connection string > Direct |
| `MASTER_ENCRYPTION_KEY` | Workspace データ暗号化用マスターキー | Production, Preview | `openssl rand -base64 32` で生成 |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | Production, Preview, Development | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | Production, Preview | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### Important（推奨）

| 変数名 | 説明 | 環境 | 取得方法 |
|--------|------|------|---------|
| `ADMIN_EMAILS` | 管理者メールアドレス（カンマ区切り） | Production, Preview | 手動設定（例: `admin@example.com`） |
| `ALERT_EMAIL` | アラート通知先メールアドレス | Production, Preview | 手動設定（例: `admin@example.com`） |
| `RESEND_API_KEY` | Resend メール送信APIキー | Production, Preview | [Resend Dashboard](https://resend.com/api-keys) |
| `OPENAI_API_KEY` | OpenAI API キー（AI機能用） | Production, Preview | [OpenAI Platform](https://platform.openai.com/) |
| `AI_ENABLED` | AI機能の有効化フラグ | Production, Preview | `true` または `false`（デフォルト: `false`） |
| `NODE_ENV` | 実行環境識別子 | Production, Preview, Development | `production`, `preview`, `development` |

### Optional（オプション）

| 変数名 | 説明 | 環境 | 取得方法 |
|--------|------|------|---------|
| `VERCEL_KV_REST_API_URL` | Vercel KV URL（キャッシュ用） | Production, Preview | Vercel Dashboard > Storage > KV |
| `VERCEL_KV_REST_API_TOKEN` | Vercel KV トークン | Production, Preview | Vercel Dashboard > Storage > KV |
| `NEXT_PUBLIC_APP_URL` | アプリケーションのベースURL | Production, Preview | `https://app.foundersdirect.jp` |

---

## Supabase 接続設定（Phase 9 移行後）

### Transaction Pooler vs Direct Connection

| 用途 | 環境変数 | ポート | 説明 |
|------|---------|-------|------|
| API Routes | `DATABASE_URL` | 6543 | 高速、接続プール使用 |
| マイグレーション | `DIRECT_DATABASE_URL` | 5432 | フル機能、prepared statements対応 |

### 接続文字列の形式

```bash
# Transaction Pooler（API用）
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct Connection（マイグレーション用）
DIRECT_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

---

## 設定手順

### 1. Vercel Dashboard にアクセス

```bash
vercel env ls
```

または、Vercel Dashboard > Project > Settings > Environment Variables

### 2. 環境変数を追加

各環境（Production / Preview / Development）で以下の手順を実行：

1. **Variable Name** に変数名を入力（例: `DATABASE_URL`）
2. **Value** に値を入力
3. **Environment** で適用する環境を選択
   - Production（本番環境）
   - Preview（プレビュー環境）
   - Development（ローカル開発）※ローカルは .env.local を使用
4. **Add** をクリック

### 3. 環境変数の確認

```bash
# ローカルに環境変数をプル（確認用）
vercel env pull .env.production

# 設定済み環境変数の一覧
vercel env ls
```

---

## セキュリティベストプラクティス

### DO（推奨）

- すべての Secret 値は Vercel Dashboard で設定する
- `MASTER_ENCRYPTION_KEY` は十分な強度を持つ（32バイト以上）
- `.env.local` は `.gitignore` に含める（絶対にコミットしない）
- 本番環境とプレビュー環境で異なる値を使用する（特にデータベース）
- 定期的にシークレットをローテーションする（3ヶ月ごと推奨）

### DON'T（禁止）

- 環境変数をコードに直接記述しない
- `.env.local` をバージョン管理にコミットしない
- 本番環境の環境変数を他の環境と共有しない
- 環境変数をログに出力しない
- クライアント側で Secret 値を参照しない（`NEXT_PUBLIC_` プレフィックスは公開される）

---

## 環境別設定マトリクス

| 変数名 | Production | Preview | Development (.env.local) |
|--------|-----------|---------|-------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 本番Supabase | 本番Supabase | 本番Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番キー | 本番キー | 本番キー |
| `SUPABASE_SERVICE_ROLE_KEY` | 本番キー | 本番キー | 本番キー |
| `DATABASE_URL` | Supabase (本番DB) | Supabase (本番DB) | Supabase (本番DB) |
| `MASTER_ENCRYPTION_KEY` | 本番用キー | プレビュー用キー | 開発用キー |
| `GOOGLE_CLIENT_ID` | 本番用クライアントID | 本番用クライアントID | 開発用クライアントID |
| `GOOGLE_CLIENT_SECRET` | 本番用シークレット | 本番用シークレット | 開発用シークレット |
| `ADMIN_EMAILS` | 本番管理者 | テスト管理者 | ローカル管理者 |
| `ALERT_EMAIL` | admin@example.com | admin@example.com | - |
| `NODE_ENV` | `production` | `preview` | `development` |

---

## 検証コマンド

### 環境変数が正しく設定されているか確認

```bash
# Vercel 環境変数の一覧
vercel env ls

# ローカルに環境変数をプル
vercel env pull .env.production

# 必須環境変数の存在確認
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'MASTER_ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
} else {
  console.log('All required env vars are set');
}
"
```

---

## チェックリスト（デプロイ前）

### 初回デプロイ時

- [ ] Supabase プロジェクトを作成
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
- [ ] `SUPABASE_SERVICE_ROLE_KEY` を設定
- [ ] `DATABASE_URL` を Supabase Transaction Pooler から取得して設定
- [ ] `DIRECT_DATABASE_URL` を Supabase Direct Connection から取得して設定
- [ ] `MASTER_ENCRYPTION_KEY` を生成して設定（`openssl rand -base64 32`）
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を Google Cloud Console から取得
- [ ] Supabase Auth で Google OAuth Provider を設定
- [ ] `ADMIN_EMAILS` を設定
- [ ] `ALERT_EMAIL` を設定（アラート通知先）
- [ ] `RESEND_API_KEY` を設定（メール送信用）
- [ ] `NODE_ENV=production` を設定
- [ ] `package.json` の `engines.node` が `22.x` に設定されていることを確認
- [ ] マイグレーション実行完了

### 定期メンテナンス

- [ ] 6ヶ月ごとに `MASTER_ENCRYPTION_KEY` をローテーション（注意: データ再暗号化が必要）
- [ ] 不要な環境変数を削除
- [ ] API キーの使用状況を確認（OpenAI）
- [ ] npm audit でセキュリティチェック

---

## GitHub Actions Secrets

GitHub Actions ワークフロー用に以下の Secrets を設定：

| Secret名 | 用途 | 設定場所 |
|---------|------|---------|
| `RESEND_API_KEY` | 監査レポート・アラートメール送信 | GitHub > Settings > Secrets > Actions |

---

## 参考リンク

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Resend Documentation](https://resend.com/docs)
- [SECURITY.md](../../guides/SECURITY.md) - セキュリティポリシー

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-11-17 | 初版制定（Vercel Postgres対応） |
| v2.0 | 2025-12-03 | Phase 9 Supabase移行対応、ALERT_EMAIL追加、GitHub Secrets追加 |

---

**このチェックリストは定期的に見直し、更新してください。**

**最終更新日:** 2025-12-03
**次回レビュー予定:** 2026-03-03
