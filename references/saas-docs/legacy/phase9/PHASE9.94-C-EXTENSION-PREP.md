# Phase 9.94-C: 拡張/新機能準備ワークストリーム

**作成日:** 2025-11-25
**親ランブック:** `docs/PHASE9.94-POLISH-RUNBOOK.md`
**担当:** Claude Code
**期間:** Day 1-5
**完了日:** 2025-11-25

---

## 1. 目的

Phase 10 で必要となるドメインモデル・API型・基盤を先行整備し、技術負債（any型、未使用変数、Hooks警告）を削減する。

---

## 2. 必読ドキュメント

| ドキュメント | パス | 確認 |
|-------------|------|------|
| **Phase 9.94 メインランブック** | `docs/PHASE9.94-POLISH-RUNBOOK.md` | [x] |
| **Phase 10 ランブック** | `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` | [x] |
| **技術負債インベントリ** | `docs/TECH-DEBT-INVENTORY.md` | [x] |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | [x] |

---

## 3. 現状と目標

| 指標 | Phase 9.93 実績 | Phase 9.94 目標 | 根拠 |
|------|----------------|----------------|------|
| `no-explicit-any` 警告 | ~40件 | **20件以下** | 50%削減 |
| `no-unused-vars` 警告 | ~20件 | **10件以下** | 50%削減 |
| `exhaustive-deps` 警告 | 2件 | **0件** | 完全解消 |
| Phase 10 型定義 | なし | **作成済み** | 先行準備 |
| オフライン戦略 | なし | **設計済み** | Phase 10 準備 |

---

## 4. タスク一覧

| # | タスク | 期日 | 完了判定 | 完了 |
|---|--------|------|---------|------|
| C-01 | `lib/types/todo.ts` 作成 | Day 1 | Task, Suit, ElasticLevel 型定義 | [x] |
| C-02 | Zod スキーマ定義 | Day 2 | `sanitizeTask` 実装 | [x] |
| C-03 | `any` 型の具体化（高優先度） | Day 2-3 | 高優先度 any 解消 | [x] |
| C-04 | `any` 型の具体化（中優先度） | Day 3-4 | 中優先度 any 解消 | [x] |
| C-05 | 未使用変数の削除 | Day 2 | `no-unused-vars` 10件以下 | [x] |
| C-06 | React Hooks 依存配列修正 | Day 2 | `exhaustive-deps` 0件 | [x] |
| C-07 | オフライン/同期戦略ドキュメント | Day 4 | 設計書作成 | [x] |
| C-08 | `app/_components/todo/` 骨格作成 | Day 4 | ディレクトリ・index 作成 | [x] |
| C-09 | デプロイ警告の型関連解消 | Day 5 | 型エラー起因の警告 0 | [x] |

---

## 5. 実装詳細

### 5.1 C-01: lib/types/todo.ts 作成

✅ **完了** - `lib/types/todo.ts` を作成

実装内容:
- `Suit` 型（spade/heart/diamond/club）
- `ElasticLevel` 型（ume/take/matsu）
- `TaskStatus` 型（not_started/in_progress/done）
- `Task` インターフェース（全フィールド定義）
- `SubTask` インターフェース
- `SUIT_CONFIG` 設定オブジェクト
- `ELASTIC_CONFIG` 設定オブジェクト
- `BADGE_CONFIG` バッジ設定オブジェクト
- `createDefaultTask()` ユーティリティ関数
- `calculateStreak()` ストリーク計算関数
- `getTaskBadges()` バッジ取得関数
- `groupTasksBySuit()` スート別グループ化関数

### 5.2 C-02: Zod スキーマ定義

✅ **完了** - `lib/core/validator.ts` を拡張

実装内容:
- `SubTaskSchema` Zodスキーマ
- `TaskSchema` Zodスキーマ（全フィールドバリデーション）
- `sanitizeTask()` 関数
- `sanitizeTasks()` 関数
- `validateTask()` 関数

### 5.3 C-03 & C-04: any 型の具体化

✅ **完了** - 以下のファイルで any 型を具体化

| ファイル | 変更内容 |
|---------|---------|
| `lib/types/app-data.ts` | `SettingsSection` 型追加、`SendHistoryEntry` 型追加 |
| `lib/types/database.ts` | `data: any` → `data: AppData` |
| `lib/hooks/useClients.ts` | `(c: any)` → `(c: AppDataClient)` |
| `lib/hooks/useLeads.ts` | `(p: any)` → `(p: Prospect)` |
| `lib/hooks/useDashboardStats.ts` | `(p: any)` → `(p: Prospect)` |
| `lib/server/db.ts` | `any` → `Record<string, unknown>` |
| `lib/core/validator.ts` | `z.any()` → `z.unknown()` |

### 5.4 C-05: 未使用変数の削除

✅ **完了** - `app/_components/templates/TemplatesTab.tsx` から未使用のlucide-reactインポートを削除

### 5.5 C-06: React Hooks 依存配列修正

✅ **完了** - 以下のファイルで修正

| ファイル | 変更内容 |
|---------|---------|
| `lib/hooks/useOKR.ts` | `fetchOKR` を `useCallback` でラップ |
| `lib/hooks/useDashboardStats.ts` | `fetchStats` を `useCallback` でラップ |

### 5.6 C-07: オフライン/同期戦略ドキュメント

✅ **完了** - `docs/guides/OFFLINE-SYNC.md` を作成

内容:
- Phase 10.1〜10.3 の段階的実装計画
- Service Worker + 楽観的UI戦略
- IndexedDB + バックグラウンド同期戦略
- IDBSchema 定義
- 競合解決（LWW）方針
- `useOnlineStatus` フックサンプル

### 5.7 C-08: app/_components/todo/ 骨格作成

✅ **完了** - 以下のコンポーネントを作成

| ファイル | 説明 |
|---------|------|
| `TodoBoard.tsx` | 4象限ボード（アイゼンハワーマトリクス） |
| `TodoCard.tsx` | 個別タスクカード（ストリーク・バッジ表示） |

### 5.8 C-09: デプロイ警告の型関連解消

✅ **完了** - `lib/core/validator.ts` の `z.any()` を `z.unknown()` に変更

---

## 6. 依存関係

| 依存先 | 内容 | 影響 |
|--------|------|------|
| なし | 独立して進行可能 | - |

---

## 7. 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | `lib/types/todo.ts` が作成されている | ファイル存在確認 | [x] |
| 2 | Zod スキーマが定義されている | ファイル存在確認 | [x] |
| 3 | `no-explicit-any` 警告 20件以下 | `npm run lint` | [x] |
| 4 | `no-unused-vars` 警告 10件以下 | `npm run lint` | [x] |
| 5 | `exhaustive-deps` 警告 0件 | `npm run lint` | [x] |
| 6 | `app/_components/todo/` が存在 | ディレクトリ確認 | [x] |
| 7 | オフライン戦略ドキュメントが作成 | ドキュメント確認 | [x] |
| 8 | `npm run type-check` がエラー 0 | コマンド実行 | [x] |

---

## 8. 日次進捗記録

| 日付 | 完了タスク | ブロッカー | 明日の予定 |
|------|-----------|-----------|-----------|
| 2025-11-25 | C-01〜C-09 全タスク完了 | なし | Phase 10 開発開始 |

---

**最終更新:** 2025-11-25
**ステータス:** ✅ 完了
