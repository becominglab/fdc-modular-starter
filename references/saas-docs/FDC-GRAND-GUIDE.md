# FDC-GRAND-GUIDE.md（v7.16 - 2025-12-05 分割版）

> **重要**: 本ドキュメントは v7.0 で分割・再構成されました。
> 開発時は **`docs/FDC-CORE.md`** を参照してください。

---

## 分割ガイド

FDC-GRAND-GUIDE.md（v6.1、約128KB、2,700行）は以下のドキュメントに分割されました：

### コアドキュメント（開発時に参照）

| ドキュメント | 内容 | サイズ |
|------------|------|--------|
| **`docs/FDC-CORE.md`** | **開発コアガイド（起点）** | ~15KB |
| `docs/guides/DEVELOPMENT.md` | 開発者・AI向け技術詳細ガイド | 既存 |
| `docs/guides/FDC-ARCHITECTURE-OVERVIEW.md` | アーキテクチャ概要 | 既存 |

### レガシー（参照用）

| ドキュメント | 内容 | 分割元セクション |
|------------|------|-----------------|
| `docs/legacy/PHASE-HISTORY.md` | 全Phaseの詳細履歴 | §9, §10, Phase完了サマリ |
| `docs/legacy/ARCHITECTURE-DETAIL.md` | ディレクトリ構造、データフロー詳細 | §3, テスト構成 |
| `docs/legacy/SECURITY-DB-DETAIL.md` | DB設計、認可アーキテクチャ、暗号化詳細 | §4, §5, §6, §7, §8 |
| `docs/legacy/OPS-LESSONS.md` | 運用教訓、Lessons Learned | §17 |

---

## 分割の理由

1. **巨大ファイルの問題解決**
   - 元ファイル: 128KB、2,700行 → AI読み込み時にトークン制限を超過
   - 分割後: コアは~15KB → 1回の読み込みで完結

2. **開発時に必要な情報に素早くアクセス**
   - `FDC-CORE.md`: 開発開始時に必要な情報のみ
   - 詳細は必要に応じて個別ファイルを参照

3. **履歴情報の分離**
   - Phase履歴は `legacy/PHASE-HISTORY.md` に移動
   - 新規開発者は最新状態のみ把握すればOK

---

## ドキュメント構造（可視化）

```
docs/
├── FDC-GRAND-GUIDE.md ......... 本ファイル（インデックス）
├── FDC-CORE.md ................ 開発コアガイド ⭐ 開発時はこちら
├── CHANGELOG.md ............... 変更履歴
│
├── guides/ .................... ガイドドキュメント
│   ├── DEVELOPMENT.md ......... 開発者・AI向け技術ガイド
│   ├── FDC-ARCHITECTURE-OVERVIEW.md .. アーキテクチャ概要
│   ├── HOW-TO-USE.md .......... ユーザー向け利用マニュアル
│   ├── Performance-Specification-v1.0.md .. パフォーマンス仕様（負荷テスト・データ増加計画含む）
│   ├── SECURITY.md ............ セキュリティガイド（脆弱性管理・開発者ガイドライン含む）
│   ├── TESTING.md ............. テストマニュアル
│   ├── CSV-USER-GUIDE.md ...... CSV機能ユーザーガイド
│   ├── OFFLINE-SYNC.md ........ オフライン同期設計
│   │
│   │   # 非機能要求グレード対応（IPA 2018準拠）⭐ NEW
│   ├── NFR-COMPLIANCE.md ...... IPA非機能要求グレード対応表（6大項目対応状況）
│   ├── SLA-AVAILABILITY.md .... SLA・可用性定義書（稼働率99.5%、RTO/RPO）
│   ├── INCIDENT-RESPONSE.md ... 障害対応・インシデント対応手順書
│   ├── BACKUP-DR.md ........... バックアップ・災害対策方針書
│   └── OPERATIONS-MAINTENANCE.md . 運用・保守手順書（日次/週次/月次タスク）
│
├── FDC-GAP-ANALYSIS-2025-12.md .. 業界トップランナー級ギャップ分析・ロードマップ ⭐ NEW
│
├── specs/ ..................... 技術仕様
│   ├── API-SPEC.md ............ API仕様書
│   ├── DB-SECURITY.md ......... DBセキュリティ
│   ├── ENCRYPTION-TABLE.md .... 暗号化割当表
│   ├── AI-FEATURE-DESIGN.md ... AI機能設計
│   └── PERMISSION-SYSTEM.md ... 権限システム設計
│
├── runbooks/ .................. Phase別ランブック
│   ├── PHASE14-1-CSV-RUNBOOK.md
│   ├── PHASE14-AI-RUNBOOK.md ........ AI統合全体設計
│   ├── PHASE14.2-SCALABILITY-RUNBOOK.md
│   ├── PHASE14.4-OPS-MONITORING-RUNBOOK.md
│   ├── PHASE14.4-FDC-MULTITENANT-WORKSPACE-RUNBOOK.md .. マルチテナント対応
│   ├── PHASE14.5-PERFORMANCE-RUNBOOK.md .. パフォーマンス最適化
│   ├── PHASE14.6-AI-READINESS-RUNBOOK.md .. AI導入準備
│   ├── PHASE14.6-I-SECURITY-HARDENING-RUNBOOK.md .. セキュリティ強化
│   ├── PHASE14.6.5-AI-USAGE-DESIGN-RUNBOOK.md .. AI利用設計
│   ├── PHASE14.7-TENANT-AI-RUNBOOK.md .. テナント別AI基盤
│   ├── PHASE15/ ................. **Phase 15 完了** ⭐
│   │   ├── PHASE15-RUNBOOK.md ........... メインランブック
│   │   ├── PHASE15-A-GOOGLE-TOKEN-ENCRYPTION-RUNBOOK.md
│   │   ├── PHASE15-B-AUDIT-LOG-RUNBOOK.md
│   │   ├── PHASE15.1-MULTI-TENANT-DEV-RUNBOOK.md
│   │   ├── PHASE15.2-TENANT-CUSTOMIZATION-RUNBOOK.md
│   │   ├── RUNBOOK-15.3-SECURITY-MONITORING.md
│   │   └── RUNBOOK-15.4-dashboard-performance.md
│   ├── PHASE16-TASK-SYSTEM-V4-RUNBOOK.md .. タスク＆習慣システムv4 ⭐ NEW
│   ├── PHASE19-AI-IMPLEMENTATION-RUNBOOK.md .. AI機能実装 ⭐ NEW
│   ├── PHASE1？-FUTURE-DESIGN.md ...... 将来設計（15-C移管含む）
│   └── ...
│
├── 規約/ ...................... 法務ドキュメント
│   ├── 利用規約.md ............ サービス利用規約
│   ├── プライバシーポリシー.md .. 個人情報保護方針
│   ├── 特定商取引法.md ......... 特商法に基づく表記
│   ├── AI利用規約.md .......... AI機能利用規約 ⭐ NEW
│   └── TERMS_OF_SERVICE.md .... 英語版利用規約
│
└── legacy/ .................... レガシードキュメント
    ├── PHASE-HISTORY.md ....... 全Phaseの詳細履歴（v7.0分割）
    ├── ARCHITECTURE-DETAIL.md . ディレクトリ構造・データフロー詳細（v7.0分割）
    ├── SECURITY-DB-DETAIL.md .. DB設計・認可・暗号化詳細（v7.0分割）
    ├── OPS-LESSONS.md ......... 運用教訓・Lessons Learned（v7.0分割）
    ├── phase9/ ................ Phase 9.x サブフェーズ詳細（45+ファイル）
    ├── phase10-13/ ............ Phase 10-13 ランブック・設計書
    ├── phase8/ ................ Phase 8 詳細
    ├── other/ ................. その他レガシー（技術負債・デプロイ等）
    └── articles/, scripts/, runbooks/ ... その他参照資料
```

---

## クイックスタート（開発者向け）

### 1. 開発を始める前に

```bash
# FDC-CORE.md を読む
cat docs/FDC-CORE.md
```

### 2. 技術詳細が必要な場合

```bash
# 技術詳細ガイド
cat docs/guides/DEVELOPMENT.md

# アーキテクチャ概要
cat docs/guides/FDC-ARCHITECTURE-OVERVIEW.md
```

### 3. Phase履歴を確認したい場合

```bash
# 全Phaseの詳細履歴
cat docs/legacy/PHASE-HISTORY.md
```

### 4. DB・セキュリティ詳細が必要な場合

```bash
# セキュリティ・DB設計詳細
cat docs/legacy/SECURITY-DB-DETAIL.md
```

---

## 現在の開発状況（2025-12-05）

- **バージョン**: v2.9.0
- **本番URL**: https://app.foundersdirect.jp/
- **Phase 14完了**: ✅ AI基盤整備完了、pg_cron設定済み（2025-12-05）
- **Phase 15完了**: ✅ セキュリティ・監査強化完了（2025-12-05）
- **現在のPhase**: Phase 16 設計中（タスク＆習慣システム v4）
- **技術負債**: 0件（Lint/ビルド警告・`as any` ゼロ達成）
- **500行以上ファイル**: 2件（ViewModel Hook - 分割不要と判断）
- **分割完了ファイル**: 30件（Phase 14.35-B で +2件）
- **E2Eテスト**: 94テスト全パス
- **ユニットテスト**: 129テスト全パス
- **次Phase**: Phase 16 実装 または Phase 19（AI機能実装）

### Phase 14.9 UI/UX改善・マルチテナントLP対応（進行中）⭐ NEW

UI/UXの改善とマルチテナント向けランディングページ構造の整備を実施中：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| LPコンポーネント再構成 | `components/landing/` を default/shared/{tenant}/ に分割 | ✅ 完了 |
| ステータスアイコンサイズ | 未接触・反応ありなど全ステータスアイコンを20%拡大 | ✅ 完了 |
| 4象限タスク絵文字表示 | スートマーク(♠♥♦♣)を絵文字(⬛🟥🟨🟦🃏)に変更 | ✅ 完了 |
| データ競合自動リトライ | 3回自動リトライで競合モーダル表示を最小化 | ✅ 完了 |
| ランブック統合 | Phase 14.6〜14.9 を統合ランブックに整理 | ✅ 完了 |

**LPコンポーネント構造:**
```
components/landing/
├── default/           # デフォルトLP（app テナント用）
│   ├── LandingPage.tsx
│   └── LandingPage.module.css
├── shared/            # 全テナント共通コンポーネント
│   ├── LandingHeader.tsx
│   ├── LandingFooter.tsx
│   └── ContactForm.tsx
└── {tenant}/          # テナント別LP（将来）
```

- 詳細は `docs/runbooks/PHASE14.6.6-THEME_COLOR_RUNBOOK.md` を参照
- テナント別LP作成は `docs/guides/TENANT-MANAGEMENT-GUIDE.md` を参照

### Phase 14.6.7 セキュリティホットフィックス（完了） ⭐ CRITICAL

**実施日**: 2025-12-04

コードレビューで発見されたセキュリティ脆弱性を緊急修正：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| P0-A | E2Eテストモード Cookie バイパス修正 | ✅ 完了 |
| P0-B | エラーレスポンスマスキング | ✅ 完了 |
| P1-B | ログ PII マスキング強化 | ✅ 完了 |

**新規作成ファイル:**
- `lib/server/test-mode.ts` - E2Eテストモード一元管理
- `lib/server/api-errors.ts` - APIエラーレスポンス安全生成

**修正内容:**
- E2Eテストモードは `NODE_ENV !== 'production'` AND `VERCEL_ENV !== 'production|preview'` AND `FDC_E2E_TEST_MODE_ENABLED === 'true'` の3条件すべて満たす場合のみ有効
- 本番環境ではエラー詳細をマスク（開発環境では表示）
- PII（email, name, phone等）をログから除外

- 詳細は `docs/runbooks/PHASE14.6.7-SECURITY-HOTFIX-RUNBOOK.md` を参照

### Phase 14.9-B レート制限・スケーラビリティ強化（完了） ⭐ NEW

**実施日**: 2025-12-04

監査レポートで指摘されたレート制限・スケーラビリティ課題に対応：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| T1 | Google Sync API レート制限（10 req/min） | ✅ 完了 |
| T2 | Google Tasks API レート制限（20 req/min） | ✅ 完了 |
| T3 | Google Calendars API レート制限（10 req/min） | ✅ 完了 |
| T4 | Cron Worker maxDuration 延長（60s→300s） | ✅ 完了 |
| T5 | AI Chat コンテキストサイズ制限（5000文字） | ✅ 完了 |

**実装詳細:**
- レート制限: ユーザーID単位でカウント、`checkRateLimit()` 関数使用
- maxDuration: `vercel.json` で `/api/cron/*` に `maxDuration: 300` を設定
- コンテキスト制限: `MAX_CONTEXT_SIZE = 5000`, `MAX_MESSAGE_SIZE = 2000`

- 詳細は `docs/PHASE14.9-B-RATE-LIMIT-RUNBOOK.md` を参照

### Phase 14.9-C テナント境界ハードニング（完了） ⭐ NEW

**実施日**: 2025-12-04

全APIに対してテナント境界チェックを適用し、マルチテナント環境のデータ分離を強化：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| 新規関数 | `checkUserTenantBoundary()` 追加 | ✅ 完了 |
| カテゴリA | ワークスペースベースAPI（6エンドポイント） | ✅ 適用完了 |
| カテゴリB | ユーザーベースAPI（8エンドポイント、14ハンドラ） | ✅ 適用完了 |

**API分類と適用関数:**
- **カテゴリA（ワークスペースデータ）**: `checkTenantBoundary(request, workspaceId)`
  - `/api/org-chart/*`, `/api/invitations`, `/api/ai/chat`, `/api/ai/usage`
- **カテゴリB（ユーザーデータ）**: `checkUserTenantBoundary(request, userId)`
  - `/api/google/sync`, `/api/google/tasks/*`, `/api/google/calendars/*`, `/api/google/auth`, `/api/google/disconnect`

**標準パターン:**
```typescript
// 認証チェック後、ビジネスロジック前に実行
const tenantCheck = await checkTenantBoundary(request, workspaceId);
if (!tenantCheck.success) {
  return tenantCheck.response;
}
```

- 詳細は `docs/runbooks/PHASE14.9-C-TENANT-BOUNDARY-RUNBOOK.md` を参照

### Phase 14.9-D セキュリティ監視・CSRF・セッション乗っ取り検知（完了） ⭐ NEW

**実施日**: 2025-12-04

包括的なセキュリティ監視機能を実装し、リアルタイム脅威検知とセキュリティイベント管理を実現：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| セキュリティ監視DB | `security_events`, `rate_limit_tracking`, `ip_blocklist` テーブル | ✅ 完了 |
| 検知ロジック | ブルートフォース、SQLi、パストラバーサル、レート制限超過 | ✅ 完了 |
| セキュリティミドルウェア | 全APIに `withSecurityMonitor()` 適用（15+エンドポイント） | ✅ 完了 |
| CSRF保護 | Double Submit Cookie 方式（`lib/server/csrf.ts`） | ✅ 完了 |
| セッション乗っ取り検知 | IP/UserAgent フィンガープリント検知 | ✅ 完了 |
| 通知機能 | Critical即時通知、日次ダイジェスト（Resend） | ✅ 完了 |
| SAダッシュボードUI | `SecurityMonitor.tsx`（統計カード、イベント一覧） | ✅ 完了 |

**セキュリティミドルウェア適用済みAPI:**
- `/api/auth/session`, `/api/auth/callback`, `/api/auth/logout`
- `/api/contact`, `/api/google/auth`, `/api/google/sync`
- `/api/ai/chat`, `/api/invitations`
- `/api/admin/users`, `/api/admin/tenants`, `/api/admin/security-events`

**新規ファイル:**
- `lib/server/security-monitor.ts` - 検知ロジック
- `lib/server/security-middleware.ts` - APIラッパー
- `lib/server/security-notifier.ts` - メール通知
- `lib/server/csrf.ts` - CSRF保護
- `migrations/026-security-events.sql` - セキュリティイベントテーブル
- `supabase/migrations/20251204123841_session_fingerprint.sql` - セッションフィンガープリント

- 詳細は `docs/runbooks/SECURITY-MONITORING.md` を参照
- セキュリティガイドは `docs/guides/SECURITY.md` v2.0 を参照

---

### Phase 14.6 AI導入準備（完了） ⭐ セキュリティ強化済み

AI機能導入に向けた基盤整備を完了。技術負債もすべて解消：

| Sub-Phase | 内容 | ステータス |
|-----------|------|-----------|
| 14.6-A | 監査ログ・ガバナンス | ✅ 完了 |
| 14.6-B | データ整備・正規化 | ✅ 完了 |
| 14.6-C | AIコンテキスト基盤 | ✅ 完了 |
| 14.6-D | テンプレート・変数システム | ✅ 完了 |
| 14.6-E | 営業プロセス可視化（UIコンポーネント） | ✅ 完了 |
| 14.6-F | テスト・品質強化 | ✅ 完了 |
| 14.6-G | ドキュメント・法務整備 | ✅ 完了 |
| 14.6-H | 技術負債解消 | ✅ 完了 |
| 14.6-I | セキュリティ・スケーラビリティ強化 | ✅ 完了 |

**14.6-I セキュリティ強化の詳細:**
- CSP Nonce ベース実装（`'unsafe-inline'` / `'unsafe-eval'` 削除）
- セッション JOIN 最適化（3クエリ → 1クエリ、DB負荷66%削減）
- エラーメッセージの本番環境マスク（情報漏洩防止）
- テナント境界チェック強化（サブドメインなしアクセス拒否）
- Google トークン更新の分散ロック（競合防止）
- 型バイパス `as any` 完全解消（0件）

**技術負債解消の詳細:**
- 型チェック: エラー 0
- ESLint: 警告 0
- ビルド: 警告 0、エラー 0
- TODO コメント: 0件（NOTE に変換）
- `as any`: 0件

**追加実装したUIコンポーネント:**
- `DataQualityPanel.tsx` - データ品質ダッシュボード
- `TemplateManager.tsx` - テンプレート管理UI
- `JourneyFunnel.tsx` - ジャーニーファネル可視化
- `NextActionSuggestion.tsx` - 次アクション提案UI

- 詳細は `docs/runbooks/PHASE14.6-AI-READINESS-RUNBOOK.md` を参照

### Phase 14.6.3〜14.6.5 大規模ファイル分割（完了）

**目的**: 500行以上の大規模ファイルを分割し、保守性・可読性を向上

| ディレクトリ | ファイル数 | 最大行数 | 合計行数 |
|-------------|-----------|---------|---------|
| lib/hooks/task/ | 9ファイル | 456行 | 1,798行 |
| lib/hooks/okr/ | 7ファイル | 444行 | 1,463行 |
| lib/hooks/leads/ | 8ファイル | 316行 | 1,329行 |
| lib/hooks/templates/ | 7ファイル | 324行 | 1,269行 |
| lib/hooks/settings/ | 7ファイル | 229行 | 1,091行 |
| lib/hooks/action-map/ | 7ファイル | 560行 | 1,388行 |
| lib/csv/ | 8ファイル | 338行 | 1,322行 |
| components/landing/ | 8ファイル | 203行 | 961行 |
| **合計** | **61ファイル** | - | **10,621行** |

**実装方針**:
- 機能別フック（CRUD/Filters/Form/CSV/Progress等）に分割
- 統合レイヤーで公開API維持
- re-exportパターンで後方互換性確保
- types.tsで型定義を各ディレクトリに分離

- 詳細は `docs/runbooks/PHASE14/PHASE14.6.3-FILE-SPLIT-RUNBOOK.md` を参照

### Phase 14.6.5 AI利用設計（完了）

**役割**: AI機能の「思想と構造」を定義する設計ドキュメント（UC/プロンプト/コンテキスト/UXの論理構造）

Phase 14.7 実装前に必要な、AI機能の具体的な利用設計：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| ユースケース定義 | 10のUC（初回コンタクト、フォローアップ等） | ✅ 完了 |
| プロンプト詳細設計 | ベース・カテゴリ別・UC別プロンプト | ✅ 完了 |
| 会話フロー設計 | ワンショット / マルチターン | ✅ 完了 |
| UI/UX設計 | AIチャットパネル、インラインAI | ✅ 完了 |
| コンテキスト注入設計 | レベル別、エンティティコンテキスト | ✅ 完了 |
| エラー・フォールバック | エラー種別、フォールバック戦略 | ✅ 完了 |

- 詳細は `docs/runbooks/PHASE14.6.5-AI-USAGE-DESIGN-RUNBOOK.md` を参照

### Phase 14.7 テナント別AI設定（完了 → Phase 19 へ移行） ✅

**役割**: AI機能の「基盤設計」（DB/型定義/サーバーサービス）

各テナントが独自のOpenAI APIキーを設定でき、AI機能のオン/オフをテナント単位で制御する基盤を構築：

| Sub-Phase | 内容 | ステータス |
|-----------|------|-----------|
| 14.7-A | DBマイグレーション・型定義・サーバーサービス | ✅ 完了 |
| 14.7-B | APIエンドポイント基盤 | ✅ 完了 |
| 14.7-C | テナントAI設定UI基盤 | ✅ 完了 |
| 14.7-D~H | AI実装（チャット、UC、E2E） | 📦 Phase 19 へ移行 |

**Phase 14 で完了した基盤:**
- テナント別OpenAI APIキー（暗号化保存: AES-256-GCM）
- AI機能オン/オフ切替（テナント単位）
- モデル選択（gpt-4o-mini / gpt-4o 等）
- 使用量クォータ設定
- pg_cron による監査ログ自動アーカイブ

**AI実装はPhase 19へ**: AI機能の本実装（チャットパネル、UC実装、E2E）はPhase 19で実施

- 詳細は `docs/runbooks/PHASE14/PHASE14.7-TENANT-AI-RUNBOOK.md` を参照
- AI実装は `docs/runbooks/PHASE19-AI-IMPLEMENTATION-RUNBOOK.md` を参照

### Phase 14.62 命名・概念一貫性の統一（完了）

AIがコンテキストを正確に解釈できるよう、型定義・マスタデータの命名・概念を統一：

| 項目 | 内容 | ステータス |
|------|------|-----------|
| 欠損値ポリシー | `lib/types/common.ts` に統一定義 | ✅ 完了 |
| ステータスマスタ | JOURNEY_STAGE_APPLICABILITY 追加 | ✅ 完了 |
| タグマスタ | CLIENT_ATTRIBUTE_TAGS に変更 | ✅ 完了 |
| スキップテスト監査 | 125件 → 整理後約100件 | ✅ 完了 |

- 詳細は `docs/runbooks/phase-14.62-naming-consistency.md` を参照

### Phase 14.5 パフォーマンス最適化（完了）

反応時間・表示時間を改善するための5段階計画を策定し、すべて完了：

| Phase | 内容 | 期待効果 | ステータス |
|-------|------|----------|-----------|
| 14.5-1 | next/Image 導入 | LCP 15-25%改善 | ✅ 完了 |
| 14.5-2 | リスト仮想化（react-window） | TTI 20-30%改善 | ✅ 完了 |
| 14.5-3 | コンポーネント分割 | 初期ロード10%改善 | ✅ 完了（Phase 14.35で対応済み） |
| 14.5-4 | キャッシュ戦略最適化（SWR） | API応答30-50%改善 | ✅ 完了 |
| 14.5-5 | Service Worker/PWA | オフライン対応・再訪問高速化 | ✅ 完了 |

- 詳細は `docs/runbooks/PHASE14.5-PERFORMANCE-RUNBOOK.md` を参照

### Phase 14.4 マルチテナント対応

- `tenants` テーブル追加（サブドメイン単位でテナント管理）
- `TenantProvider` / `useTenant()` によるクライアント側テナント解決
- `lib/server/tenants.ts` / `lib/server/tenant-workspaces.ts` によるサーバー側解決
- 詳細は `docs/runbooks/PHASE14.4-FDC-MULTITENANT-WORKSPACE-RUNBOOK.md` を参照

### Phase 15: セキュリティ・監査強化 ✅ 完了（2025-12-05）

Phase 15 でエンタープライズ水準のセキュリティ・監査機能を実装:

| サブフェーズ | 内容 | 状況 |
|-------------|------|------|
| Phase 15-A | Google リフレッシュトークン AES-256-GCM 暗号化 | ✅ 完了 |
| Phase 15-B | 最低限監査ログ（クリティカル操作6種） | ✅ 完了 |
| Phase 15.1 | マルチテナント開発環境（Supabase/Vercel dev） | ✅ 完了 |
| Phase 15.2 | テナントカスタマイズ機能 | ✅ 完了 |
| Phase 15.3 | セキュリティ監視機能 | ✅ 完了 |
| Phase 15.4 | ダッシュボードパフォーマンス最適化 | ✅ 完了 |
| Phase 15-C | 同期並列化 | → Future Design へ移管 |

**Phase 15-A 詳細（トークン暗号化）:**
- AES-256-GCM 暗号化（128bit IV + 128bit Auth Tag）
- バージョン付き鍵管理（将来のキーローテーション対応）
- 暗号化ユーティリティ: `lib/server/encryption/google-tokens.ts`
- Runbook: `docs/runbooks/PHASE15/PHASE15-A-GOOGLE-TOKEN-ENCRYPTION-RUNBOOK.md`

**Phase 15-B 詳細（監査ログ）:**
- 対象イベント: Google連携開始/解除、メンバー追加/変更/削除、テナント設定変更
- IP アドレス・User-Agent 記録
- AI 使用量ログとの統合（後方拡張性確保）
- Runbook: `docs/runbooks/PHASE15/PHASE15-B-AUDIT-LOG-RUNBOOK.md`

**Phase 15.3 詳細（セキュリティ監視）:**
- 検知機能: ブルートフォース・レート制限・SQLi・パストラバーサル・権限昇格
- DBスキーマ: `security_events`, `rate_limit_tracking`, `ip_blocklist`
- 実装: `lib/server/security-monitor.ts`, `lib/server/security-middleware.ts`

**Phase 15.4 詳細（パフォーマンス最適化）:**
- `useDerivedWorkspaceData.ts` による派生データ統合フック
- React.memo適用（5コンポーネント）
- 再計算コスト50%削減

**Phase 15-C（同期並列化）は `docs/runbooks/PHASE1？-FUTURE-DESIGN.md` Section 7 へ移管**（トリガー条件待ち: テナント数30+ など）

### Phase 14.9: セキュリティ監視機能（2025-12-04）⭐ NEW

SAダッシュボードにリアルタイムセキュリティ監視機能を追加:

| 項目 | 内容 | 状況 |
|------|------|------|
| 検知機能 | ブルートフォース・レート制限・SQLi・パストラバーサル | ✅ 完了 |
| API統合 | 認証系API・管理者API自動監視 | ✅ 完了 |
| UI | SAダッシュボードにセキュリティ監視タブ | ✅ 完了 |
| 通知 | Critical時メール即時通知（Resend） | ✅ 完了 |

**検知対象:**
- ブルートフォース攻撃（5回失敗でブロック）
- レート制限超過（60 req/min）
- SQLインジェクション試行
- パストラバーサル試行
- 権限昇格試行（SA専用APIへの不正アクセス）
- クロステナントアクセス試行

**実装ファイル:**
- `lib/server/security-monitor.ts` - 検知ロジック
- `lib/server/security-middleware.ts` - APIラッパー
- `lib/server/security-notifier.ts` - メール通知
- `app/_components/admin/sa-dashboard/SecurityMonitor.tsx` - UI

- Runbook: `docs/runbooks/SECURITY-MONITORING.md`

### Phase 19: AI機能実装（次期開発） ⭐ NEW

**目的**: Phase 14 で整備したAI基盤を活用し、AIチャット機能とユースケースを実装

| サブフェーズ | 内容 | 状況 |
|-------------|------|------|
| Phase 19.1 | AIチャットパネル実装（共通コンポーネント） | 🔜 予定 |
| Phase 19.2 | UC-01〜04 MVP実装（4UC） | 🔜 予定 |
| Phase 19.3 | AI無効時のUI制御・フォールバック | 🔜 予定 |
| Phase 19.4 | E2Eテスト・品質保証 | 🔜 予定 |
| Phase 19.5 | 本番デプロイ・監視設定 | 🔜 予定 |

**MVP対象ユースケース（4UC）:**
- UC-01: 初回コンタクトメール生成
- UC-02: フォローアップ提案
- UC-03: ステージ別ネクストアクション
- UC-04: ミーティング準備

**Phase 20以降のロードマップ:**
- Phase 20: OKR AI統合（目標設定支援、進捗分析）
- Phase 21: Action Map AI統合（戦略・戦術層AI）
- Phase 22: TODO AI統合（日次タスク最適化）
- Phase 23: AI高度化（マルチモーダル、エージェント）

- 詳細は `docs/runbooks/PHASE19-AI-IMPLEMENTATION-RUNBOOK.md` を参照

### Phase 16: タスク＆習慣システム v4（設計中） ⭐ NEW

**目的**: UI維持、ロジックゼロベース再構築、DB正規化。10万ワークスペース規模にスケールする堅牢なタスク管理システムを構築。

| サブフェーズ | 内容 | 状況 |
|-------------|------|------|
| Phase 16.1 | DBスキーマ設計（tasks, habit_masters, archived_tasks, task_links） | ✅ 設計完了 |
| Phase 16.2 | D&D + ゴミ箱（Fractional Indexing, 楽観ロック, 3層削除） | ✅ 設計完了 |
| Phase 16.3 | Googleカレンダー連携（フォールバック付き） | ✅ 設計完了 |
| Phase 16.4 | 習慣ゾーン（梅セット、ストリーク、15分最小単位） | ✅ 設計完了 |
| Phase 16.5 | OKR/ActionMap連携（進捗ロールアップ、task_links） | ✅ 設計完了 |
| Phase 16.6 | マイグレーション実行 | 🔜 予定 |

**設計上の主要決定:**
- **DB正規化**: `workspace_data.tasks` JSON → `tasks` テーブルへ完全移行
- **位置ベース**: `position` + `sort_order`（TEXT, Fractional Indexing）でD&D対応
- **楽観ロック**: `version` カラムでタスク単位の競合検出（409 Conflict時にトースト通知）
- **3層削除**: 論理削除(trash) → アーカイブ(30日後) → 物理削除(運用)
- **習慣システム**: 15分最小登録単位、梅セット（3習慣×5分）、竹/松（単独15/30分）
- **OKR連携**: `task_links` でタスク→KR/ActionItem紐付け、完了時に自動進捗ロールアップ
- **スケーラビリティ**: 仮想スクロール、Realtimeスロットリング、GINインデックス

**新規テーブル:**
- `tasks` - タスク・習慣統合（position, task_type, version, sort_order）
- `habit_masters` - 習慣マスタ（梅竹松レベル定義、ストリーク管理）
- `archived_tasks` - アーカイブ（30日経過後のゴミ箱タスク）
- `task_logs` - 完了ログ（履歴タブ用）
- `task_links` - OKR/ActionMap連携（ポリモーフィック）

**新規ファイル（予定）:**
```
lib/hooks/task/
├── useTaskStore.ts           # Supabase Realtime + ローカルステート
├── useTaskMutations.ts       # CRUD（楽観ロック付き）
├── useTaskDragDrop.ts        # D&D（Fractional Indexing）
├── useHabitExecution.ts      # planHabit/executeHabit
└── useTaskLinks.ts           # OKR/ActionMap連携

lib/api/okr/
├── calculateProgress.ts      # 進捗計算（calc_method対応）
└── propagateUpdate.ts        # 更新伝播（再帰的ロールアップ）
```

- Runbook: `docs/runbooks/PHASE16-TASK-SYSTEM-V4-RUNBOOK.md`

### IPA非機能要求グレード対応（2025-12-02）

IPA（情報処理推進機構）の「非機能要求グレード2018」6大項目すべてに対応完了:

| カテゴリ | 対応状況 | ドキュメント |
|---------|---------|-------------|
| 1. 可用性 | ✅ 100% | `SLA-AVAILABILITY.md`, `BACKUP-DR.md` |
| 2. 性能・拡張性 | ✅ 100% | `Performance-Specification-v1.0.md` |
| 3. 運用・保守性 | ✅ 100% | `OPERATIONS-MAINTENANCE.md`, `INCIDENT-RESPONSE.md` |
| 4. 移行性 | ✅ 100% | `BACKUP-DR.md` |
| 5. セキュリティ | ✅ 100% | `SECURITY.md`, `PHASE15-A-*-RUNBOOK.md` |
| 6. システム環境 | ✅ 100% | `NFR-COMPLIANCE.md` |

- 詳細は `docs/guides/NFR-COMPLIANCE.md` を参照

詳細は `docs/FDC-CORE.md` を参照してください。

---

## 分割履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-12-05 | v7.17 | **Phase 15 完了**（15-A/B/15.1-15.4全完了、15-C→Future Design移管） |
| 2025-12-05 | v7.16 | Phase 14 完了（pg_cron設定）、Phase 19 AI実装ランブック作成、AI未実装部分をPhase 19へ移行 |
| 2025-12-05 | v7.15 | Phase 16 タスク＆習慣システムv4 設計完了（DB正規化、習慣ゾーン、OKR連携） |
| 2025-12-04 | v7.14 | Phase 14.9 セキュリティ監視機能（検知・API統合・UI・通知） |
| 2025-12-04 | v7.13 | Phase 15-A/B セキュリティ・監査強化（トークン暗号化、監査ログ） |
| 2025-12-03 | v7.11 | Phase 14.9 UI/UX改善（LP構造再編、4象限絵文字、データ競合自動リトライ、ランブック統合） |
| 2025-12-03 | v7.10 | Phase 14.35-B 追加分割（EditTenantModal, SADashboard → 30ファイル分割達成） |
| 2025-12-02 | v7.9 | Phase 14.62 命名・概念統一、Phase 14.6-I CSP Nonce・JOIN最適化完了 |
| 2025-12-02 | v7.8 | Phase 14.5 パフォーマンス最適化完了（5段階すべて完了） |
| 2025-12-02 | v7.7 | Phase 14.6 技術負債ゼロ達成（Lint/ビルド警告0、UIコンポーネント実装完了） |
| 2025-12-02 | v7.6 | Phase 14.7 テナント別AI設定（基盤実装完了、API/UI待ち） |
| 2025-12-02 | v7.5 | Phase 14.6 AI導入準備完了、AI利用規約追加 |
| 2025-12-02 | v7.4 | パフォーマンス最適化ランブック追加（5 Phase計画） |
| 2025-12-02 | v7.3 | IPA非機能要求グレード対応（6大項目100%対応、5ドキュメント新規作成） |
| 2025-12-02 | v7.2 | Phase 14.4 マルチテナント対応完了（tenants, TenantProvider 追加） |
| 2025-12-02 | v7.1 | Phase 14.35 コンポーネント分割完了（28ファイル、500行以上0件） |
| 2025-12-02 | v7.0 | FDC-GRAND-GUIDE.md を5ファイルに分割 |
| 2025-11-30 | v6.1 | Phase 14.4 完了、運用監視強化 |
| 2025-11-29 | v6.0 | Phase 10-13.5 完了、3層アーキテクチャ完成 |

---

**Last Updated**: 2025-12-05
**Version**: v7.17（Phase 15 完了、Phase 16 設計完了、Phase 19 AI実装予定）
**Maintained by**: FDC Development Team (Human + AI Agents)
