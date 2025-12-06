# ARCHITECTURE-DETAIL.md - FDCアーキテクチャ詳細

> **注**: 本ドキュメントは `FDC-GRAND-GUIDE.md` から分離されたアーキテクチャ詳細記録です。
> コア開発ガイドは `docs/FDC-CORE.md` を参照してください。

---

## 1. 主要依存関係

```json
{
  "dependencies": {
    "next": "^15.5.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@supabase/supabase-js": "^2.81.1",
    "@supabase/ssr": "^0.7.0",
    "ai": "^5.0.100",
    "@ai-sdk/openai": "^2.0.71",
    "zod": "^4.1.12",
    "lucide-react": "^0.554.0",
    "pg": "^8.16.3",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@playwright/test": "^1.56.1",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.3.0",
    "eslint": "^9.39.1",
    "eslint-config-next": "^16.0.3",
    "@types/react": "^19.2.6",
    "@types/node": "^24.10.0"
  }
}
```

---

## 2. ディレクトリ構造（Phase 14完了時点）

```
foundersdirect/
├── app/                              # Next.js 15 App Router
│   ├── (app)/                        # 認証後のアプリケーションページ（Route Group）
│   │   ├── dashboard/page.tsx        # ダッシュボード（タブ切替UI）
│   │   ├── leads/page.tsx            # 見込み客管理
│   │   ├── clients/page.tsx          # 顧客管理
│   │   ├── brand/page.tsx            # ブランド指針
│   │   ├── mvv/page.tsx              # MVV・OKR
│   │   ├── reports/page.tsx          # レポート
│   │   ├── settings/                 # 設定
│   │   │   ├── page.tsx              # 設定ページ
│   │   │   └── security/page.tsx     # セキュリティ設定
│   │   ├── admin/                    # 管理者機能
│   │   │   ├── page.tsx              # 管理者設定
│   │   │   ├── system/page.tsx       # システム管理
│   │   │   └── sa/page.tsx           # SAダッシュボード（SA専用）
│   │   └── layout.tsx                # アプリレイアウト（認証チェック）
│   │
│   ├── _components/                  # UIコンポーネント（45+ファイル）
│   │   ├── Sidebar.tsx               # サイドバーナビゲーション
│   │   ├── ConversionFunnel.tsx      # コンバージョンファネル
│   │   ├── dashboard/                # ダッシュボードコンポーネント（7ファイル）
│   │   ├── todo/                     # TODOコンポーネント（11ファイル）【Phase 10】
│   │   ├── action-map/               # ActionMapコンポーネント（9ファイル）【Phase 11】
│   │   ├── okr/                      # OKRコンポーネント（6ファイル）【Phase 12】
│   │   ├── prospects/                # 見込み客コンポーネント
│   │   ├── clients/                  # 既存客コンポーネント
│   │   ├── brand/                    # ブランド指針コンポーネント
│   │   ├── mvv/                      # MVVコンポーネント
│   │   ├── lean-canvas/              # リーンキャンバスコンポーネント
│   │   ├── zoom/                     # Zoom会議コンポーネント
│   │   ├── templates/                # テンプレートコンポーネント
│   │   ├── reports/                  # レポートコンポーネント
│   │   ├── settings/                 # 設定コンポーネント
│   │   ├── admin/                    # 管理者コンポーネント
│   │   └── lost-deals/               # 失注管理コンポーネント
│   │
├── components/                       # 共通コンポーネント
│   └── landing/                      # ランディングページ【Phase 14.6.3分割】8ファイル
│       ├── LandingPage.tsx           # 統合レイアウト（33行）
│       ├── LandingHeader.tsx         # ヘッダー・ナビ（56行）
│       ├── HeroSection.tsx           # ヒーロー（36行）
│       ├── FeaturesSection.tsx       # 機能紹介（200行）
│       ├── PricingSection.tsx        # 料金プラン（203行）
│       ├── FAQSection.tsx            # FAQ（198行）
│       ├── ContactForm.tsx           # お問い合わせ（201行）
│       └── LandingFooter.tsx         # フッター（34行）
│
│   ├── api/                          # Next.js Route Handlers（API層）
│   │   ├── auth/                     # 認証API
│   │   ├── workspaces/               # ワークスペース管理API
│   │   ├── google/                   # Google連携API【Phase 10】
│   │   ├── admin/                    # 管理者API
│   │   ├── ai/                       # AI API
│   │   ├── org-chart/                # 組織図API【Phase 13.5】
│   │   ├── cron/                     # Cronジョブ【Phase 14.2】
│   │   ├── health/                   # ヘルスチェック【Phase 14.4】
│   │   └── ...                       # その他API
│   │
│   ├── login/page.tsx                # ログインページ
│   ├── layout.tsx                    # ルートレイアウト
│   ├── page.tsx                      # ルートページ（リダイレクト）
│   └── globals.css                   # グローバルCSS
│
├── lib/                              # 共通ライブラリ
│   ├── core/                         # クロスカッティング
│   │   ├── compression.ts            # Gzip 圧縮（50-70%削減）
│   │   ├── ai-context.ts             # AI コンテキスト制御（PII除外）
│   │   ├── validator.ts              # AppData バリデータ（Zod）
│   │   ├── action-map.ts             # ActionMap CRUD・進捗計算【Phase 11】
│   │   └── okr.ts                    # OKR CRUD・ロールアップ【Phase 12】
│   │
│   ├── hooks/                        # カスタムフック（ViewModel パターン）【Phase 14.6.3で分割】
│   │   ├── useWorkspace.ts           # ワークスペース情報
│   │   ├── useWorkspaceData.ts       # ワークスペースデータContext
│   │   │
│   │   ├── task/                     # Task関連【Phase 10, 14.6.3分割】9ファイル
│   │   │   ├── types.ts              # 型定義（36行）
│   │   │   ├── useTaskViewModel.ts   # 統合レイヤー（403行）
│   │   │   ├── useTaskCRUD.ts        # CRUD操作（133行）
│   │   │   ├── useTaskFilters.ts     # フィルタ・ソート（75行）
│   │   │   ├── useTaskForm.ts        # フォーム管理（121行）
│   │   │   ├── useTaskCSV.ts         # CSV操作（101行）
│   │   │   ├── useTaskSuggestion.ts  # サジェスト（88行）
│   │   │   ├── useHabitLogic.ts      # 習慣ロジック（456行）
│   │   │   └── useTaskCalendar.ts    # カレンダー連携（385行）
│   │   │
│   │   ├── okr/                      # OKR関連【Phase 12, 14.6.3分割】7ファイル
│   │   │   ├── types.ts              # 型定義（29行）
│   │   │   ├── useOKRViewModel.ts    # 統合レイヤー（444行）
│   │   │   ├── useObjectiveCRUD.ts   # Objective CRUD（146行）
│   │   │   ├── useKeyResultCRUD.ts   # KeyResult CRUD（252行）
│   │   │   ├── useOKRProgress.ts     # 進捗計算（191行）
│   │   │   ├── useOKRForm.ts         # フォーム管理（193行）
│   │   │   └── useOKRCSV.ts          # CSV操作（208行）
│   │   │
│   │   ├── leads/                    # Leads関連【Phase 14.6.3分割】8ファイル
│   │   │   ├── types.ts              # 型定義（57行）
│   │   │   ├── useLeadsViewModel.ts  # 統合レイヤー（297行）
│   │   │   ├── useLeadsCRUD.ts       # CRUD操作（316行）
│   │   │   ├── useLeadsFunnel.ts     # ファネル管理（278行）
│   │   │   ├── useLeadsHistory.ts    # 履歴管理（105行）
│   │   │   ├── useLeadsModal.ts      # モーダル制御（105行）
│   │   │   ├── useLeadsAnalysis.ts   # 分析機能（110行）
│   │   │   └── useLeadsExport.ts     # エクスポート（61行）
│   │   │
│   │   ├── templates/                # Templates関連【Phase 14.6.3分割】6ファイル
│   │   │   ├── types.ts              # 型定義
│   │   │   ├── useTemplatesViewModel.ts  # 統合レイヤー（324行）
│   │   │   ├── useTemplateCRUD.ts    # CRUD操作
│   │   │   ├── useTemplateUsage.ts   # 使用記録（231行）
│   │   │   ├── useTemplatePreview.ts # プレビュー（86行）
│   │   │   ├── useTemplateForm.ts    # フォーム管理（145行）
│   │   │   └── useTemplateImportExport.ts # CSV操作（158行）
│   │   │
│   │   ├── settings/                 # Settings関連【Phase 14.6.3分割】7ファイル
│   │   │   ├── useSettingsViewModel.ts   # 統合レイヤー（229行）
│   │   │   ├── useGoogleTasksSync.ts # Tasks連携（170行）
│   │   │   ├── useGoogleCalendarSync.ts  # Calendar連携（166行）
│   │   │   ├── useDataManagement.ts  # データ管理（80行）
│   │   │   ├── useDataBackup.ts      # バックアップ（158行）
│   │   │   ├── useCustomerJourneyCSV.ts  # CJ CSV（152行）
│   │   │   └── useLeanCanvasCSV.ts   # LC CSV（136行）
│   │   │
│   │   ├── action-map/               # ActionMap関連【Phase 11, 14.6.3分割】7ファイル
│   │   │   ├── useActionMapViewModel.ts  # 統合レイヤー（560行）
│   │   │   ├── useActionMapCRUD.ts   # Map CRUD（188行）
│   │   │   ├── useActionItemCRUD.ts  # Item CRUD（126行）
│   │   │   ├── useActionItemOperations.ts # Item操作（183行）
│   │   │   ├── useActionItemTaskLink.ts  # Task連携（134行）
│   │   │   ├── useActionItemCSV.ts   # CSV操作（120行）
│   │   │   └── useActionMapProgress.ts   # 進捗計算（77行）
│   │   │
│   │   └── ...                       # その他ViewModel
│   │
│   ├── google/                       # Google API クライアント【Phase 10】
│   │   ├── calendar-client.ts        # Calendar API
│   │   ├── tasks-client.ts           # Tasks API
│   │   └── sync-engine.ts            # 同期エンジン
│   │
│   ├── server/                       # サーバー専用
│   │   ├── db.ts                     # PostgreSQL プール管理
│   │   ├── auth.ts                   # 認証・認可ヘルパー
│   │   ├── api-utils.ts              # 共通APIユーティリティ
│   │   ├── encryption.ts             # AES-256-GCM 暗号化
│   │   ├── rate-limit.ts             # レート制限
│   │   ├── session-cache.ts          # セッションキャッシュ【Phase 14.2】
│   │   ├── workspace-cache.ts        # ワークスペースキャッシュ【Phase 14.2】
│   │   ├── sync-queue.ts             # 同期ジョブキュー【Phase 14.2】
│   │   ├── supabase.ts               # Supabase Admin クライアント
│   │   └── supabase-ssr.ts           # Supabase SSR ラッパー
│   │
│   ├── client/                       # クライアント専用
│   │   └── supabase.ts               # Supabase ブラウザクライアント
│   │
│   ├── csv/                          # CSVライブラリ【Phase 14.1, 14.6.3分割】8ファイル
│   │   ├── index.ts                  # re-export（8行）
│   │   ├── csv-parser.ts             # パーサー（273行）
│   │   ├── csv-generator.ts          # ジェネレーター（92行）
│   │   ├── csv-mappings.ts           # マッピング定義（251行）
│   │   ├── csv-types.ts              # 型定義（46行）
│   │   ├── csv-utils.ts              # ユーティリティ（13行）
│   │   ├── unified-csv.ts            # 統合CSVロジック（338行）
│   │   └── useCSV.ts                 # useCSVフック（301行）
│   │
│   ├── utils/                        # ユーティリティ
│   │   └── permissions.ts            # 権限チェック関数
│   │
│   └── types/                        # TypeScript 型定義（約2,550行）
│       ├── database.ts               # DB 型定義
│       ├── app-data.ts               # AppData 型定義
│       ├── task.ts                   # Task, Suit, SubTask【Phase 10】
│       ├── elastic-habit.ts          # ElasticHabit, UmeHabit【Phase 10】
│       ├── calendar.ts               # カレンダー連携【Phase 10】
│       ├── time-allocation.ts        # 時間有効活用【Phase 10】
│       ├── action-map.ts             # ActionMap, ActionItem【Phase 11】
│       ├── okr.ts                    # Objective, KeyResult【Phase 12】
│       └── org-chart.ts              # 組織図【Phase 13.5】
│
├── tests/                            # テスト
│   ├── e2e/                          # E2Eテスト（Playwright）
│   ├── integration/                  # 統合テスト
│   ├── unit/                         # ユニットテスト
│   └── setup/                        # テストセットアップ
│
├── migrations/                       # DBマイグレーション
│   ├── 000-base-schema.sql           # 基本スキーマ（7テーブル）
│   ├── 001-rls-policies.sql          # RLSポリシー
│   ├── 002-workspace-keys.sql        # 暗号鍵テーブル
│   ├── 003-sessions-table.sql        # セッション管理テーブル
│   └── 010-add-version-column.sql    # バージョンカラム（楽観的排他）
│
├── scripts/                          # 運用スクリプト
│   ├── run-migration.ts              # マイグレーション実行
│   ├── seed-admin.ts                 # Admin ユーザー作成
│   ├── measure-p95.ts                # P95 計測
│   └── check-bundle-size.cjs         # バンドルサイズ確認
│
├── .archive/                         # レガシーコード隔離（隠しフォルダ）
│
├── docs/                             # ドキュメント
│   ├── FDC-CORE.md                   # 開発コアガイド
│   ├── guides/                       # 利用ガイド
│   ├── specs/                        # 技術仕様
│   ├── runbooks/                     # フェーズ別ランブック
│   └── legacy/                       # レガシードキュメント
│
├── middleware.ts                     # Next.js ミドルウェア（認証チェック）
├── next.config.mjs                   # Next.js 設定
├── tsconfig.json                     # TypeScript 設定（strict: true）
├── eslint.config.mjs                 # ESLint 設定
├── playwright.config.ts              # Playwright 設定
└── package.json                      # 依存関係
```

---

## 3. アーキテクチャパターン

### 3.1 楽観的排他制御（Optimistic Locking）
- `workspace_data.version` カラムで競合検出
- PUT時に version 不一致で 409 応答

### 3.2 データ圧縮（Gzip）
- `lib/core/compression.ts` で Gzip 圧縮/展開
- 50-70% のサイズ削減

### 3.3 コード分割（Dynamic Import）
- `next/dynamic` で重いコンポーネントを遅延ロード
- 対象: ZoomScript, Templates, Reports, LeanCanvas, Todo, Admin, SADashboard

### 3.4 ViewModel パターン
- `lib/hooks/use*ViewModel.ts` でロジックとUIを分離
- データフロー: ViewModel → UI の一方向

---

## 4. データフロー（Next.js 15 + Supabase Auth 統合）

```
┌──────────────────┐
│   Browser        │ Google OAuth認証
│  (Next.js 15)   │ ─────────────────► Google Identity Services
│  React 19        │                           │
└────────┬─────────┘                           ▼
         │                               ID Token検証
         │ API Call                            │
         │ Cookie: fdc_session                 │
         │ (HttpOnly, Secure, SameSite=Lax)    │
         ▼                                     │
┌───────────────────────┐                      │
│  Next.js Route        │◄─────────────────────┘
│  Handlers             │  Supabase Auth 統合
│  (app/api/**/route.ts)│
└──────────┬────────────┘
           │
           │ 1. セッション検証 (lib/server/middleware.ts)
           │    - Cookie から fdc_session 読み取り
           │    - sessions テーブルで検証
           │
           │ 2. アプリケーション層認可
           │    - API Route内でワークスペースメンバーシップ検証
           │    - SERVICE_ROLE_KEY使用のためRLSはバイパス
           │
           │ 3. ワークスペース鍵取得
           │    - lib/server/keyManagement.ts
           │    - workspace_keys テーブルから取得
           │    - マスター鍵で復号
           │
           │ 4. データ暗号化/復号
           │    - lib/server/encryption.ts
           │    - AES-256-GCM（2層暗号化）
           │
           ▼
┌──────────────────────┐
│    Supabase          │ SERVICE_ROLE_KEY使用
│ PostgreSQL 17.6      │ - users
│                      │ - workspaces
│ RLSポリシー定義済み  │ - workspace_members
│ ※SERVICE_ROLE_KEY   │ - workspace_data（暗号化）
│   使用でバイパス     │ - workspace_keys（暗号化）
│ 7 インデックス       │ - audit_logs
│                      │ - sessions
└──────────────────────┘
```

---

## 5. 認証フロー詳細

1. ユーザーが Google でログイン → Google Identity Services が ID Token 発行
2. フロントエンドが Supabase Auth に ID Token 送信
3. Supabase Auth が Google tokeninfo API で検証
4. 検証成功 → Supabase Auth がアクセストークン・リフレッシュトークン発行
5. フロントエンドが `/api/auth/token` を呼び出し、セッション作成
6. サーバーが `sessions` テーブルにセッション保存、Cookie 設定
7. 以降のAPIリクエストは Cookie でセッション検証

---

## 6. テスト構成

| テスト種別 | フレームワーク | 対象 | 実行コマンド |
|-----------|--------------|------|-------------|
| E2Eテスト | Playwright | フロント〜API統合 | `npm test` |
| ユニットテスト | Vitest | ロジック・暗号化 | `npm run test:unit` |
| 統合テスト | Playwright Test Runner | API統合・DB連携 | `npm test tests/integration/` |
| 型チェック | TypeScript | 全TypeScriptファイル | `npm run type-check` |

### E2Eテスト（tests/e2e/）

| テストファイル | テスト対象 | 状態 |
|--------------|-----------|------|
| auth.spec.ts | 認証フロー | ✅ 完了 |
| roles.spec.ts | RBAC・ロール管理 | ✅ 完了 |
| workspace.spec.ts | ワークスペース管理 | ✅ 完了 |
| reports.spec.ts | レポート生成 | ✅ 完了 |
| todo.spec.ts | TODO管理 | ✅ 完了 |
| leads.spec.ts | リード管理 | ✅ 完了 |
| templates.spec.ts | テンプレート管理 | ✅ 完了 |
| all-features.spec.ts | 全機能テスト | ✅ 完了 |
| form-save.spec.ts | フォーム保存テスト | ✅ 完了 |
| visual-regression.spec.ts | ビジュアルリグレッション | ✅ 完了 |

### テスト実行方法

```bash
# 全テスト実行
npx playwright test

# 特定のテストファイルのみ
npx playwright test tests/e2e/auth.spec.ts

# 特定の権限ロールのみ
npx playwright test --project=OWNER-chromium
```

---

## 7. 環境変数

```bash
# 環境設定
APP_ENV="production"

# データベース
DATABASE_URL="postgresql://..."           # 本番DB（Transaction Pooler）
DIRECT_DATABASE_URL="postgresql://..."    # マイグレーション用（Direct Connection）

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# 暗号化
MASTER_ENCRYPTION_KEY="..."               # AES-256用32バイト鍵（Base64）

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# キャッシュ（オプション）
DISABLE_SESSION_CACHE=true                # セッションキャッシュ無効化
DISABLE_WORKSPACE_CACHE=true              # ワークスペースキャッシュ無効化

# Cron
CRON_SECRET="..."                         # Cronワーカー認証用
```

---

## 8. デプロイコマンド

```bash
# Vercel にデプロイ
vercel --prod

# 環境変数を取得
vercel env pull .env.local

# マイグレーション適用
psql $DIRECT_DATABASE_URL -f migrations/000-base-schema.sql

# バックアップ
pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

---

**Last Updated**: 2025-12-02
**Source**: FDC-GRAND-GUIDE.md（分割）
**Phase 14.6.3**: 大規模ファイル分割完了（8ファイル → 38ファイル）
