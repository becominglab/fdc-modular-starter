# FDC Phase 7 - Vercel デプロイメントガイド

**対象:** Founders Direct Cockpit (FDC) - Phase 7 フルスタック実装
**環境:** Vercel (GitHub連携) + Serverless Functions + Postgres
**作成日:** 2025-11-11
**作成者:** Claude Code (Sonnet 4.5)

---

## 📋 デプロイ概要

### アーキテクチャ

```
GitHub Repository (foundersdirect)
  ↓ (自動デプロイ)
Vercel
  ├─ Static Hosting (index.html, dist/*)
  └─ Serverless Functions (/api/*)
       ↓
  Database (Vercel Postgres / Neon / Supabase)
```

### デプロイ先

- **本番:** https://app.foundersdirect.jp/
- **Preview:** https://foundersdirect-{branch}.vercel.app/

---

## 🚀 Step 1: Vercel プロジェクトセットアップ

### 1-1. Vercel アカウント作成

1. [Vercel](https://vercel.com/) にアクセス
2. 「Sign Up」→ GitHub アカウントで認証
3. 無料プラン（Hobby）を選択

### 1-2. GitHub リポジトリと連携

1. Vercel ダッシュボードで「Add New...」→「Project」
2. `Takao-Mochizuki/foundersdirect` を選択
3. 「Import」をクリック

### 1-3. プロジェクト設定

| 設定項目 | 値 |
|---------|-----|
| Framework Preset | Other (検出されない場合) |
| Root Directory | `.` (ルート) |
| Build Command | `npm run build` |
| Output Directory | `.` (静的ファイルはルート配置) |
| Install Command | `npm install` |

### 1-4. 環境変数設定

Vercel ダッシュボード → Settings → Environment Variables

```env
# Database (後で設定)
DATABASE_URL=postgresql://user:password@host:5432/database

# Google OAuth
GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com

# JWT Secret (ランダム生成推奨)
JWT_SECRET=your-super-secret-key-here-use-long-random-string

# Admin Emails
ADMIN_EMAILS=admin@example.com

# Node.js Version (推奨)
NODE_VERSION=18
```

**JWT_SECRET の生成:**
```bash
# ターミナルで実行
openssl rand -base64 32
```

---

## 🗄️ Step 2: データベースセットアップ

### オプション A: Vercel Postgres（推奨）

1. Vercel ダッシュボード → Storage → Create Database
2. 「Postgres」を選択
3. データベース名を入力（例: `fdc-production`）
4. リージョンを選択（例: Tokyo (ap-northeast-1)）
5. 「Create」をクリック
6. 自動的に `DATABASE_URL` が環境変数に追加される

### オプション B: Neon

1. [Neon](https://neon.tech/) にアクセス
2. GitHub アカウントでログイン
3. 「New Project」→ データベース作成
4. Connection String をコピー
5. Vercel の環境変数に `DATABASE_URL` として追加

### オプション C: Supabase

1. [Supabase](https://supabase.com/) にアクセス
2. 「New Project」→ データベース作成
3. Settings → Database → Connection String (URI) をコピー
4. Vercel の環境変数に `DATABASE_URL` として追加

---

## 📦 Step 3: データベーススキーマ作成

### 3-1. スキーマファイル作成

プロジェクトルートに `schema.sql` を作成:

```sql
-- Users テーブル
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  global_role VARCHAR(50) DEFAULT 'normal' CHECK (global_role IN ('fdc_admin', 'normal')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspaces テーブル
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace Members テーブル
CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, user_id)
);

-- Workspace Data テーブル
CREATE TABLE IF NOT EXISTS workspace_data (
  workspace_id VARCHAR(255) PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
```

### 3-2. スキーマ実行

**Vercel Postgres の場合:**
```bash
# Vercel CLI をインストール
npm install -g vercel

# プロジェクトにリンク
vercel link

# データベースに接続
vercel postgres connect

# スキーマ実行
\i schema.sql
```

**Neon / Supabase の場合:**
1. ダッシュボードの SQL Editor を開く
2. `schema.sql` の内容を貼り付け
3. 実行

---

## 🔧 Step 4: Google OAuth 設定

### 4-1. Google Cloud Console 設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 既存プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「認証情報」
4. 「OAuth 2.0 クライアント ID」を選択
5. 「承認済みのJavaScript生成元」に以下を追加:
   ```
   https://app.foundersdirect.jp
   https://foundersdirect.vercel.app
   https://foundersdirect-git-*.vercel.app
   ```
6. 「承認済みのリダイレクト URI」は不要（Google Identity Services 使用のため）

### 4-2. クライアントID確認

- 既に `state.ts` に設定済み: `xxx-xxx.apps.googleusercontent.com`
- Vercel 環境変数の `GOOGLE_CLIENT_ID` と一致していることを確認

---

## 📁 Step 5: カスタムドメイン設定

### 5-1. Vercel ダッシュボードでドメイン追加

1. Vercel ダッシュボード → Settings → Domains
2. 「Add」をクリック
3. `app.foundersdirect.jp` を入力
4. 指示に従って DNS レコードを追加

### 5-2. DNS 設定（お名前.com など）

| タイプ | ホスト | 値 |
|-------|-------|-----|
| CNAME | app | cname.vercel-dns.com |

または

| タイプ | ホスト | 値 |
|-------|-------|-----|
| A | app | 76.76.21.21 |

**注意:** DNS 反映まで数分〜24時間かかる場合があります。

---

## 🧪 Step 6: デプロイ確認

### 6-1. 自動デプロイ確認

1. GitHub に push すると自動的にデプロイが開始
2. Vercel ダッシュボード → Deployments で進行状況を確認
3. デプロイ完了後、Preview URL で動作確認

### 6-2. Preview 環境でテスト

```bash
# 新しいブランチを作成
git checkout -b feature/test-deployment

# 変更を加える（テスト用）
git add .
git commit -m "Test deployment"
git push origin feature/test-deployment
```

Vercel が自動的に Preview URL を生成:
- `https://foundersdirect-git-feature-test-deployment.vercel.app/`

### 6-3. 動作確認項目

- [ ] ログインページが表示される
- [ ] Google ログインが成功する
- [ ] `/api/me` が正常にレスポンスを返す
- [ ] ワークスペース一覧が取得できる（空でもOK）
- [ ] データの保存・読み込みが正常に動作する

---

## 🐛 トラブルシューティング

### 1. 「500 Internal Server Error」が表示される

**原因:**
- Vercel Functions のランタイムエラー
- データベース接続エラー
- 環境変数の設定ミス

**対処法:**
```bash
# Vercel のログを確認
vercel logs

# または Vercel ダッシュボード → Deployments → Function Logs
```

### 2. CORS エラー（ブラウザコンソール）

**原因:**
- `/api/*` のレスポンスヘッダーに `Access-Control-Allow-Origin` が不足

**対処法:**
- Vercel Functions の各ハンドラーで CORS ヘッダーを追加
- または `vercel.json` でグローバル設定

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://app.foundersdirect.jp" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

### 3. Google認証が失敗する

**原因:**
- `GOOGLE_CLIENT_ID` が間違っている
- Google Cloud Console で承認済みドメインが未設定

**対処法:**
1. Vercel 環境変数の `GOOGLE_CLIENT_ID` を確認
2. Google Cloud Console → 「認証情報」→「OAuth 2.0クライアントID」
3. 「承認済みのJavaScript生成元」に本番・Preview URL を追加

### 4. データベース接続エラー

**原因:**
- `DATABASE_URL` が正しく設定されていない
- データベースが起動していない（Neon/Supabase の場合）

**対処法:**
```bash
# 環境変数を確認
vercel env ls

# 接続テスト（ローカル）
psql $DATABASE_URL
```

---

## 🔒 本番環境セキュリティチェックリスト

- [ ] `JWT_SECRET` を強固なランダム文字列に設定
- [ ] `DATABASE_URL` を本番用に設定
- [ ] Google Client ID を正しく設定
- [ ] データベースパスワードを強固なものに設定
- [ ] HTTPS接続を確認（Vercel 自動対応）
- [ ] CORS設定で本番ドメインのみ許可
- [ ] 環境変数を Production / Preview / Development で分離
- [ ] SQL Injection 対策（ORMまたはプレースホルダー使用）

---

## 📊 環境変数の管理

### Production（本番）

- `main` ブランチからのデプロイに適用
- `app.foundersdirect.jp` で使用

### Preview（プレビュー）

- `main` 以外のブランチからのデプロイに適用
- テスト用データベースを使用推奨

### Development（ローカル開発）

```bash
# .env.local ファイルを作成（.gitignore に追加済み）
DATABASE_URL=postgresql://localhost:5432/fdc_dev
GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
JWT_SECRET=dev-secret-key
ADMIN_EMAILS=admin@example.com
```

---

## 🚀 継続的デプロイフロー

### 開発フロー

```bash
# 1. 新しい機能ブランチを作成
git checkout -b feature/new-feature

# 2. コードを編集
# ...

# 3. コミット & プッシュ
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 4. Vercel が自動的に Preview デプロイ
# → Preview URL でテスト

# 5. 問題なければ main にマージ
git checkout main
git merge feature/new-feature
git push origin main

# 6. Vercel が自動的に Production デプロイ
# → https://app.foundersdirect.jp/ に反映
```

### ロールバック

```bash
# Vercel ダッシュボード → Deployments
# → 以前のデプロイを選択 → "Promote to Production"
```

---

## 📝 次のステップ（Phase 8以降）

- [ ] ワークスペース作成API実装
- [ ] メンバー招待機能
- [ ] Googleカレンダー連携
- [ ] 詳細なロール制御（owner/admin/member/viewer）
- [ ] データ移行ツール（localStorage → サーバー）
- [ ] 監視・ログ分析（Vercel Analytics / Sentry）

---

## 📚 参考資料

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)

---

## 📞 サポート

**問題が解決しない場合:**
1. Vercel ダッシュボード → Function Logs を確認
2. GitHub Issues に問題を報告
3. Vercel Support に問い合わせ（有料プランの場合）

---

**最終更新:** 2025-11-11
**作成者:** Claude Code (Sonnet 4.5)
**ステータス:** Phase 7 実装中
**デプロイ先:** https://app.foundersdirect.jp/

---

## ⚠️ 旧デプロイ方法（Phase 4 - 廃止）

Phase 4 で作成された ConoHa WING + PHP 実装は **廃止** されました。
参考資料として `/legacy-php/` ディレクトリに保存されています。

**廃止理由:**
- サーバーレス環境（Vercel）の方が運用コストが低い
- 自動スケーリング対応
- GitHub 連携による自動デプロイ
- TypeScript/Node.js エコシステムとの親和性
