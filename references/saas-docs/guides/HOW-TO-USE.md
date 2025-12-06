# Founders Direct Cockpit - 使い方ガイド

**バージョン:** v2.8.7（Phase 14.6 完了）
**最終更新:** 2025-12-02
**本番URL:** https://app.foundersdirect.jp/

> すべての業務をひとつの操縦席から。Google OAuth + Cookie認証 + RBAC + 暗号化ワークスペース + AI連携 + 3層アーキテクチャ（OKR→ActionMap→Task）+ CSVインポート/エクスポートを備えた最新版の利用方法をまとめています。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| バージョン | v2.8.7（Phase 14.6 完了） |
| フレームワーク | Next.js 15.5.6 + React 19.2.0 + TypeScript 5.9.3 |
| データベース | Supabase PostgreSQL 17.6 |
| 認証 | Supabase Auth（Google OAuth PKCE） |
| セッション | Cookie ベース（HttpOnly `fdc_session`） |
| AI | Vercel AI SDK 5.0.100 + OpenAI GPT-4o-mini |
| テスト | Playwright E2E（420+テスト）+ Vitest |
| セキュリティ | CSP Nonce ベース + SameSite Cookie |
| 主機能 | 12タブ + AI チャット + 3層アーキテクチャ + CSVインポート/エクスポート |

### 1.1 現在のフェーズ状況

| フェーズ | 状態 | 概要 |
|---------|------|------|
| Phase 10 | ✅ 完了 | Task実行層（4象限×Elastic Habits×Google連携） |
| Phase 11 | ✅ 完了 | ActionMap戦術層（カンバン・フォーカスモード） |
| Phase 12 | ✅ 完了 | OKR戦略層（N:M連携・3層アーキテクチャ完成） |
| Phase 13 | ✅ 完了 | AI機能・CSVインポート・セキュリティ強化 |
| Phase 13.5 | ✅ 完了 | レポートラインタブ・可視性/権限システム |
| Phase 14.1 | ✅ 完了 | CSVインポート/エクスポート（管理者設定タブ集約） |
| Phase 14.2 | ✅ 完了 | スケーラビリティ改善（同時20人→100人対応） |
| Phase 14.35 | ✅ 完了 | 巨大コンポーネント分割（500行以上0件達成） |
| Phase 14.6-I | ✅ 完了 | CSP強化（Nonceベース、unsafe-eval削除） |

### 1.2 3層アーキテクチャ（Phase 10〜12で完成）

```
戦略層: OKR
  └─ Objective（定性目標）→ KeyResult（定量成果指標）

戦術層: Action Map
  └─ ActionMap（計画）→ ActionItem（タスク）

実行層: Task
  └─ Task（4象限: ♠♥♦♣）+ Elastic Habits（松竹梅）
```

**進捗ロールアップ:** Task → ActionItem → ActionMap → KR → Objective

### 1.3 権限システム（Phase 9.97 更新）

**2層の権限モデル:**

| レイヤー | 値 | 説明 |
|---------|-----|------|
| **システムロール** (`users.system_role`) | `SA` / `USER` / `TEST` | システム全体での権限 |
| **ワークスペースロール** (`workspace_members.role`) | `OWNER` / `ADMIN` / `MEMBER` | ワークスペース内での権限 |

> **Phase 9.97 変更:** 旧 `account_type` カラムを廃止し、`system_role` に統一。

---

## 2. 起動方法

### 2.1 必要環境

- Node.js 22.x
- npm / npx
- Google Cloud Console でのOAuthクレデンシャル
- Supabase プロジェクト

### 2.2 初回セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd foundersdirect

# 依存関係をインストール
npm install

# E2Eテスト用（初回のみ）
npx playwright install --with-deps
```

### 2.3 環境変数の設定

`.env.local` を作成:

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# 暗号化
MASTER_ENCRYPTION_KEY=<openssl rand -base64 32 で生成>

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# AI（オプション）
OPENAI_API_KEY=sk-xxx
AI_ENABLED=true
```

### 2.4 開発サーバー起動

```bash
npm run dev
# http://localhost:3000 でアクセス
```

### 2.5 本番ビルド

```bash
npm run build
npm start
```

---

## 3. ディレクトリ構造

```
foundersdirect/
├── app/                              # Next.js 15 App Router
│   ├── (app)/                        # 認証後ページ（Route Group）
│   │   ├── dashboard/page.tsx        # ダッシュボード
│   │   ├── leads/page.tsx            # 見込み客管理
│   │   ├── clients/page.tsx          # 顧客管理
│   │   ├── brand/page.tsx            # ブランド指針
│   │   ├── mvv/page.tsx              # MVV・OKR
│   │   ├── reports/                  # レポート（RSC化済み）
│   │   ├── settings/                 # 設定
│   │   ├── admin/                    # 管理者機能
│   │   └── layout.tsx                # 認証レイアウト
│   │
│   ├── _components/                  # UIコンポーネント（23ディレクトリ）
│   │   ├── dashboard/                # ダッシュボード
│   │   ├── prospects/                # 見込み客
│   │   ├── clients/                  # 顧客
│   │   ├── todo/                     # TODO管理（23ファイル）
│   │   ├── action-map/               # ActionMap（19ファイル）
│   │   ├── okr/                      # OKR（13ファイル）
│   │   ├── org-chart/                # 組織図（12ファイル）
│   │   ├── admin/                    # 管理者機能（10ファイル）
│   │   └── ...                       # その他
│   │
│   ├── api/                          # Route Handlers（API層）
│   │   ├── auth/                     # 認証API
│   │   │   ├── callback/route.ts     # OAuth コールバック
│   │   │   ├── session/route.ts      # セッション取得
│   │   │   └── logout/route.ts       # ログアウト
│   │   ├── workspaces/               # ワークスペース管理
│   │   ├── admin/                    # 管理者API（8エンドポイント）
│   │   ├── ai/                       # AI関連
│   │   │   └── chat/route.ts         # AIチャット（レート制限5req/min）
│   │   ├── google/                   # Google連携API
│   │   ├── org-chart/                # 組織図API
│   │   └── audit-logs/route.ts       # 監査ログ
│   │
│   ├── login/page.tsx                # ログインページ
│   ├── ai-terms/                     # AI利用規約
│   └── layout.tsx                    # ルートレイアウト
│
├── lib/                              # 共通ライブラリ
│   ├── core/                         # コアロジック（11ファイル）
│   │   ├── compression.ts            # Gzip圧縮
│   │   ├── ai-context.ts             # AIコンテキスト（PII除外）
│   │   └── validator.ts              # Zodバリデーション
│   │
│   ├── hooks/                        # カスタムフック（43ファイル）
│   │   ├── useWorkspace.ts           # ワークスペース管理
│   │   ├── useDashboardStats.ts      # ダッシュボード統計
│   │   ├── useLeadsViewModel.ts      # 見込み客ViewModel
│   │   ├── useTaskViewModel.ts       # Task管理
│   │   ├── useActionMapViewModel.ts  # ActionMap管理
│   │   ├── useOKRViewModel.ts        # OKR管理
│   │   └── ...                       # その他
│   │
│   ├── server/                       # サーバー専用（29ファイル）
│   │   ├── auth.ts                   # 認証・セッション検証
│   │   ├── db.ts                     # PostgreSQL接続
│   │   ├── encryption.ts             # AES-256-GCM暗号化
│   │   ├── rate-limit.ts             # レート制限
│   │   ├── tenants.ts                # テナント管理
│   │   ├── tenant-config.ts          # テナント設定
│   │   └── supabase.ts               # Supabaseクライアント
│   │
│   ├── client/                       # クライアント専用
│   │   └── supabase.ts               # ブラウザ用Supabase
│   │
│   ├── csv/                          # CSVインポート/エクスポート（10ファイル）
│   │
│   ├── types/                        # 型定義（22ファイル）
│   │   ├── app-data.ts               # アプリデータ型
│   │   ├── task.ts                   # Task型
│   │   ├── action-map.ts             # ActionMap型
│   │   ├── okr.ts                    # OKR型
│   │   └── ...                       # その他
│   │
│   └── utils/                        # ユーティリティ
│       └── permissions.ts            # 権限チェック
│
├── tests/                            # テスト
│   └── e2e/                          # E2Eテスト（Playwright）
│
├── migrations/                       # DBマイグレーション（21ファイル）
├── middleware.ts                     # 認証・CSPミドルウェア
├── docs/                             # ドキュメント
└── package.json
```

---

## 4. 主要機能

### 4.1 タブ一覧

| タブ | 概要 | ロール制限 |
|------|------|-----------|
| Dashboard | KPI、ファネル、OKR、TODO一覧 | 全員 |
| MVV / OKR | ビジョン・ミッション・OKR管理 | MEMBER以上 |
| Brand | ブランド指針 | MEMBER以上 |
| Lean Canvas | ビジネスモデルキャンバス | MEMBER以上 |
| TODO | タスク管理 | 全員 |
| Leads | 見込み客管理 | MEMBER以上 |
| Clients | 顧客管理 | MEMBER以上 |
| Zoom | 会議メモ・議事録 | MEMBER以上 |
| Templates | テンプレート集 | 閲覧は全員、編集はADMIN以上 |
| Reports | レポート・分析 | 全員 |
| Settings | ワークスペース設定 | ADMIN以上 |
| Admin | 管理者機能 | OWNER / SA |

### 4.2 認証フロー

```
1. ログインページで「Google でログイン」をクリック
2. Google OAuth 認証
3. Supabase Auth でトークン検証
4. サーバーでセッション作成、Cookie 設定（fdc_session）
5. ダッシュボードにリダイレクト
```

### 4.3 データ保存

- すべてのワークスペースデータは暗号化（AES-256-GCM）
- 楽観的排他制御（version カラム）で競合検出
- Gzip 圧縮で 50-70% サイズ削減

---

## 5. npmスクリプト

```bash
# 開発
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm start             # 本番サーバー起動

# 品質チェック
npm run type-check    # TypeScript 型チェック
npm run lint          # ESLint

# テスト
npm test              # E2Eテスト（全件）
npm run test:headed   # ブラウザ表示モード
npm run test:ui       # Playwright UI
npm run test:visual   # Visual Regression テスト
npm run test:unit     # ユニットテスト（Vitest）

# メンテナンス
npm run verify:debt-free  # 技術負債チェック
npm run check:bundle      # バンドルサイズ確認
npm run report:tech-debt  # 技術負債レポート生成
```

---

## 6. AI チャット機能

### 6.1 概要

- OpenAI GPT-4o-mini 統合
- レート制限: 5req/min
- PII（個人情報）自動除外

### 6.2 使用方法

ダッシュボードの AI チャットパネルからメッセージを入力。

### 6.3 PII 保護

`lib/core/ai-context.ts` で以下を自動処理:
- メールアドレス除外
- 電話番号除外
- 個人名マスキング（例: "田中太郎" → "T***"）

---

## 7. トラブルシューティング

| 症状 | 対処 |
|------|------|
| ログインできない | Cookie を削除して再試行。Supabase Auth 設定を確認。 |
| データが保存されない | ブラウザコンソールでエラー確認。API レスポンスをチェック。 |
| セッション切れ | Cookie の有効期限（7日間）を確認。`sessions` テーブルで `revoked_at` をチェック。 |
| AI チャットエラー | `AI_ENABLED=true` と `OPENAI_API_KEY` を確認。レート制限（5req/min）を確認。 |
| 競合エラー（409） | 他のユーザーが同時編集中。画面を更新して再試行。 |
| 型エラー | `npm run type-check` を実行して詳細確認。 |
| テスト失敗 | `playwright-report/` を確認。`test-mode` Cookie を確認。 |

---

## 8. 参考ドキュメント

### 開発ガイド
- `docs/guides/DEVELOPMENT.md` - 開発規範・コーディング規約
- `docs/guides/TESTING.md` - E2Eテストガイド

### 技術仕様
- `docs/specs/API-SPEC.md` - API 仕様（11エンドポイント）
- `docs/specs/DB-SECURITY.md` - DBセキュリティ・RLS
- `docs/guides/SECURITY.md` - セキュリティポリシー

### パフォーマンス
- `docs/guides/Performance-Specification-v1.0.md` - P95 目標値

### アーキテクチャ
- `docs/FDC-GRAND-GUIDE.md` - マスター規範書
- `docs/guides/FDC-ARCHITECTURE-OVERVIEW.md` - 構造概要

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v5.0 | 2025-12-02 | Phase 14.6 完了（CSP強化、テナント管理準備、バージョン2.8.7） |
| v4.0 | 2025-12-02 | Phase 14.35 完了（CSVインポート/エクスポート、スケーラビリティ、コンポーネント分割） |
| v3.0 | 2025-11-27 | Next.js 15 App Router 構成に完全更新、Phase 9.97 対応 |
| v2.8 | 2025-01-24 | Phase 9.8 対応（AI基盤、楽観的排他制御） |
| v2.0 | 2025-11-18 | Phase 9 完了（Supabase 移行） |

---

**作成日:** 2025-11-18
**最終更新:** 2025-12-02
