# 📊 Founders Direct Modular - レガシー/現役ファイル分類

**作成日**: 2025-11-16
**最終更新**: 2025-01-24
**Phase**: Phase 9.8 部分完了（60%）- AI基盤完全実装、データ基盤・ガバナンス部分完了
**目的**: プロジェクト全体でどのファイルが現役（継続的に使用・更新）で、どれがレガシー（参考資料）かを明確にする

---

## 📁 ディレクトリ構造概要

```
foundersdirect/
├── DOCS/                    # ドキュメント
│   ├── (現役ドキュメント)
│   └── legacy/              # レガシードキュメント
├── scripts/                 # 運用スクリプト
│   ├── phase-8-7/          # Phase 8-7 関連スクリプト
│   └── validate-boot.cjs    # 現役スクリプト
├── migrations/              # データベースマイグレーション
└── (その他のソースコード)
```

---

## ⚠️ 重要な発見：不要ファイル・レガシーファイル

プロジェクト全体を調査した結果、以下の不要ファイルとレガシーファイルが見つかりました。

### 🗑️ 削除推奨ファイル

| ファイル | サイズ | 作成日 | 理由 |
|---------|-------|--------|------|
| `contact.csv` | - | - | テストデータ（個人情報含む）。.gitignoreに登録済み |
| `contact_fixed.csv` | 172KB | 2025-11-10 | テストデータ（個人情報含む）。.gitignoreに追加すべき |
| `例:` | 0B | 2025-11-14 | 空ファイル。誤って作成されたと思われる |
| `test-output.log` | - | - | テスト実行ログ。.gitignoreに登録済み |

**推奨アクション**:
1. `contact_fixed.csv` を `.gitignore` に追加
2. これらのファイルを削除（個人情報保護のため）
3. Gitリポジトリからも削除（既にコミットされている場合）

### 🔒 自動生成ファイル（Git管理外）

以下は開発中に自動生成されるファイルで、`.gitignore` で除外済み:

- `node_modules/` - npm依存パッケージ
- `playwright-report/` - テストレポート
- `test-results/` - テスト結果
- `*.log` - ログファイル
- `.DS_Store` - macOS一時ファイル
- `.env.local` - ローカル環境変数
- `.vercel/` - Vercelデプロイ情報
- `tests/.auth/` - Playwright認証状態

これらは削除しても自動的に再生成されます。

---

## 🟢 現役ファイル（Active Files）

継続的に参照・更新されるファイルです。

### 📖 DOCS/ - 現役ドキュメント

| ファイル | 説明 | 更新頻度 | 最終更新 |
|---------|------|---------|----------|
| `README.md` | ドキュメント構成ガイド | 新ドキュメント追加時 | 2025-11-16 |
| `HOW-TO-USE.md` | ユーザー向け利用マニュアル | 新機能追加時 | 2025-11-16 |
| `HOW-TO-DEVELOP.md` | 開発者・AI向けガイド | 開発ルール変更時 | 2025-11-16 |
| `FDC-GRAND-GUIDE.md` | プロジェクトマスタープラン | Phase進捗更新時 | **2025-01-24** ✅ |
| `SECURITY.md` | セキュリティポリシー・実装ガイド | セキュリティ対策追加時 | 2025-11-18 |
| `RLS-POLICY-GUIDE.md` | RLS設定ガイド | RLSポリシー変更時 | 2025-11-16 |
| `SERVER-API-SPEC.md` | サーバーAPI仕様書 | API追加・変更時 | 2025-11-16 |
| `E2E-TEST-GUIDE.md` | E2Eテスト実行ガイド | テスト追加時 | 2025-11-16 |
| `CHANGELOG.md` | 変更履歴 | リリース時 | 2025-11-18 |
| `Performance-Specification-v1.0.md` | 性能要件定義 | 性能要件変更時 | 2025-11-16 |
| `RLS-VERIFICATION-GUIDE.md` | RLS検証ガイド | RLS検証手順変更時 | 2025-11-16 |
| `LEGACY-ACTIVE-CLASSIFICATION.md` | レガシー/現役ファイル分類（本ファイル） | プロジェクト構成変更時 | **2025-01-24** ✅ |
| `PHASE9.8-RUNBOOK.md` | Phase 9.8 ランブック | Phase 9.8 進捗更新時 | **2025-01-24** ✅ |
| `TECH-DEBT-AUDIT.md` | 技術負債監査ログ | 技術負債解消時 | **2025-01-24** ✅ |
| `FDC-ARCHITECTURE-OVERVIEW.md` | アーキテクチャ概要 | アーキテクチャ変更時 | **2025-01-24** ✅ |

**合計**: 20ファイル（Phase 9.7/9.8 完了により追加更新）

**Phase 9.7 完了による変更（2025-11-24）:**
- ✅ 技術負債完全解消（TD-01〜TD-12）
- ✅ スキップテスト 0件達成
- ✅ 型チェック完全 Pass
- ✅ ESLint ガードレール構築

**Phase 9.8 部分完了による変更（2025-01-24）:**
- ✅ `TECH-DEBT-AUDIT.md` に Phase 9.8 セクション追加（v2.8.0）
- ✅ `FDC-ARCHITECTURE-OVERVIEW.md` を Phase 9.8 状態に更新（v2.2）
  - AI連携フロー図追加
  - Phase 9.8 完了実績反映
  - AI Context Control・レート制限・監査ログ説明追加
- ✅ `PHASE9.8-RUNBOOK.md` 更新（Phase 9.8 実装状況反映）
- ✅ `LEGACY-ACTIVE-CLASSIFICATION.md` 更新（本ファイル、v1.2）
- 📦 `PHASE9.7-RUNBOOK.md` → Phase 9.7 完了により legacy/ へ移動候補
- 📦 `PHASE9.5-RUNBOOK.md` → Phase 9.5 完了により legacy/ へ移動済み

---

### 💻 ソースコード - すべて現役

以下のディレクトリ内のファイルは**すべて現役**です：

#### `js/` - TypeScriptソースコード（開発用）
- `main.ts` - エントリーポイント
- `core/` - 8ファイル（state.ts, storage.ts, apiClient.ts, googleAuth.ts, googleCalendar.ts, auth.ts, utils.ts, domCache.ts）
- `tabs/` - 12ファイル（dashboard.ts, mvvOkr.ts, brand.ts, leanCanvas.ts, todo.ts, leads.ts, clients.ts, zoomMeetings.ts, templates.ts, reports.ts, settings.ts, admin.ts）

**合計**: 21ファイル（すべて.ts、.jsファイルは0）

#### `api/` - サーバーレスAPI（Vercel Functions）
- `_lib/` - 共通ライブラリ（9ファイル）
  - `auth.ts`, `db.ts` (653行、Phase 9.7 で pg パッケージに移行完了)
  - `encryption.ts` (172行), `keyManagement.ts`
  - `middleware.ts` (Supabase Auth 検証)
  - `session.ts` (Cookie 読み取り・DB検証、Phase 9 新規)
  - `jwt.ts` (後方互換レイヤー)
  - `rate-limit.ts`, `response.ts`
- `auth/` - 認証API（4ファイル）
  - `token.ts`, `me.ts`, `logout.ts` (Phase 9 新規), `roles.ts`
- `workspaces/` - Workspace管理API（3ファイル）
- `leads/` - 見込み客管理API（2ファイル）
- `clients/` - 顧客管理API（2ファイル）
- `reports/` - レポートAPI（3ファイル）
- `audit-logs/` - 監査ログAPI（1ファイル）
- `analyze/` - データ分析API（1ファイル）
- `ai/chat/` - AI Gateway（1ファイル、**Phase 9.8-B 新規**）

**合計**: 約26-29ファイル

**Phase 9.7 完了による変更:**
- ✅ `api/_lib/db.ts` - Supabase PostgreSQL 対応（653行）
- ✅ `api/_lib/middleware.ts` - Supabase Auth 検証実装
- ✅ `api/_lib/session.ts` - セッション管理実装（新規）
- ✅ `api/auth/logout.ts` - ログアウトAPI（新規）
- ✅ Leads/Clients API - PII フィールド暗号化統合完了

**Phase 9.8-B 完了による追加:**
- ✅ `app/api/ai/chat/route.ts` - AI Gateway（レート制限・監査ログ・OpenAI統合）
- ✅ `lib/core/ai-context.ts` - AI Context Control（PII除外・マスキング）
- ✅ `lib/server/rate-limit.ts` - レート制限機能（5req/min）

#### `dist/` - ビルド成果物（本番配信用）
- `main.js` および `core/`, `tabs/` 配下のコンパイル済みJavaScript
- **注意**: これらは `npm run build` で自動生成されますが、Vercelデプロイのため**Gitにコミット**されています

**合計**: 21ファイル（js/ と対応）

#### `tests/` - E2Eテスト（Playwright）
- `e2e/auth.spec.ts` - 認証テスト
- `e2e/todo.spec.ts` - TODO管理テスト
- `e2e/leads.spec.ts` - 見込み客管理テスト
- `e2e/templates.spec.ts` - テンプレート集テスト
- `e2e/roles.spec.ts` - ロール機能テスト
- `e2e/workspace.spec.ts` - Workspace機能テスト
- `e2e/reports.spec.ts` - レポート機能テスト

**合計**: 7ファイル

---

### ⚙️ 設定ファイル - すべて現役

| ファイル | 説明 | 状態 |
|---------|------|-----|
| `package.json` | npm設定・スクリプト定義 | 🟢 現役 |
| `package-lock.json` | npm依存関係ロック | 🟢 現役 |
| `tsconfig.json` | TypeScriptコンパイラ設定 | 🟢 現役 |
| `playwright.config.ts` | Playwrightテスト設定 | 🟢 現役 |
| `.gitignore` | Git除外設定 | 🟢 現役 |
| `.env.example` | 環境変数テンプレート | 🟢 現役 |
| `boot.yaml` | Claude Code起動設定 | 🟢 現役 |
| `index.html` | メインHTML | 🟢 現役 |

**合計**: 8ファイル

---

### ⚙️ migrations/ - データベースマイグレーション（現役）

| ファイル | 説明 | 状態 | Phase |
|---------|------|-----|-------|
| `000-base-schema.sql` | ベーススキーマ定義（7テーブル） | ✅ 適用済み（Supabase） | Phase 8 |
| `001-rls-policies.sql` | RLSポリシー定義（15ポリシー + 7インデックス） | ✅ 適用済み（Supabase） | Phase 8 |
| `002-workspace-keys.sql` | Workspace暗号鍵テーブル | ✅ 適用済み（Supabase） | Phase 8 |
| `003-sessions-table.sql` | セッション管理テーブル | ✅ 適用済み（Supabase） | Phase 9 |
| `010-add-version-column.sql` | workspace_data version カラム追加 | ✅ 適用済み（Supabase） | **Phase 9.8-A** ✅ |

**合計**: 5ファイル

**Phase 9.7 完了による変更:**
- ✅ `003-sessions-table.sql` 新規追加（セッション管理テーブル + 3インデックス）
- ✅ Supabase PostgreSQL 17.6 への完全移行完了
- ✅ RLS ポリシー15ポリシーに拡張（workspace_keys、sessions 追加）

**Phase 9.8-A 部分完了による変更:**
- ✅ `010-add-version-column.sql` 新規追加（楽観的ロック準備）
- ✅ DB接続方式改善（`DIRECT_DATABASE_URL` 導入）

**注意**: これらのマイグレーションは既に適用済みですが、スキーマの参照・ロールバック用として保管。

---

### 🔧 scripts/ - 運用スクリプト

#### 現役スクリプト

| ファイル | 説明 | 用途 | Phase |
|---------|------|-----|-------|
| `validate-boot.cjs` | boot.yaml検証スクリプト | CI/CD、開発時検証 | - |
| `measure-p95.ts` | workspace_data P95サイズ計測 | 容量監視 | **Phase 9.8-A** ✅ |
| `seed-admin.ts` | Admin権限付与スクリプト | 初回セットアップ | **Phase 9.8-C** ✅ |
| `run-migration.ts` | マイグレーション実行 | DB更新 | **Phase 9.8-A** ✅ |
| `verify-debt-free.sh` | 技術負債チェック | CI/CD | **Phase 9.7** ✅ |
| `monitor-workspace-size.sql` | workspace_data 容量監視SQL | 容量監視 | **Phase 9.7** ✅ |

**Phase 9.8 追加スクリプト:**
- ✅ `measure-p95.ts` - TypeScript版 P95計測（Direct Connection使用）
- ✅ `seed-admin.ts` - 管理者権限付与（初回ログイン後実行）
- ✅ `run-migration.ts` - マイグレーション実行補助

#### Phase 8-7 スクリプト（判断が必要）

| ファイル | 説明 | 分類提案 |
|---------|------|---------|
| `scripts/phase-8-7/README.md` | Phase 8-7 手順書 | 🟡 参考資料（→ legacy 移動候補） |
| `scripts/phase-8-7/apply-rls-test.sh` | TEST DB RLS適用 | 🟡 保管（再適用時に使用可能） |
| `scripts/phase-8-7/apply-rls-prod.sh` | 本番 DB RLS適用 | 🟡 保管（ロールバック時に必要） |
| `scripts/phase-8-7/verify-rls-test.sql` | TEST DB RLS検証 | 🟢 現役（検証時に使用） |
| `scripts/phase-8-7/verify-rls-prod.sql` | 本番 DB RLS検証 | 🟢 現役（検証時に使用） |
| `scripts/phase-8-7/backup-test-db.sh` | TEST DBバックアップ | 🟢 現役（運用で使用） |
| `scripts/phase-8-7/backup-prod-db.sh` | 本番DBバックアップ | 🟢 現役（運用で使用） |
| `scripts/phase-8-7/rollback-rls.sql` | RLSロールバック | 🟡 保管（緊急時に必要） |
| `scripts/phase-8-7/verify-vercel-env.sh` | Vercel環境変数検証 | 🟢 現役（運用で使用） |

**提案**: `scripts/phase-8-7/` 全体を保管（削除しない）。README.md のみ DOCS/legacy/ に移動を検討。

---

## 📦 レガシーファイル（Legacy Files）

実装完了・Phase完了により、参考資料として保管されているファイルです。

### 📦 DOCS/legacy/ - レガシードキュメント

| ファイル | 説明 | アーカイブ理由 | アーカイブ日 |
|---------|------|--------------|------------|
| `CONFIG-REFERENCE.md` | 設定リファレンス（Phase 5-6） | 情報が古い。最新は state.ts と SECURITY.md を参照 | 2025-11-16 |
| `WORKSPACE-SECURITY-DESIGN.md` | セキュリティ設計書（Phase 7） | Phase 7 完了。SECURITY.md と RLS-POLICY-GUIDE.md に統合 | 2025-11-16 |
| `DEPLOYMENT-GUIDE.md` | デプロイガイド（旧版） | 情報が古い。最新のデプロイ手順は別途整備が必要 | 2025-11-16 |
| `FINAL-INSPECTION-REPORT.md` | 最終検査レポート（v2.3.1） | Phase 7 完了時のスナップショット | 2025-11-16 |
| `HOW-TO-DEVELOP-1115.md` | 開発ガイド（2025-11-15版） | HOW-TO-DEVELOP.md に統合済み | 2025-11-16 |
| `FDC-SESSION-BOOTSTRAP.prompt.md` | セッション起動プロンプト | Phase 7 時点の開発用プロンプト | 2025-11-16 |
| `MYSQL-SCHEMA.sql` | MySQLスキーマ定義 | Supabase PostgreSQL 移行により使用終了 | 2025-11-16 |
| `CODEX.txt` | Phase 7 時点のコードベーススナップショット | 歴史的資料 | 2025-11-16 |
| `Phase-8-1-Encryption-Design.md` | Phase 8-1 設計書 | Phase 8-1 完了 | 2025-11-16 |
| `Phase-8-3-Implementation-Report.md` | Phase 8-3 実装レポート | Phase 8-3 完了 | 2025-11-16 |
| `Phase-8-4-Implementation-Report.md` | Phase 8-4 実装レポート | Phase 8-4 完了 | 2025-11-16 |
| `Phase-8-4-Worker-Design.md` | Phase 8-4 Worker設計 | Phase 8-4 完了 | 2025-11-16 |
| `Phase-8-5-Implementation-Report.md` | Phase 8-5 実装レポート | Phase 8-5 完了 | 2025-11-16 |
| `Phase-8-6-Final-Review.md` | Phase 8-6 最終レビュー | Phase 8-6 完了 | 2025-11-16 |
| `Phase-8-7-Deployment-Report.md` | Phase 8-7 デプロイレポート | Phase 8-7 完了 | 2025-11-16 |
| `Phase-8-8-E2E-Test-Plan.md` | Phase 8-8 E2Eテスト計画 | Phase 8-8 完了 | 2025-11-16 |
| `Phase-8-8-Implementation-Report.md` | Phase 8-8 実装レポート | Phase 8-8 完了 | 2025-11-16 |

**合計**: 17ファイル

**Phase 9 完了後の移動候補:**
- 📦 `PHASE9-ENCRYPTION-AND-API-RUNBOOK.md` → Phase 9 完了により legacy/ へ移動予定（2025-11-18）

**注意**: これらのファイルは削除しません。設計の経緯や背景を理解するための参考資料として保管します。

---

## 🎯 推奨アクション

### Phase 9 完了による即座の対応（優先度: 高）

1. **Phase 9 ドキュメントの legacy/ 移動**
   - `PHASE9-ENCRYPTION-AND-API-RUNBOOK.md` を `DOCS/legacy/` に移動
   - Phase 9 完了時点の実装レポートを作成・保管

2. **環境変数ドキュメント更新**
   - Supabase 移行に伴う環境変数の更新（`SUPABASE_URL`、`SUPABASE_ANON_KEY`）
   - `VERCEL-ENV-CHECKLIST.md` の更新（存在する場合）

### 将来的に検討（優先度: 中）

1. **DEPLOYMENT-GUIDE.md の更新版作成**
   - 現在のデプロイ手順（Vercel、Supabase、環境変数設定等）を最新化
   - Supabase 移行後の手順を反映
   - 新規作成し、旧版を legacy/ に保管

2. **scripts/phase-8-7/README.md の移動**
   - DOCS/legacy/ に移動し、「Phase 8-7 実装手順書（完了）」として保管
   - scripts/phase-8-7/ には実行可能スクリプトのみ残す

3. **Phase 10 準備**
   - Phase 10 TODO機能拡張の計画策定
   - スキップテスト解除計画（47件 → 21件に削減済み）

---

## 📋 ファイル移動の必要性判定フローチャート

```
ファイルを見つけた
    ↓
├─ 将来も参照・更新する？
│  ├─ Yes → 🟢 現役（そのまま）
│  └─ No  ↓
│
├─ Phase 完了で役割が終了した？
│  ├─ Yes → 📦 legacy/ に移動
│  └─ No  ↓
│
├─ 情報が古くなっている？
│  ├─ Yes → 📦 legacy/ に移動 or 更新
│  └─ No  ↓
│
└─ 他のドキュメントに統合された？
   ├─ Yes → 📦 legacy/ に移動
   └─ No  → 🟢 現役（そのまま）
```

---

## 🔍 各ディレクトリのサマリー

| ディレクトリ | 現役 | レガシー/不要 | 削除推奨 | 合計 | Phase 9.8 変更 |
|------------|-----|-------------|---------|-----|------------|
| **ソースコード** | | | | | |
| `js/` (TypeScript) | 21 | 0 | 0 | 21 | - |
| `api/` (Serverless) | 26-29 | 0 | 0 | 26-29 | +3ファイル（AI Gateway関連） |
| `lib/` (共通ライブラリ) | 3 | 0 | 0 | 3 | +3（ai-context, rate-limit等） |
| `dist/` (Build) | 21 | 0 | 0 | 21 | - |
| `tests/` (E2E) | 7 | 0 | 0 | 7 | - |
| **設定ファイル** | | | | | |
| ルート設定ファイル | 8 | 0 | 0 | 8 | - |
| **ドキュメント** | | | | | |
| `DOCS/` (ルート) | 20 | 0 | 0 | 20 | +3（PHASE9.8-RUNBOOK等、4ファイル更新） |
| `DOCS/legacy/` | 0 | 17 | 0 | 17 | Phase 9.7完了後 +1-2予定 |
| **データベース** | | | | | |
| `migrations/` | 5 | 0 | 0 | 5 | +1（010-add-version-column.sql） |
| **スクリプト** | | | | | |
| `scripts/` | 6 | 0 | 0 | 6 | +5（measure-p95, seed-admin等） |
| `scripts/phase-8-7/` | 9 | 0 | 0 | 9 | - |
| **不要ファイル** | | | | | |
| ルート不要ファイル | 0 | 0 | 4 | 4 | - |
| **合計** | **126-129** | **17** | **4** | **147-150** | **+15-18ファイル** |

### 📊 プロジェクト全体の内訳

- **🟢 現役ファイル**: 126-129ファイル（継続的に使用・更新）**← Phase 9.8 で +15-18ファイル増加** ✅
- **📦 レガシーファイル**: 17ファイル（DOCS/legacy/ に保管）**← Phase 9.7/9.8 完了後 +1-2予定**
- **🗑️ 削除推奨**: 4ファイル（contact.csv, contact_fixed.csv, 例:, test-output.log）
- **🔒 自動生成**: Git管理外（node_modules/, playwright-report/, etc.）

**Phase 9.7 完了による主要変更:**
- ✅ Supabase PostgreSQL 移行完了（`api/_lib/db.ts` 653行）
- ✅ Supabase Auth 統合完了（`js/core/supabase.ts`, `api/_lib/middleware.ts`, `api/_lib/session.ts`）
- ✅ セッション管理実装（`migrations/003-sessions-table.sql`, `api/auth/logout.ts`）
- ✅ 暗号化統合完了（workspace_data, Leads/Clients PII フィールド）
- ✅ RLS ポリシー15ポリシーに拡張（11 → 15）
- ✅ 技術負債完全解消（TD-01〜TD-12）

**Phase 9.8 部分完了による主要追加:**
- ✅ AI基盤完全実装（`app/api/ai/chat/route.ts`, `lib/core/ai-context.ts`）
- ✅ AI Context Control（PII除外・マスキング、3レベル制御）
- ✅ レート制限実装（5req/min、`lib/server/rate-limit.ts`）
- ✅ AI監査ログ記録機能
- ✅ DB接続二重化（`DIRECT_DATABASE_URL` 導入）
- ✅ 楽観的ロック準備（`migrations/010-add-version-column.sql`）
- ✅ ドキュメント大幅更新（TECH-DEBT-AUDIT.md、FDC-ARCHITECTURE-OVERVIEW.md等）

---

## 📝 メンテナンスルール

### 現役ファイル

- 新機能追加・変更時に更新
- 古い情報が含まれていないか定期的にレビュー
- Phase 完了時に legacy 移動を検討

### レガシーファイル

- 原則として更新しない
- ファイル先頭に「アーカイブ通知」を追加済み
- 削除しない（歴史的資料として保管）

### 新規ファイル追加時

1. 現役として DOCS/ に配置
2. Phase 完了時に legacy 移動を検討
3. README.md に追加して位置づけを明記

---

---

## 📝 更新履歴

### v1.2 (2025-01-24) - Phase 9.8 部分完了対応
- Phase 9.8 部分完了（60%）に伴う現役ファイルの追加・更新
- AI基盤ファイル追加（`app/api/ai/chat/route.ts`, `lib/core/ai-context.ts`）
- レート制限機能追加（`lib/server/rate-limit.ts`）
- DB接続改善（`DIRECT_DATABASE_URL` 導入、`scripts/run-migration.ts`）
- 楽観的ロック準備（`migrations/010-add-version-column.sql`）
- スクリプト追加（`scripts/measure-p95.ts`, `scripts/seed-admin.ts`）
- ドキュメント大幅更新（TECH-DEBT-AUDIT.md、FDC-ARCHITECTURE-OVERVIEW.md）
- 現役ファイル数: 108-111 → 126-129ファイル（+15-18ファイル）

### v1.1 (2025-11-18) - Phase 9.7 完了対応
- Phase 9.7 完了に伴う現役ファイル・レガシーファイルの再分類
- Supabase PostgreSQL 移行対応（DATABASE_URL、migrations 更新）
- Supabase Auth 統合対応（middleware.ts, session.ts, logout.ts 追加）
- セッション管理テーブル追加（migrations/003-sessions-table.sql）
- 技術負債完全解消（TD-01〜TD-12）
- ドキュメント更新状況反映（SECURITY.md v1.2、FDC-GRAND-GUIDE.md v2.9）
- 現役ファイル数: 100 → 108-111ファイル（+8-11ファイル）

### v1.0 (2025-11-16) - 初版
- プロジェクト全体のファイル分類（現役 100ファイル、レガシー 17ファイル）
- Phase 8 完了時点のスナップショット
- ディレクトリ構造とファイルサマリー作成

---

**このドキュメントは、プロジェクトの整理状況を把握するための管理用ドキュメントです。**
**新メンバーのオンボーディング時や、ドキュメント整理時に参照してください。**
**Phase 完了時には必ず更新して、最新のプロジェクト状態を反映してください。**
