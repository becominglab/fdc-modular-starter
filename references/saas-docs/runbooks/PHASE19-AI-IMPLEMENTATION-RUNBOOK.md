# Phase 19 ランブック：AI機能本格実装

**Version:** 19.1
**Status:** 🔜 未着手
**Phase 14からの継続**
**Claude Code 用ランブック**
**最終更新:** 2025-12-05

---

## Phase 19 概要

Phase 14で準備完了したAI基盤を本格実装するフェーズです。
Phase 14.6（AI導入準備）とPhase 14.6.5（AI利用設計）で設計・準備した内容を実装に移します。

### Phase 14からの引き継ぎ状況

| Phase | 内容 | 状態 |
|-------|------|------|
| **14.1〜14.6** | AI基盤準備 | ✅ 完了 |
| **14.6.5** | AI利用設計 | ✅ 完了 |
| **14.7-A〜C** | テナントAI設定（基盤） | ✅ 完了 |
| **14.7-D〜H** | テナントAI設定（実装） | → **Phase 19へ移行** |
| **14.8〜14.10** | 各機能AI統合 | → **Phase 19へ移行** |

---

## DOD（完了定義）

- [ ] テナント別AIチャット機能が完全動作
- [ ] 4つのMVPユースケース（UC-01/02/03/08）が実行可能
- [ ] AI無効時のグレースフルデグレードが動作
- [ ] E2Eテストが全パス
- [ ] 本番環境で1テナント以上がAI機能を使用

---

## 1. 必読ドキュメント

| ドキュメント | パス | 目的 |
|------------|------|------|
| AI利用設計 | `docs/runbooks/PHASE14/PHASE14.6.5-AI-USAGE-DESIGN-RUNBOOK.md` | UC定義・プロンプト設計 |
| AI導入準備 | `docs/runbooks/PHASE14/PHASE14.6-AI-READINESS-RUNBOOK.md` | 完了済み準備作業 |
| テナントAI設定 | `docs/runbooks/PHASE14/PHASE14.7-TENANT-AI-RUNBOOK.md` | 14.7-A〜C詳細 |
| AI全体設計 | `docs/runbooks/PHASE14/PHASE14-AI-RUNBOOK.md` | Phase14全体像 |

---

## 2. サブフェーズ一覧

### Phase 19.1: APIエンドポイント（旧14.7-B）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| GET エンドポイント | `/api/admin/tenants/[id]/ai` | 🔴 必須 |
| PUT エンドポイント | AI設定更新 | 🔴 必須 |
| POST /validate | APIキー検証 | 🔴 必須 |
| 認証・認可チェック | SA管理者権限確認 | 🔴 必須 |
| Zodバリデーション | リクエストスキーマ | 🔴 必須 |

**成果物:**
- `app/api/admin/tenants/[id]/ai/route.ts`
- `app/api/admin/tenants/[id]/ai/validate/route.ts`

### Phase 19.2: テナントAI設定UI（旧14.7-C）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| TenantAISettingsPanel | 設定パネルコンポーネント | 🔴 必須 |
| APIキー入力 | マスク表示 + 検証ボタン | 🔴 必須 |
| オン/オフトグル | 有効/無効切り替え | 🔴 必須 |
| モデル選択 | ドロップダウン | 🔴 必須 |
| クォータ設定 | リクエスト/トークン/コスト上限 | 🔴 必須 |

**成果物:**
- `app/_components/admin/sa-dashboard/TenantAISettingsPanel.tsx`
- `app/_components/admin/sa-dashboard/EditTenantModal.tsx`（拡張）

### Phase 19.3: AIチャットパネル（旧14.7-D）★最重要

| タスク | 内容 | 優先度 |
|--------|------|--------|
| AIChatPanel | メインパネルコンポーネント | 🔴 必須 |
| ストリーミング応答 | Vercel AI SDK統合 | 🔴 必須 |
| コンテキスト表示 | 対象エンティティ表示 | 🔴 必須 |
| クイックアクション | UC-01/02/03/08ボタン | 🔴 必須 |
| コピー・再生成 | 出力操作ボタン | 🔴 必須 |

**成果物:**
- `app/_components/ai/AIChatPanel.tsx`
- `app/_components/ai/AIChatMessage.tsx`
- `app/_components/ai/QuickActions.tsx`

**MVPユースケース（14.6.5で設計済み）:**

| UC-ID | ユースケース | UseCaseKey |
|-------|------------|-----------|
| UC-01 | 初回コンタクト文作成 | `initial_contact` |
| UC-02 | フォローアップメール作成 | `follow_up` |
| UC-03 | 反論・断り対応アドバイス | `objection_handling` |
| UC-08 | 次アクション提案 | `next_action` |

### Phase 19.4: AI無効時UI制御（旧14.7-G）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| AIFeatureContext | Context作成 | 🔴 必須 |
| useAIFeature() | カスタムフック | 🔴 必須 |
| 無効時メッセージ | 理由別表示 | 🔴 必須 |
| グレーアウト制御 | ボタン無効化 | 🔴 必須 |

**成果物:**
- `lib/contexts/AIFeatureContext.tsx`
- `lib/hooks/useAIFeature.ts`

**無効理由別メッセージ:**

| 理由 | メッセージ |
|------|-----------|
| `tenant_disabled` | AI機能はこのテナントでは無効です |
| `no_api_key` | APIキーが設定されていません |
| `quota_exceeded` | 月間使用量の上限に達しました |

### Phase 19.5: AI使用量モニタリング（旧14.7-E）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| 使用量API拡張 | テナント別集計 | 🟡 推奨 |
| AIUsagePanel | ダッシュボードUI | 🟡 推奨 |
| グラフ表示 | 使用量推移 | 🟡 推奨 |
| クォータ警告 | 上限接近通知 | 🟡 推奨 |

**成果物:**
- `app/api/ai/usage/route.ts`（拡張）
- `app/_components/admin/AIUsagePanel.tsx`

### Phase 19.6: AIコンテキストUI（旧14.7-F）

| タスク | 内容 | 優先度 |
|--------|------|--------|
| ContextPreview | コンテキスト表示 | 🟡 推奨 |
| AIContextSettings | 設定UI | 🟡 推奨 |
| トークン数表示 | リアルタイムカウント | 🟡 推奨 |
| テンプレート適用 | TemplateApplicator | 🟡 推奨 |

**成果物:**
- `app/_components/ai/ContextPreview.tsx`
- `app/_components/settings/AIContextSettings.tsx`
- `app/_components/ai/TemplateApplicator.tsx`

### Phase 19.7: E2Eテスト・品質保証（旧14.7-H）

| テストシナリオ | 内容 | 優先度 |
|---------------|------|--------|
| #1 | APIキー設定 → validate成功 → enabled=true | 🔴 必須 |
| #2 | APIキー未設定 → AIボタン押下 → エラー表示 | 🔴 必須 |
| #3 | quota超過 → 429エラー + リセット日表示 | 🔴 必須 |
| #4 | AI無効テナント → 全AI要素がdisabled | 🔴 必須 |
| #5 | クイックアクション実行 → UC正常動作 | 🔴 必須 |

**成果物:**
- `tests/e2e/ai-features.spec.ts`

---

## 3. AI機能ロードマップ（Phase 19〜23）

### 3.1 全体像

```
Phase 19 ─────────────────────────────────────────────────────────────┐
│ AIチャット基盤・テナント設定・MVP 4UC                                  │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────┬────────────────┬────────────────┐
│   Phase 20     │   Phase 21     │   Phase 22     │
│   OKR AI統合    │   AM AI統合    │   TODO AI統合   │
│   (戦略層)      │   (戦術層)      │   (実行層)      │
└────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 23: AI高度化（会話履歴・パーソナライズ・マルチモーダル）          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Phase 20: OKR AI統合（旧14.8）

**目的**: 戦略レイヤー（OKR）へのAI統合。目標設定と進捗分析を支援。

| サブフェーズ | 機能 | 詳細 |
|-------------|------|------|
| **20.1** | OKR分析API | `/api/ai/okr/analyze` - 現在のOKR進捗を分析し改善提案 |
| **20.2** | Objective提案API | `/api/ai/okr/suggest-objective` - MVV/LeanCanvasからのO提案 |
| **20.3** | KR提案API | `/api/ai/okr/suggest-kr` - Objectiveに対するKR提案 |
| **20.4** | OKR AIパネル | `OKRAIPanel.tsx` - OKR画面へのAI統合UI |

**ユースケース:**

| UC-ID | ユースケース | UseCaseKey | 説明 |
|-------|------------|-----------|------|
| UC-07 | OKR設定支援 | `okr_setting` | MVVから目標を提案 |
| UC-11 | OKR進捗分析 | `okr_analysis` | 達成率分析と改善提案 |
| UC-12 | KR数値提案 | `kr_suggestion` | SMART原則に基づくKR提案 |

**成果物:**
- `app/api/ai/okr/analyze/route.ts`
- `app/api/ai/okr/suggest-objective/route.ts`
- `app/api/ai/okr/suggest-kr/route.ts`
- `app/_components/okr/OKRAIPanel.tsx`
- `app/_components/okr/OKRSuggestionCard.tsx`

**前提条件:**
- Phase 19 完了
- OKR機能（Phase 12）が安定稼働

---

### 3.3 Phase 21: Action Map AI統合（旧14.9）

**目的**: 戦術レイヤー（Action Map）へのAI統合。KRからアクション計画を自動生成。

| サブフェーズ | 機能 | 詳細 |
|-------------|------|------|
| **21.1** | AM自動生成API | `/api/ai/action-map/generate` - KRからAM自動生成 |
| **21.2** | タスク分解API | `/api/ai/action-map/breakdown` - 大タスクを小タスクに分解 |
| **21.3** | マイルストーン提案 | `/api/ai/action-map/milestones` - 中間目標の設定支援 |
| **21.4** | AM AIパネル | `ActionMapAIPanel.tsx` - AM画面へのAI統合UI |

**ユースケース:**

| UC-ID | ユースケース | UseCaseKey | 説明 |
|-------|------------|-----------|------|
| UC-13 | AM自動生成 | `am_generate` | KRからAction Map生成 |
| UC-14 | タスク分解 | `task_breakdown` | 大タスクの分解 |
| UC-15 | 工数見積もり | `effort_estimation` | タスクの工数見積もり |

**成果物:**
- `app/api/ai/action-map/generate/route.ts`
- `app/api/ai/action-map/breakdown/route.ts`
- `app/api/ai/action-map/milestones/route.ts`
- `app/_components/action-map/ActionMapAIPanel.tsx`

**前提条件:**
- Phase 20 完了
- Action Map機能（Phase 11）が安定稼働

---

### 3.4 Phase 22: TODO AI統合（旧14.10）

**目的**: 実行レイヤー（TODO/タスク）へのAI統合。日々の優先順位付けと習慣形成を支援。

| サブフェーズ | 機能 | 詳細 |
|-------------|------|------|
| **22.1** | タスク優先順位API | `/api/ai/todo/prioritize` - 4象限への自動分類 |
| **22.2** | 習慣コーチAPI | `/api/ai/todo/habit-coach` - 松竹梅選択アドバイス |
| **22.3** | デイリープランナー | `/api/ai/todo/daily-plan` - 今日のタスク計画提案 |
| **22.4** | TODO AIパネル | `TodoAIPanel.tsx` - TODO画面へのAI統合UI |

**ユースケース:**

| UC-ID | ユースケース | UseCaseKey | 説明 |
|-------|------------|-----------|------|
| UC-09 | タスク優先順位 | `task_prioritization` | 4象限分類の提案 |
| UC-16 | 習慣コーチ | `habit_coach` | 松竹梅レベル選択支援 |
| UC-17 | デイリープラン | `daily_planning` | 今日のタスク順序提案 |

**成果物:**
- `app/api/ai/todo/prioritize/route.ts`
- `app/api/ai/todo/habit-coach/route.ts`
- `app/api/ai/todo/daily-plan/route.ts`
- `app/_components/todo/TodoAIPanel.tsx`
- `app/_components/todo/HabitCoachCard.tsx`

**前提条件:**
- Phase 21 完了
- TODO機能（Phase 10）が安定稼働

---

### 3.5 Phase 23: AI高度化

**目的**: AI機能の高度化。会話履歴、パーソナライズ、マルチモーダル対応。

| サブフェーズ | 機能 | 詳細 |
|-------------|------|------|
| **23.1** | 会話履歴永続化 | 過去の会話を検索・参照可能に |
| **23.2** | パーソナライズ | ユーザーの好みや過去の選択を学習 |
| **23.3** | マルチモーダル | 画像・ファイルの解析対応 |
| **23.4** | カスタムプロンプト | ユーザー定義のプロンプトテンプレート |
| **23.5** | AIレポート自動生成 | 週次/月次レポートの自動生成 |

**成果物:**
- `lib/core/ai-conversation-history.ts`
- `lib/core/ai-personalization.ts`
- `app/_components/ai/ConversationHistory.tsx`
- `app/_components/ai/CustomPromptManager.tsx`

---

### 3.6 Phase ?: CSVインポート（旧14-CSV）

**目的**: API不要でのデータ一括投入。優先度は低いため、必要に応じて実施。

| 機能 | 内容 |
|------|------|
| CSVパーサー | `lib/core/csv-parser.ts` - Papa Parse使用 |
| CSVバリデーター | `lib/core/csv-validator.ts` - 型検証・参照整合性 |
| インポートUI | `CSVImportPanel.tsx` - ドラッグ&ドロップ対応 |

**対象エンティティ:**
- Leads（見込み客）
- Clients（既存客）
- Tasks（タスク）
- OKR（Objectives/KeyResults）

---

### 3.7 依存関係図

```
Phase 19 (AIチャット基盤)
    │
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
Phase 20 (OKR AI)                    Phase 22 (TODO AI)
    │                                      ▲
    ▼                                      │
Phase 21 (AM AI) ──────────────────────────┘
    │
    ▼
Phase 23 (AI高度化)
```

**並列実行可能:**
- Phase 20（OKR）と Phase 22（TODO）は並列で開発可能
- Phase 21（AM）は Phase 20 完了後が望ましい（OKR→AM→TODOの戦略階層）

---

### 3.8 ユースケース全体一覧

| Phase | UC-ID | ユースケース | UseCaseKey | 優先度 |
|-------|-------|------------|-----------|--------|
| **19** | UC-01 | 初回コンタクト文作成 | `initial_contact` | 🔴 MVP |
| **19** | UC-02 | フォローアップメール作成 | `follow_up` | 🔴 MVP |
| **19** | UC-03 | 反論対応アドバイス | `objection_handling` | 🔴 MVP |
| **19** | UC-08 | 次アクション提案 | `next_action` | 🔴 MVP |
| **20** | UC-07 | OKR設定支援 | `okr_setting` | 🟡 |
| **20** | UC-11 | OKR進捗分析 | `okr_analysis` | 🟡 |
| **20** | UC-12 | KR数値提案 | `kr_suggestion` | 🟡 |
| **21** | UC-13 | AM自動生成 | `am_generate` | 🟡 |
| **21** | UC-14 | タスク分解 | `task_breakdown` | 🟡 |
| **21** | UC-15 | 工数見積もり | `effort_estimation` | 🟡 |
| **22** | UC-09 | タスク優先順位 | `task_prioritization` | 🟡 |
| **22** | UC-16 | 習慣コーチ | `habit_coach` | 🟢 |
| **22** | UC-17 | デイリープラン | `daily_planning` | 🟢 |
| **-** | UC-04 | 提案書構成提案 | `proposal_outline` | 🟢 将来 |
| **-** | UC-05 | クロージングアドバイス | `closing_advice` | 🟢 将来 |
| **-** | UC-06 | パイプライン分析 | `pipeline_analysis` | 🟢 将来 |
| **-** | UC-10 | 顧客課題の言語化 | `problem_articulation` | 🟢 将来 |

---

## 4. 実装順序（推奨）

```
Week 1: Phase 19.1（API）+ 19.4（無効時制御の最低限）
        ↓
Week 2: Phase 19.3（AIチャットパネル）← 最重要・最大ボリューム
        ↓
Week 3: Phase 19.2（設定UI）+ 19.3続き
        ↓
Week 4: Phase 19.5〜19.6（モニタリング・コンテキストUI）
        ↓
Week 5: Phase 19.7（E2Eテスト）+ バグ修正
        ↓
Week 6: 本番リリース準備・パイロット検証
```

---

## 5. Phase 14.6 残タスク（運用系）

Phase 14.6の運用系タスク:

| タスク | 状態 | 対応 |
|--------|------|------|
| pg_cron ジョブ設定 | ✅ 完了 | 2025-12-05 CLI設定済み |

**設定済みcronジョブ:**

| ジョブ名 | スケジュール | 実行内容 |
|---------|------------|---------|
| `archive-audit-logs` | 毎日 AM3:00 JST (UTC 18:00) | 2年経過ログをアーカイブ |
| `purge-archived-logs` | 毎月1日 AM4:00 JST (UTC 19:00) | 5年超アーカイブを削除 |

---

## 6. 完了済み基盤（参照用）

### 14.7-A: DBマイグレーション ✅
- `migrations/023-tenant-ai-settings.sql`
- `tenants.ai_settings` カラム追加

### 14.7-B: 型定義 ✅
- `lib/types/ai-settings.ts`
- `TenantAISettings`, `AIFeatureState` 型

### 14.7-C: サーバーサービス ✅
- `lib/server/tenant-ai-settings.ts`
- `getTenantAISettings()`, `updateTenantAISettings()` 等

### 14.6: AI導入準備 ✅
| ファイル | 内容 |
|----------|------|
| `lib/server/ai-cost.ts` | コスト計算 |
| `lib/server/audit.ts` | 監査ログ |
| `lib/types/tag-master.ts` | タグマスタ |
| `lib/types/status-master.ts` | ステータス統一 |
| `lib/types/required-fields.ts` | 必須フィールド |
| `lib/core/data-quality.ts` | データ品質チェッカー |
| `lib/core/business-summary.ts` | ビジネスサマリー |
| `lib/core/ai-prompt-templates.ts` | AIプロンプトテンプレート |
| `lib/types/template-variables.ts` | 変数プレースホルダー |
| `lib/types/template-categories.ts` | テンプレートカテゴリ |
| `lib/core/template-engine.ts` | テンプレートエンジン |
| `lib/types/customer-journey.ts` | カスタマージャーニー |
| `lib/core/action-recommender.ts` | 次アクション推奨 |

### 14.6 UI ✅
| ファイル | 内容 |
|----------|------|
| `app/_components/admin/DataQualityPanel.tsx` | データ品質ダッシュボード |
| `app/_components/settings/TemplateManager.tsx` | テンプレート管理 |
| `app/_components/reports/JourneyFunnel.tsx` | ジャーニーファネル |
| `app/_components/prospects/NextActionSuggestion.tsx` | 次アクション提案 |

---

## 7. セキュリティ要件

### APIキー保護
| 対策 | 実装 |
|------|------|
| 暗号化保存 | AES-256-GCM |
| ログ除外 | APIキーは絶対にログ出力しない |
| レスポンス除外 | hasApiKeyフラグのみ返す |

### アクセス制御
| 操作 | 必要権限 |
|------|---------|
| AI設定閲覧・更新 | SA管理者 |
| AI機能利用 | テナントメンバー（enabled && hasApiKey時） |

---

## 8. 環境変数

```bash
# 必須（既存）
MASTER_ENCRYPTION_KEY=<base64 or hex 32bytes>

# オプション（フォールバック用）
OPENAI_API_KEY=sk-...
AI_ENABLED=true
```

---

## 9. 品質ゲート

| 項目 | 基準 |
|------|------|
| 機能テスト | 全E2Eシナリオパス |
| パフォーマンス | AI応答P95 ≤ 5秒 |
| セキュリティ | APIキー暗号化確認済み |
| UI | 無効時メッセージ表示確認 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v19.0 | 2025-12-05 | Phase 14.7-D〜H、14.8〜14.10をPhase 19として統合 |
| v19.1 | 2025-12-05 | Phase 20〜23ロードマップ追加、UC一覧追加 |

---

**作成日:** 2025-12-05
**ステータス:** 🔜 未着手
