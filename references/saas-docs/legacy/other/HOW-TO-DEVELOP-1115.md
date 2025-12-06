# 🧠 HOW-TO-DEVELOP.md
### Founders Direct Cockpit 開発ルール ＆ Claude Code 運用ガイド（最新版 v2.3.1+）

> **目的:**
> このドキュメントは、Founders Direct Cockpit（FDC）の開発・拡張を安全かつ一貫性をもって進めるための**AI・人間共通の開発規範**です。
> Claude Code や ChatGPT、Copilotなど、どのAIを使用する場合も**必ず本ドキュメントを読み込み遵守**してください。

本プロジェクトでは、Claude Code / ChatGPT 等の複数AIエージェントを「役割分担された開発チーム」として扱い、フェーズ単位のDOD（完了定義）＋自動レビュー＋本番ビルドを必須プロセスとすることで、開発速度と再現性を最大化する。

**🎉 本番運用中（v2.3.1 デプロイ完了: 2025-11-12）**
**📊 開発状況: Phase 7 完了 / Phase 8 進行中（Phase 8-7 まで完了）**

## 📁 プロジェクト全体構成（TypeScript版 v2.3.1 - 本番運用中）

```
foundersdirect/
├── index.html                      # メインHTMLファイル（ES Modules経由でdist/main.jsを読み込み）
│
├── 📋 DOCS/                        # ドキュメント類
│   ├── HOW-TO-USE.md               # ユーザー向け利用マニュアル
│   ├── HOW-TO-DEVELOP.md           # 開発者・AI向けガイド（このファイル）
│   ├── FDC-GRAND-GUIDE.md          # 開発全体の指針・AIチーム運用ガイド
│   ├── FINAL-INSPECTION-REPORT.md  # 最終検査レポート（v2.3.1）
│   ├── CHANGELOG.md                # 変更履歴
│   ├── E2E-TEST-GUIDE.md           # E2Eテスト実行ガイド
│   ├── CONFIG-REFERENCE.md         # 設定リファレンス
│   ├── DEPLOYMENT-GUIDE.md         # デプロイガイド
│   ├── SERVER-API-SPEC.md          # サーバーAPIドキュメント
│   ├── WORKSPACE-SECURITY-DESIGN.md # Workspace暗号化・セキュリティ設計
│   ├── RLS-VERIFICATION-GUIDE.md   # RLS検証ガイド（Phase 8-7）
│   ├── Phase-8-*.md                # Phase 8関連の設計・実装レポート
│   └── MYSQL-SCHEMA.sql            # MySQLスキーマ定義
│
├── ⚙️ 設定ファイル
│   ├── package.json                # npm設定・スクリプト定義
│   ├── package-lock.json           # npm依存関係ロックファイル
│   ├── tsconfig.json               # TypeScriptコンパイラ設定
│   ├── playwright.config.ts        # Playwrightテスト設定
│   └── .gitignore                  # Git除外設定（node_modules, ログ, テスト結果等）
│
├── 📂 js/                          # TypeScriptソースコード（開発用）
│   ├── main.ts                     # エントリーポイント（初期化・認証・タブ切替）
│   ├── core/                       # コア機能モジュール（共通基盤）
│   │   ├── state.ts                # 状態管理（appDataの定義と初期化）
│   │   ├── storage.ts              # localStorage管理（loadData/saveData/resetData）
│   │   ├── domCache.ts             # DOMキャッシュ機構（DOM.get()）
│   │   ├── utils.ts                # ユーティリティ関数（escapeHtml等）
│   │   ├── apiClient.ts            # APIクライアント（サーバー通信）
│   │   ├── googleAuth.ts           # Google認証
│   │   ├── googleCalendar.ts       # Googleカレンダー連携
│   │   └── auth.ts                 # RBAC権限チェック（Phase 7-8）
│   └── tabs/                       # タブ別機能モジュール
│       ├── dashboard.ts            # ダッシュボードタブ
│       ├── mvvOkr.ts               # MVV・OKRタブ
│       ├── brand.ts                # ブランド指針タブ
│       ├── leanCanvas.ts           # リーンキャンバスタブ
│       ├── todo.ts                 # TODOタブ
│       ├── leads.ts                # 見込み客管理タブ
│       ├── clients.ts              # 顧客管理タブ
│       ├── zoomMeetings.ts         # Zoom会議タブ
│       ├── templates.ts            # テンプレート集タブ
│       ├── reports.ts              # レポートタブ（Phase 7-11）
│       ├── settings.ts             # 設定タブ
│       └── admin.ts                # 管理者タブ（Phase 7-10）
│
├── 📂 api/                         # サーバーサイドAPI（Vercel Serverless Functions）
│   ├── _lib/                       # API共通ライブラリ
│   │   ├── db.ts                   # データベースアクセス層（Vercel Postgres）
│   │   ├── auth.ts                 # 認証・認可ヘルパー
│   │   ├── types.ts                # API型定義
│   │   ├── response.ts             # レスポンスヘルパー
│   │   ├── encryption.ts           # 暗号化・復号モジュール（Phase 8-2）
│   │   ├── keyManagement.ts        # 暗号鍵管理（Phase 8-2）
│   │   └── rate-limit.ts           # レート制限
│   ├── auth/                       # 認証関連API
│   │   ├── google.ts               # Google OAuth認証
│   │   ├── me.ts                   # 現在のユーザー情報取得
│   │   └── roles.ts                # ロール管理（Phase 7-8）
│   ├── workspaces/                 # Workspace管理API
│   │   ├── index.ts                # Workspace一覧・作成
│   │   └── [workspaceId]/
│   │       ├── data.ts             # Workspaceデータ保存・取得（暗号化対応）
│   │       └── members.ts          # メンバー管理（Phase 7-10）
│   ├── reports/                    # レポート生成API（Phase 7-11）
│   │   ├── summary.ts              # ロール別レポートサマリ
│   │   ├── cross-workspace.ts      # Cross-Workspaceレポート
│   │   └── export.ts               # CSVエクスポート
│   ├── audit-logs/                 # 監査ログAPI（Phase 7-10）
│   │   └── index.ts                # 監査ログ取得
│   └── analyze/                    # データ分析API
│       └── index.ts                # KPI分析
│
├── 📦 dist/                        # ビルド成果物（本番配信用・コミット対象）
│   ├── main.js                     # コンパイル済みエントリーポイント
│   ├── core/                       # コンパイル済みコアモジュール
│   │   ├── state.js
│   │   ├── storage.js
│   │   ├── domCache.js
│   │   ├── utils.js
│   │   ├── apiClient.js
│   │   ├── googleAuth.js
│   │   └── googleCalendar.js
│   └── tabs/                       # コンパイル済みタブモジュール
│       ├── dashboard.js
│       ├── mvvOkr.js
│       ├── brand.js
│       ├── leanCanvas.js
│       ├── todo.js
│       ├── leads.js
│       ├── clients.js
│       ├── zoomMeetings.js
│       ├── templates.js
│       ├── settings.js
│       └── admin.js
│
├── 🧪 tests/                       # E2Eテスト（Playwright）
│   └── e2e/
│       ├── auth.spec.ts            # 認証機能テスト（4テストケース）
│       ├── todo.spec.ts            # TODO管理テスト（8テストケース）
│       ├── leads.spec.ts           # 見込み客管理テスト（8テストケース）
│       ├── templates.spec.ts       # テンプレート集テスト（12テストケース）
│       ├── roles.spec.ts           # ロール機能テスト（Phase 7-10）
│       ├── workspace.spec.ts       # Workspace機能テスト（Phase 7-10）
│       └── reports.spec.ts         # レポート機能テスト（Phase 7-11）
│
├── 📂 migrations/                  # データベースマイグレーション（Phase 8-7）
│   ├── 000-base-schema.sql         # ベーススキーマ定義
│   ├── 001-rls-policies.sql        # RLS（Row Level Security）ポリシー
│   └── 002-workspace-keys.sql      # Workspace暗号鍵テーブル
│
├── 📂 scripts/                     # 運用スクリプト
│   └── phase-8-7/                  # Phase 8-7 RLS適用スクリプト
│       ├── verify-rls-test.sql     # TEST DB検証
│       ├── verify-rls-prod.sql     # 本番DB検証
│       ├── backup-prod-db.sh       # 本番DBバックアップ
│       └── rollback-rls.sql        # RLSロールバック
│
└── 📦 node_modules/                # npm依存パッケージ（.gitignore対象）
    ├── typescript/                 # TypeScriptコンパイラ
    ├── @playwright/test/           # Playwrightテストフレームワーク
    └── @types/node/                # Node.js型定義
```

### 🔑 重要なポイント

✅ **依存方向**：`core → tabs → main` の一方向依存
⛔ **循環参照禁止**：`tabs` から `core` のみ呼び出し可能、逆は禁止
📝 **開発フロー**：`js/*.ts` を編集 → `npm run build` → `dist/*.js` 生成
🌐 **本番配信**：`index.html` は `dist/main.js` を読み込み（ES Modules）
🧪 **テスト実行**：`npm test` でE2Eテスト実行（32テストケース、100%成功）
🚀 **本番運用**：v2.3.1 が本番環境で稼働中（2025-11-12デプロイ完了）

### 📂 .gitignore 対象ファイル（自動生成・除外）

```
node_modules/          # npm依存パッケージ
playwright-report/     # テストレポート（実行時に自動生成）
test-results/          # テスト結果（実行時に自動生成）
*.log                  # ログファイル（server.log, test-output.log等）
.DS_Store              # macOS一時ファイル
```

### 🔄 開発の変遷（v1.4.0 → v2.3.1）

| 項目 | JavaScript版 (v1.4.0) | TypeScript版 (v2.0.0) | 本番版 (v2.3.1) |
|------|----------------------|----------------------|----------------|
| ソースコード | `js/*.js` | `js/*.ts` | `js/*.ts` |
| ビルド | 不要 | `npm run build` | `npm run build` |
| 型チェック | なし | `npm run type-check` | `npm run type-check` |
| index.html | `./js/main.js` | `./dist/main.js` | `./dist/main.js` |
| E2Eテスト | 未実装 | Playwright（32テスト、90成功） | Playwright（32テスト、100%成功） |
| API連携 | なし | なし | Google API、サーバーAPI |
| 管理機能 | なし | なし | 管理者タブ、MySQL連携 |
| 本番環境 | 未デプロイ | 未デプロイ | ✅ **デプロイ完了** |

---

## 🤝 フェーズ完了と承認フロー

本プロジェクトでは、すべてのフェーズ完了後に
**Claude Code（実装エージェント）** が「完了報告」を行い、
**ChatGPT（統合エージェント）** が「承認」または「修正指示」を返信する。

### 完了報告テンプレート（Claude Code用）

各フェーズ終了時は、必ず以下の形式で出力してください：

```markdown
✅ Phase X 完了報告

**実施内容概要:**
- 〇〇機能の実装
- △△の修正

**変更ファイル一覧:**
- `js/tabs/xxx.ts` - 主要機能追加
- `js/core/yyy.ts` - ユーティリティ拡張

**修正理由:**
- 〇〇を実現するため
- △△の整合性を保つため

**検証結果:**
- ✅ TypeScript型チェック: `npm run type-check` 成功
- ✅ ビルド: `npm run build` 成功
- ⚠️ E2Eテスト: 未実施（手動確認推奨）

**影響範囲:**
- 既存データ構造: 変更なし / 拡張のみ
- 既存機能: 影響なし / 一部修正

**次フェーズ提案（任意）:**
- Phase X+1: 〇〇の実装を推奨
```

### 承認フロー（業務プロセス）

1. **Claude Code** → 完了報告を提出
2. **ChatGPT** → 承認 or 修正指示を返信
3. **人間開発者** → 最終確認・コメント
4. **Claude Code** → （承認後）次フェーズ開始

**重要:** ChatGPTの承認が出るまで、次フェーズには進まないこと。
承認されるまで再実行・修正を繰り返す。

---

## ⚙️ 基本ルール（全AI・開発者共通）

1. **本ファイルを読まずに改修・追加実装しないこと。**
2. **TypeScript必須ルール：** ⭐ 重要
　- **新規ファイルは必ず `.ts` 拡張子で作成**
　- **`.js` ファイルの作成は禁止**（`dist/` は自動生成なので除く）
　- 開発フロー: `js/*.ts` を編集 → `npm run build` → `dist/*.js` 生成
　- 型定義を必ず記述（`any` 型の乱用禁止）
　- ビルド前に `npm run type-check` で型エラーがないことを確認
3. **localStorage への直接アクセス禁止。**
　→ `core/storage.ts` 経由で行う。(`loadData`, `saveData`, `resetData` など)
4. **イベント登録ルール：**
　- `initXxxTab()` → 初期化のみ
　- `renderXxxTab()` → 描画・更新のみ
5. **window 公開関数ルール：** ⭐ 重要
　- HTMLから直接呼ばれる関数（onclick, onchange等）のみ `window` に公開
　- タブ内部で完結する関数は通常の関数として定義（window公開不要）
　- 他のwindow公開関数から呼ばれるだけの関数も window公開不要
　- グローバル汚染を最小限に抑える
6. **変更範囲を最小限にする。**
　他タブ・他coreファイルへ影響を与えない。
7. **全自動リライト禁止。**
　AIによる全ファイル再整形・一括リファクタは禁止。
8. **変更箇所の報告義務。**
　修正したファイル・関数・目的を箇条書きで残す。
9. **互換性を壊す変更は禁止。**
　appData構造・既存key名を勝手に変更しない。

---

## 🤖 Claude / ChatGPT サブエージェント運用ルール（正式正本）

### 必須読込

すべてのエージェント（Claude Code / ChatGPT / Copilot 等）は、作業開始前に HOW-TO-DEVELOP.md を読み込み、このルールに従うこと。

### 役割分担（分散並列）

大きめの開発タスクでは、必要に応じて以下の「サブエージェント」を起動してよい：

- **🧩 設計エージェント**: 要件整理・型定義・データ構造
- **🔧 実装エージェント**: 該当タブ / core の実装
- **🧪 テストエージェント**: Playwright / 手動確認観点の生成
- **📘 ドキュメントエージェント**: HOW-TO-USE.md / CHANGELOG.md 更新案の作成

ただし各サブエージェントは担当ファイルを明示し、他エージェントの担当領域を勝手に書き換えないこと。

### 出力フォーマット統一（DOD準備）

各サブエージェントは作業完了時に、必ず次の形式でレポートを出力する：

- 変更ファイル
- 修正内容
- 理由
- 影響範囲
- 推奨ビルド／テストコマンド（例: `npm run build`, `npm test`）

### 統合エージェントの存在

分散出力は、必ず「統合役エージェント（または人間）」がレビューし、コンフリクト解消・最終判断を行う。
統合前に main ブランチへ直接反映しない。



## 📊 プロジェクト統計情報（2025-11-14 最新版）

### コードベース規模

| 区分 | ファイル数 | 総行数 |
|------|-----------|--------|
| **TypeScript (Source)** | 20ファイル | 約8,200行 |
| ├─ core/ | 8ファイル | 約2,200行 |
| ├─ tabs/ | 12ファイル | 約5,600行 |
| └─ main.ts | 1ファイル | 約400行 |
| **API (Serverless)** | 18ファイル | 約3,800行 |
| ├─ _lib/ | 6ファイル | 約1,200行 |
| ├─ auth/ | 3ファイル | 約600行 |
| ├─ workspaces/ | 3ファイル | 約800行 |
| ├─ reports/ | 3ファイル | 約900行 |
| └─ その他 | 3ファイル | 約300行 |
| **JavaScript (Build)** | 20ファイル | 約8,200行 |
| **HTML** | 1ファイル | 約3,200行 |
| **E2Eテスト** | 7ファイル | 約1,200行 |
| **マイグレーション** | 3ファイル | 約500行 |
| **ドキュメント** | 21ファイル | 約12,000行 |
| **総計** | 70ファイル | 約37,100行 |

### ファイル別詳細（TypeScript Source）

**core層（共通基盤）**
- `state.ts`: 約750行 - 型定義・設定・データ構造（RBAC、CurrentUser等含む）
- `storage.ts`: 約250行 - localStorage管理
- `apiClient.ts`: 約300行 - サーバーAPI通信
- `googleAuth.ts`: 約200行 - Google認証
- `googleCalendar.ts`: 約200行 - Googleカレンダー連携
- `auth.ts`: 約430行 - RBAC権限チェック（Phase 7-8）
- `utils.ts`: 約100行 - ユーティリティ関数
- `domCache.ts`: 約60行 - DOM要素キャッシュ

**tabs層（機能モジュール）**
- `leads.ts`: 約1,100行 - 見込み客管理（最大）
- `templates.ts`: 約650行 - テンプレート集
- `leanCanvas.ts`: 約580行 - リーンキャンバス
- `dashboard.ts`: 約520行 - ダッシュボード（KPI・ファネル）
- `clients.ts`: 約460行 - 既存客管理
- `reports.ts`: 約450行 - レポート（Phase 7-11）
- `brand.ts`: 約450行 - ブランド指針
- `mvvOkr.ts`: 約400行 - MVV・OKR
- `zoomMeetings.ts`: 約360行 - Zoom面談
- `todo.ts`: 約340行 - TODO管理
- `admin.ts`: 約280行 - 管理者機能（Phase 7-10）
- `settings.ts`: 約160行 - 設定

**API層（Serverless Functions）**
- `api/_lib/db.ts`: 約650行 - データベースアクセス（Vercel Postgres）
- `api/_lib/encryption.ts`: 約300行 - 暗号化・復号（Phase 8-2）
- `api/_lib/auth.ts`: 約200行 - 認証・認可ヘルパー
- `api/workspaces/[workspaceId]/data.ts`: 約250行 - Workspaceデータ保存・取得
- `api/reports/summary.ts`: 約350行 - ロール別レポート生成（Phase 7-11）
- その他各種APIエンドポイント

### プロジェクトメトリクス

| 項目 | 値 |
|------|-----|
| **バージョン** | 2.3.1 ✅ **本番運用中** |
| **Gitコミット数** | 150件以上 |
| **ブランチ** | main |
| **TypeScript化完了率** | 100% ✅ |
| **E2Eテストカバレッジ** | 7タブ（50+テスト、100%成功） |
| **ドキュメント整備率** | 100% ✅ |
| **本番デプロイ** | ✅ **完了**（2025-11-12） |
| **開発フェーズ** | Phase 7 完了 / Phase 8 進行中（8-7まで完了） |
| **API統合** | Vercel Postgres（Neon）、Google API、サーバーAPI |
| **セキュリティ** | RLS（Row Level Security）、暗号化、監査ログ |
| **認証・認可** | Google OAuth、RBAC（3ロールモデル） |

### 主要機能数

- **タブ数**: 12タブ（ダッシュボード、MVV、ブランド、リーンキャンバス、TODO、見込み客、既存客、Zoom、テンプレート、レポート、設定、管理者）
- **アプローチチャネル**: 7チャネル（リアル、HP、メルマガ、メッセンジャー、X、電話・SMS、WEBアプリ）
- **ステータス種別**: 6種類（未接触、反応あり、商談中、成約、既存先、契約満了、失注）
- **テンプレートタイプ**: 4種類（messenger、email、proposal、closing）
- **初期ABCテンプレート**: 6件（messenger 3件、email 3件）
- **ユーザーロール**: 3ロール（EXEC、MANAGER、MEMBER）+ グローバル管理者
- **データベーステーブル**: 6テーブル（users, workspaces, workspace_members, workspace_data, audit_logs, workspace_keys）
- **外部連携**: Google OAuth、Googleカレンダー、Vercel Postgres、独自サーバーAPI
- **セキュリティ機能**: RLS（11ポリシー）、AES-256-GCM暗号化、監査ログ、レート制限

---

## 🔐 Phase 7 & 8: セキュリティ・認証・暗号化（実装完了 / 進行中）

### Phase 7: セキュリティ・認証・ロール運用（✅ 完了）

**目的**: ローカル中心から、サーバー認証・ロール管理を軸に再構成。

**完了内容**:
- ✅ **Phase 7-1〜7-7**: ロール設計・権限マトリクス整備、Google OAuth連携
- ✅ **Phase 7-8**: ロール統合API拡張（`/api/auth/roles`）
- ✅ **Phase 7-9**: CurrentUser管理統合（`js/core/state.ts`）
- ✅ **Phase 7-10**: Workspace権限・監査ログ・RBAC実装
  - Workspace メンバー管理API（`/api/workspaces/[workspaceId]/members`）
  - 監査ログAPI（`/api/audit-logs`）- DB永続化対応
  - ロール管理API（`/api/auth/roles`）
  - RBAC権限チェック（`js/core/auth.ts`）- canEditLead, canViewClient等
  - 管理UIの実装（`js/tabs/admin.ts`）
  - E2Eテスト（`tests/e2e/roles.spec.ts`, `workspace.spec.ts`）
- ✅ **Phase 7-11**: ロール別レポート生成 / 組織横断ビュー構築
  - ロール別レポートAPI（`/api/reports/summary.ts`）
    - EXEC: 全体KPI / ファネル / チャネル統計 / チームパフォーマンス
    - MANAGER: 自チームKPI / ファネル / チームパフォーマンス
    - MEMBER: 個人パフォーマンス / 自分のタスク・リード・クライアント
  - Cross-Workspace集計API（`/api/reports/cross-workspace.ts`）
  - レポートエクスポートAPI（`/api/reports/export.ts`）- CSV形式
  - レポートタブUI（`js/tabs/reports.ts`）
- ✅ **Phase 7-12**: ロール同期安定化・Phase8ブリッジ

**成果**:
- 認証とロール制御を完全にサーバーサイドへ移行
- ログイン状態・ユーザー切替・アクセス権限が全てGoogle OAuth + DB管理下に統一
- localStorage はキャッシュ層としてのみ機能

### Phase 8: Workspace管理・暗号化・完全サーバー化（🚧 進行中）

**目的**: 完全サーバー化・暗号化保存・自動同期を実現。

**完了内容**:
- ✅ **Phase 8-1**: Workspace暗号化方針の設計（マスター鍵 + Workspace鍵の二層暗号化）
- ✅ **Phase 8-2**: 暗号鍵管理モジュール実装（`api/_lib/encryption.ts`, `api/_lib/keyManagement.ts`）
- ✅ **Phase 8-3**: サーバー保存プロトコル整備（AppData → 暗号化JSON）
- ✅ **Phase 8-4**: フロント復号処理・同期Worker統合
- ✅ **Phase 8-5**: Workspace切替・データ同期安定化
- ✅ **Phase 8-6**: セキュリティ検証・暗号化統合レビュー
- ✅ **Phase 8-7**: RLSマイグレーション適用 & TEST_DB切替
  - `migrations/000-base-schema.sql`: ベーススキーマ（6テーブル）
  - `migrations/001-rls-policies.sql`: RLSポリシー（11ポリシー、7インデックス）
  - `migrations/002-workspace-keys.sql`: Workspace鍵テーブル
  - TEST DB検証完了（`scripts/phase-8-7/verify-rls-test.sql`）
- 🚧 **Phase 8-8**: E2E Testing（Google Login → Workspace作成 → RLS操作確認）- 次のステップ
- 🔜 **Phase 8-9**: Production Cutover & Monitoring（本番切替＋監視）
- 🔜 **Phase 9-1**: Legacy Data Migration（旧・平文データの移行）

**データベーススキーマ（Phase 8-7）**:
```sql
users (id, google_sub, email, name, picture, global_role, created_at, updated_at)
workspaces (id, name, created_by, created_at)
workspace_members (id, workspace_id, user_id, role, joined_at)
workspace_data (workspace_id, data, updated_at) -- JSONB暗号化データ
audit_logs (id, workspace_id, user_id, action, resource_type, resource_id, details, created_at)
workspace_keys (workspace_id, encrypted_key, created_at, updated_at) -- 暗号化されたWorkspace鍵
```

**RLSポリシー**:
- `users`: 自分のレコードのみ閲覧・更新可能（`users_select_self`, `users_update_self`）
- `workspaces`: 所属Workspaceのみ閲覧可能（`workspaces_select_member`）、EXEC/adminのみ更新可能（`workspaces_update_admin`）
- `workspace_members`: 所属Workspaceのメンバー閲覧可能（`workspace_members_select`）、admin以上が管理可能（`workspace_members_modify_admin`）
- `workspace_data`: 所属Workspaceのデータのみ閲覧・変更可能（`workspace_data_select_member`, `workspace_data_modify_member`）
- `audit_logs`: admin以上が閲覧可能（`audit_logs_select_admin`）、全メンバーが作成可能（`audit_logs_insert_member`）

**暗号化仕様**:
- アルゴリズム: AES-256-GCM
- 二層暗号化: マスター鍵（環境変数 `MASTER_ENCRYPTION_KEY`）+ Workspace鍵（`workspace_keys` テーブル）
- データ形式: `{"version":"1", "iv":"...", "authTag":"...", "ciphertext":"..."}`

---

