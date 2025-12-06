# Phase 14 ランブック：CSVインポート + AI統合（戦略アシスタント）v14.7

**Version:** 14.7
**Status:** ✅ Phase 14.6 完了・Phase 14.7-A〜C 完了 → **Phase 19へ移行**
**Claude Code 用ランブック**

> **重要**: Phase 14.7-D以降およびPhase 14.8〜14.10は **Phase 19** に移行しました。
> 詳細は `docs/runbooks/PHASE19-AI-IMPLEMENTATION-RUNBOOK.md` を参照してください。

---

## 0. 前提（必ず最初に読むファイル）

作業開始前に、必ず以下を読み込んでから処理を始めること：

**必読ドキュメント:**
- **docs/FDC-GRAND-GUIDE.md**
- **docs/guides/DEVELOPMENT.md**
- **docs/specs/API-SPEC.md**
- **lib/core/ai-context.ts** - 既存AIコンテキスト基盤

---

## 1. Phase 14 概要

### 1.1 目的

1. **CSVインポート機能** - API不要でデータ一括投入
2. **AI設定機能** - ユーザー別APIキー設定・AIオフ機能
3. **AI統合** - 戦略レイヤー（OKR/Action Map/TODO）との統合

### 1.2 Phase位置づけ

| Phase | 内容 | 状態 |
|-------|------|------|
| 10 | TODO機能（4象限 × Elastic Habits） | ✅ 完了 |
| 11 | Action Map（戦術レイヤー） | ✅ 完了 |
| 12 | OKR（戦略レイヤー） | ✅ 完了 |
| 13 | 技術負債解消 + E2E品質保証 | ✅ 完了 |
| **14** | **CSVインポート + AI統合** | ✅ 基盤完了（実装→Phase 19） |

### 1.3 Phase 14 サブフェーズ

| サブフェーズ | 内容 | 状態 |
|-------------|------|--------|
| **14.1** | AIチャット基盤（Phase 9.8-B完了） | ✅ 完了 |
| **14.2** | AI設定型定義 | ✅ 完了 |
| **14.3** | AI設定保存・取得 | ✅ 完了 |
| **14.4** | AI設定UI | ✅ 完了 |
| **14.5** | AIコンテキスト統合 | ✅ 完了 |
| **14.6** | 監査ログ・使用量ダッシュボード | ✅ 完了 |
| **14.7-A〜C** | テナント別AI設定（基盤・型・サービス） | ✅ 完了 |
| **14.7-D〜H** | テナント別AI設定（実装） | → **Phase 19へ移行** |
| **14.8** | OKR AI統合（分析・提案） | → **Phase 20へ移行** |
| **14.9** | Action Map AI統合（自動生成） | → **Phase 21へ移行** |
| **14.10** | TODO AI統合（優先順位・習慣コーチ） | → **Phase 22へ移行** |
| **14-CSV** | CSVインポート機能 | 🔜 後回し |

### 1.4 Phase 14.7 詳細（テナント別AI設定）

**詳細ランブック:** `docs/runbooks/PHASE14/PHASE14.7-TENANT-AI-RUNBOOK.md`

| ステップ | 内容 | 状態 |
|----------|------|------|
| 14.7-A | DB マイグレーション（ai_settings カラム） | ✅ 完了 |
| 14.7-B | 型定義（lib/types/ai-settings.ts） | ✅ 完了 |
| 14.7-C | サーバーサービス（lib/server/tenant-ai-settings.ts） | ✅ 完了 |
| 14.7-D | API エンドポイント | → **Phase 19.1へ移行** |
| 14.7-E | UI コンポーネント（TenantAISettingsPanel） | → **Phase 19.2へ移行** |
| 14.7-F | AI無効時のUI制御（Context + Hook） | → **Phase 19.4へ移行** |

> **Phase 19へ移行**: 実装フェーズは `docs/runbooks/PHASE19-AI-IMPLEMENTATION-RUNBOOK.md` を参照

---

## 2. Phase 14-A: CSVインポート機能

### 2.1 目的

- API連携なしでデータ一括投入
- スプレッドシートからの移行サポート
- テストデータ投入の効率化

### 2.2 対応エンティティ

| エンティティ | 優先度 | 用途 |
|-------------|--------|------|
| Leads | 🔴 高 | リード一括登録 |
| Clients | 🔴 高 | クライアント一括登録 |
| Tasks | 🔴 高 | タスク一括登録 |
| Objectives | 🟡 中 | OKR一括登録 |
| KeyResults | 🟡 中 | KR一括登録 |
| ActionMaps | 🟡 中 | AM一括登録 |
| ActionItems | 🟡 中 | アイテム一括登録 |

### 2.3 ワークストリーム WS-CSV

```
WS-CSV-1: CSVパーサー基盤
          lib/core/csv-parser.ts
          - Papa Parse 使用
          - 文字コード自動検出（UTF-8, Shift_JIS）
          - ヘッダー検証
          - 型変換（日付、数値、boolean）

WS-CSV-2: インポートバリデーション
          lib/core/csv-validator.ts
          - 必須フィールドチェック
          - データ型検証
          - 参照整合性チェック（外部キー）
          - エラー行レポート

WS-CSV-3: Leads CSVインポート
          app/api/import/leads/route.ts
          CSVカラム:
          - name*, company*, email, phone, status, source
          - industry, position, notes, approachChannel

WS-CSV-4: Clients CSVインポート
          app/api/import/clients/route.ts
          CSVカラム:
          - name*, company*, email, phone
          - contractStart, contractEnd, arpu, status

WS-CSV-5: Tasks CSVインポート
          app/api/import/tasks/route.ts
          CSVカラム:
          - title*, suit (行/知/感/想), priority, status
          - deadline, estimatedMinutes, notes

WS-CSV-6: OKR CSVインポート
          app/api/import/okr/route.ts
          CSVカラム:
          - objectiveTitle*, krTitle, krTarget, krCurrent
          - scope (personal/team/company), deadline

WS-CSV-7: CSVインポートUI
          app/_components/settings/CSVImportPanel.tsx
          - ファイルドロップゾーン
          - エンティティ選択
          - プレビューテーブル
          - 検証エラー表示
          - インポート実行・結果表示

WS-CSV-8: CSVテンプレートダウンロード
          app/api/import/templates/[entity]/route.ts
          - 各エンティティのサンプルCSV生成
          - ヘッダー + サンプル2行
```

### 2.4 CSVフォーマット仕様

#### Leads CSV
```csv
name,company,email,phone,status,source,industry,position,notes
田中太郎,株式会社ABC,tanaka@abc.co.jp,03-1234-5678,prospect,web,IT,部長,初回面談済み
```

#### Tasks CSV
```csv
title,suit,priority,status,deadline,estimatedMinutes,notes
企画書作成,行,high,pending,2025-12-15,120,
```

### 2.5 成果物

- `lib/core/csv-parser.ts`
- `lib/core/csv-validator.ts`
- `app/api/import/leads/route.ts`
- `app/api/import/clients/route.ts`
- `app/api/import/tasks/route.ts`
- `app/api/import/okr/route.ts`
- `app/api/import/templates/[entity]/route.ts`
- `app/_components/settings/CSVImportPanel.tsx`
- `app/_components/settings/CSVImportPanel.module.css`

---

## 3. Phase 14-B: AI設定（APIキー・オフ機能）

### 3.1 目的

- **ユーザー別APIキー**: テスト時に各自のAPIキーを使用
- **AIオフ機能**: AIを使わない運用モード
- **コスト管理**: 誰がどれだけ使ったか追跡可能

### 3.2 設定レベル

| レベル | 設定場所 | 優先度 | 用途 |
|--------|----------|--------|------|
| システム | 環境変数 | 最低 | デフォルト設定 |
| ワークスペース | DB | 中 | チーム共通設定 |
| ユーザー | DB | 最高 | 個人設定（テスト用） |

### 3.3 ワークストリーム WS-AISET

```
WS-AISET-1: AI設定型定義
            lib/types/ai-settings.ts

            interface AISettings {
              enabled: boolean;           // AI有効/無効
              apiKeySource: 'system' | 'workspace' | 'user';
              userApiKey?: string;        // 暗号化して保存
              model: string;              // gpt-4o-mini等
              maxTokensPerRequest: number;
              monthlyQuota: number;
              contextLevel: AIContextLevel;
            }

WS-AISET-2: 設定保存・取得
            lib/core/ai-settings.ts
            - getEffectiveAISettings(userId, workspaceId)
            - updateUserAISettings(userId, settings)
            - updateWorkspaceAISettings(workspaceId, settings)

WS-AISET-3: APIキー暗号化
            lib/server/api-key-encryption.ts
            - 既存encryption.tsを活用
            - ユーザー単位の暗号化キー
            - 復号はサーバーサイドのみ

WS-AISET-4: AI設定UI
            app/_components/settings/AISettingsPanel.tsx
            - AIオン/オフトグル
            - APIキー入力（マスク表示）
            - モデル選択
            - コンテキストレベル選択
            - 使用量表示

WS-AISET-5: APIキー検証
            app/api/ai/validate-key/route.ts
            - 入力されたAPIキーの有効性確認
            - テストリクエスト送信
            - エラー時の詳細メッセージ

WS-AISET-6: AI無効時のUI
            全AIコンポーネントで
            - AI無効時は「AI機能はオフです」表示
            - 設定画面へのリンク
            - グレーアウト表示
```

### 3.4 設定優先度ロジック

```typescript
function getEffectiveAISettings(userId: string, workspaceId: string): AISettings {
  // 1. ユーザー設定を確認
  const userSettings = getUserAISettings(userId);
  if (userSettings?.apiKeySource === 'user' && userSettings.userApiKey) {
    return { ...userSettings, apiKey: decrypt(userSettings.userApiKey) };
  }

  // 2. ワークスペース設定を確認
  const wsSettings = getWorkspaceAISettings(workspaceId);
  if (wsSettings?.apiKeySource === 'workspace' && wsSettings.apiKey) {
    return { ...wsSettings, apiKey: decrypt(wsSettings.apiKey) };
  }

  // 3. システム設定（環境変数）
  return {
    enabled: process.env.AI_ENABLED === 'true',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    // ...
  };
}
```

### 3.5 AI無効時の動作

| 機能 | AI有効時 | AI無効時 |
|------|----------|----------|
| チャット | 使用可能 | 「AI機能はオフです」表示 |
| OKR提案 | ボタン表示 | ボタン非表示またはグレーアウト |
| タスク優先順位 | 自動提案 | 手動のみ |
| 習慣コーチ | アドバイス表示 | 非表示 |

### 3.6 成果物

- `lib/types/ai-settings.ts`
- `lib/core/ai-settings.ts`
- `lib/server/api-key-encryption.ts`
- `app/api/ai/validate-key/route.ts`
- `app/_components/settings/AISettingsPanel.tsx`
- `app/_components/settings/AISettingsPanel.module.css`

---

## 4. Phase 14-C: Chat UI・会話履歴

### 4.1 既存AI基盤ステータス

| コンポーネント | 実装 | ファイル | 状態 |
|--------------|------|----------|------|
| コンテキストエンジン | 100% | `lib/core/ai-context.ts` | ✅ Ready |
| Chat API Gateway | 100% | `app/api/ai/chat/route.ts` | ✅ Ready |
| Rate Limiting | 100% | `lib/server/rate-limit.ts` | ✅ Ready |
| モデル設定 | 100% | gpt-4o-mini | ✅ Configured |
| **Chat UI** | **0%** | N/A | **TODO** |
| **会話履歴** | **0%** | N/A | **TODO** |

### 4.2 ワークストリーム WS-CHAT

```
WS-CHAT-1: ChatPanel基本コンポーネント
           app/_components/ai/ChatPanel.tsx
           - 入力フィールド
           - メッセージ表示エリア
           - ストリーミング表示
           - ローディング状態
           - AI無効時の表示

WS-CHAT-2: useChat hook統合
           Vercel AI SDK useChat hook使用
           - ストリーミングレスポンス
           - エラーハンドリング
           - リトライ機能

WS-CHAT-3: ChatMessage コンポーネント
           app/_components/ai/ChatMessage.tsx
           - ユーザーメッセージ（右寄せ）
           - AIメッセージ（左寄せ）
           - Markdown レンダリング
           - タイムスタンプ

WS-CHAT-4: ChatInput コンポーネント
           app/_components/ai/ChatInput.tsx
           - テキストエリア（複数行対応）
           - 送信ボタン
           - Enter送信 / Shift+Enter改行
           - 文字数制限表示

WS-CHAT-5: コンテキストセレクタ
           app/_components/ai/ContextSelector.tsx
           - MINIMAL / STANDARD / FULL 選択
           - コンテキストプレビュー
           - トークン数表示

WS-CHAT-6: 会話履歴永続化
           lib/core/ai-conversation.ts
           - appData内に保存
           - 会話一覧取得
           - メッセージ追加
```

---

## 5. Phase 14-D: OKR/ActionMap/TODO AI統合

### 5.1 ワークストリーム WS-AI-OKR

```
WS-AI-OKR-1: OKR分析エンドポイント
             app/api/ai/okr/analyze/route.ts
             - AI設定チェック（無効なら403）
             - 現在のOKR進捗分析
             - 改善提案生成

WS-AI-OKR-2: Objective提案エンドポイント
             app/api/ai/okr/suggest-objective/route.ts
             - MVV/ブランドからの目標提案
             - SMART原則チェック

WS-AI-OKR-3: OKR AIパネル統合
             app/_components/okr/OKRAIPanel.tsx
             - AI無効時は非表示
             - 「AIに相談」ボタン
             - 提案のワンクリック適用
```

### 5.2 ワークストリーム WS-AI-AM

```
WS-AI-AM-1: Action Map生成エンドポイント
            app/api/ai/action-map/generate/route.ts
            - KRからAction Map自動生成
            - マイルストーン提案

WS-AI-AM-2: Action Item分解エンドポイント
            app/api/ai/action-map/breakdown/route.ts
            - 大きなタスクの分解
            - 見積もり時間提案
```

### 5.3 ワークストリーム WS-AI-TODO

```
WS-AI-TODO-1: タスク優先順位付けエンドポイント
              app/api/ai/todo/prioritize/route.ts
              - 4象限への自動分類

WS-AI-TODO-2: 習慣コーチエンドポイント
              app/api/ai/todo/habit-coach/route.ts
              - 松竹梅選択アドバイス
```

---

## 6. Phase 14-E: 監査ログ・ガバナンス

### 6.1 ワークストリーム WS-AUDIT

```
WS-AUDIT-1: AI監査ログ
            lib/server/ai-audit.ts
            - 全AIリクエストのログ
            - ユーザー別使用量追跡
            - コスト推定

WS-AUDIT-2: 使用量ダッシュボード
            app/_components/admin/AIUsagePanel.tsx
            - ユーザー別使用量
            - 日次/週次/月次集計
            - コストレポート
```

---

## 7. API エンドポイント一覧

### CSVインポート（Phase 14-A）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/import/leads` | POST | Leads CSVインポート |
| `/api/import/clients` | POST | Clients CSVインポート |
| `/api/import/tasks` | POST | Tasks CSVインポート |
| `/api/import/okr` | POST | OKR CSVインポート |
| `/api/import/templates/[entity]` | GET | テンプレートダウンロード |

### AI設定（Phase 14-B）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/ai/settings` | GET | AI設定取得 |
| `/api/ai/settings` | PUT | AI設定更新 |
| `/api/ai/validate-key` | POST | APIキー検証 |

### AI機能（Phase 14-C/D）

| エンドポイント | メソッド | 説明 | 状態 |
|--------------|---------|------|------|
| `/api/ai/chat` | POST | 汎用チャット | ✅ Ready |
| `/api/ai/okr/analyze` | POST | OKR分析 | TODO |
| `/api/ai/okr/suggest-objective` | POST | Objective提案 | TODO |
| `/api/ai/action-map/generate` | POST | AM自動生成 | TODO |
| `/api/ai/action-map/breakdown` | POST | タスク分解 | TODO |
| `/api/ai/todo/prioritize` | POST | タスク優先順位付け | TODO |
| `/api/ai/todo/habit-coach` | POST | 習慣コーチ | TODO |

---

## 8. 型定義

```typescript
// lib/types/ai-settings.ts

export interface AISettings {
  // 基本設定
  enabled: boolean;
  apiKeySource: 'system' | 'workspace' | 'user';

  // ユーザー設定時のみ
  userApiKey?: string;  // 暗号化保存

  // モデル設定
  model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo';
  maxTokensPerRequest: number;

  // コンテキスト設定
  contextLevel: AIContextLevel;

  // 使用制限
  monthlyQuota: number;
  currentUsage: number;
}

export interface AISettingsUpdate {
  enabled?: boolean;
  apiKeySource?: 'system' | 'workspace' | 'user';
  userApiKey?: string;
  model?: string;
  contextLevel?: AIContextLevel;
}

// lib/types/csv-import.ts

export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: CSVImportError[];
}

export interface CSVImportError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface CSVValidationResult {
  valid: boolean;
  errors: CSVImportError[];
  preview: Record<string, unknown>[];
}
```

---

## 9. 実装スケジュール

| Day | サブフェーズ | ワークストリーム | 概要 |
|-----|-------------|------------------|------|
| 1-2 | 14-A | WS-CSV-1〜3 | CSVパーサー・Leads/Clients |
| 2-3 | 14-A | WS-CSV-4〜6 | Tasks/OKR インポート |
| 3-4 | 14-A | WS-CSV-7〜8 | CSVインポートUI・テンプレート |
| 4-5 | 14-B | WS-AISET-1〜3 | AI設定型・保存・暗号化 |
| 5-6 | 14-B | WS-AISET-4〜6 | AI設定UI・検証・無効時UI |
| 6-8 | 14-C | WS-CHAT-1〜6 | Chat UI・会話履歴 |
| 8-10 | 14-D | WS-AI-* | OKR/AM/TODO AI統合 |
| 10-11 | 14-E | WS-AUDIT | 監査ログ・使用量 |

---

## 10. 品質ゲート

### 10.1 Phase 14 完了条件

| 指標 | 目標 | 測定方法 |
|------|------|----------|
| **CSVインポート** | | |
| Leads CSV | 動作確認 | E2Eテスト |
| Tasks CSV | 動作確認 | E2Eテスト |
| OKR CSV | 動作確認 | E2Eテスト |
| エラーハンドリング | 詳細エラー表示 | 手動テスト |
| **AI設定** | | |
| AIオフ機能 | 全画面で正常動作 | E2Eテスト |
| ユーザーAPIキー | 暗号化保存・使用 | 手動テスト |
| 設定UI | 完全動作 | E2Eテスト |
| **AI機能** | | |
| Chat UI | 完全動作 | E2Eテスト |
| AI無効時 | グレースフルデグレード | 手動テスト |
| Rate Limit | 全エンドポイント適用 | 負荷テスト |

### 10.2 セキュリティチェックリスト

- [ ] CSVインポート: ファイルサイズ制限
- [ ] CSVインポート: 悪意あるデータ対策（XSS等）
- [ ] APIキー: 暗号化保存
- [ ] APIキー: ログに出力しない
- [ ] AI無効時: エンドポイント403返却

---

## 11. 環境変数

```bash
# システムデフォルト（Phase 9.8）
OPENAI_API_KEY=sk-...              # システムAPIキー
AI_ENABLED=true                    # AI機能有効化フラグ
AI_DEFAULT_MODEL=gpt-4o-mini       # デフォルトモデル

# CSVインポート
CSV_MAX_FILE_SIZE_MB=10            # 最大ファイルサイズ
CSV_MAX_ROWS=10000                 # 最大行数

# AI設定
AI_ALLOW_USER_KEYS=true            # ユーザーAPIキー許可
AI_MAX_TOKENS_PER_REQUEST=4000     # 最大トークン/リクエスト
AI_MONTHLY_QUOTA_TOKENS=1000000    # 月間トークン上限
```

---

## 12. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| CSVファイルサイズ | 中 | ファイルサイズ制限、行数制限 |
| 不正CSV | 中 | バリデーション、サニタイズ |
| APIキー漏洩 | 高 | 暗号化保存、ログ除外 |
| APIコスト超過 | 高 | ユーザー別クォータ、監査ログ |
| AI無効時のUX | 中 | グレースフルデグレード |

---

## 13. 関連ドキュメント

- `docs/FDC-GRAND-GUIDE.md` - 全体ガイド
- `docs/specs/API-SPEC.md` - API仕様
- `docs/runbooks/PHASE13-TECH-DEBT-RUNBOOK.md` - 前Phase
- `docs/runbooks/PHASE14.7-TENANT-AI-RUNBOOK.md` - **テナント別AI設定（詳細）**
- `lib/core/ai-context.ts` - 既存AIコンテキスト基盤
- `lib/server/tenant-ai-settings.ts` - テナントAI設定サービス
- `lib/types/ai-settings.ts` - AI設定型定義

---

**作成日**: 2025-11-29
**最終更新**: 2025-12-05
**ステータス**: ✅ Phase 14完了（14.7-D以降はPhase 19へ移行）
