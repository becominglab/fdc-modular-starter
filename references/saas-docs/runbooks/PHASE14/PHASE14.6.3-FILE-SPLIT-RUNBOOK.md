# Phase 14.6.3: 大規模ファイル分割ランブック

## 概要

**目的**: 500行以上の大規模ファイルを分割し、システムの保守性・安定性を向上

**実施日**: 2025-12-02
**完了日**: 2025-12-02
**バージョン**: v2.8.7
**ステータス**: ✅ **完了**

---

## 実施結果サマリ

### Phase 14.6.3〜14.6.5（分割完了）

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

### Phase 14.6.4（第2弾: 400-640行）

50ファイルを4並行ワーカーで分割

### Phase 14.6.5（第3弾: 残り500行超）

| ファイル | 元の行数 | 分割後 |
|----------|---------|--------|
| calendar.ts | 598行 | 5ファイル (7行 re-export) |
| google/sync/route.ts | 523行 | 3ファイル (337行 route) |
| data/route.ts | 520行 | 4ファイル (66行 route) |

**検証結果**:
- ✅ `npm run type-check`: PASS
- ✅ `npm run test:unit`: 129 tests passed
- ✅ `npm run build`: PASS
- ✅ `git push`: 完了

---

## 対象ファイル一覧

| # | ファイル | 行数 | 優先度 | 担当ワーカー |
|---|----------|------|--------|-------------|
| 1 | `lib/hooks/useTaskViewModel.ts` | 1536 | **Critical** | Worker A |
| 2 | `lib/hooks/useOKRViewModel.ts` | 1194 | **Critical** | Worker A |
| 3 | `lib/hooks/useLeadsViewModel.ts` | 928 | High | Worker B |
| 4 | `lib/hooks/useTemplatesViewModel.ts` | 902 | High | Worker B |
| 5 | `lib/hooks/useSettingsViewModel.ts` | 812 | Medium | Worker C |
| 6 | `lib/hooks/useActionMapViewModel.ts` | 758 | Medium | Worker C |
| 7 | `components/landing/LandingPage.tsx` | 862 | Medium | Worker D |
| 8 | `lib/csv/csv-utils.ts` | 658 | Low | Worker D |

**合計**: 7,650行 → 目標: 各ファイル300行以下

---

## 4並行ワーカー割り当て

### Worker A: Task & OKR ViewModel（最重要）

**担当ファイル**:
- `useTaskViewModel.ts` (1536行)
- `useOKRViewModel.ts` (1194行)

**合計**: 2,730行

---

### Worker B: Leads & Templates ViewModel

**担当ファイル**:
- `useLeadsViewModel.ts` (928行)
- `useTemplatesViewModel.ts` (902行)

**合計**: 1,830行

---

### Worker C: Settings & ActionMap ViewModel

**担当ファイル**:
- `useSettingsViewModel.ts` (812行)
- `useActionMapViewModel.ts` (758行)

**合計**: 1,570行

---

### Worker D: Landing & CSV Utilities

**担当ファイル**:
- `LandingPage.tsx` (862行)
- `csv-utils.ts` (658行)

**合計**: 1,520行

---

## Worker A: Task & OKR ViewModel 分割計画

### A-1: useTaskViewModel.ts (1536行 → 5ファイル)

**現状の責務**:
- タスク CRUD 操作
- ドラッグ&ドロップ処理
- Elastic Habits ストリーク計算
- 梅習慣連携
- Googleカレンダー連携
- CSV エクスポート

**分割計画**:

```
lib/hooks/task/
├── useTaskViewModel.ts      (~250行) 統合レイヤー・公開API
├── useTaskCRUD.ts           (~300行) 作成・更新・削除・複製
├── useTaskFilters.ts        (~200行) フィルタ・ソート・グルーピング
├── useHabitLogic.ts         (~400行) Elastic/梅習慣・ストリーク計算
├── useTaskDragDrop.ts       (~200行) D&D・スート変更
└── useTaskCalendar.ts       (~200行) Googleカレンダー連携
```

**依存関係**:
```
useTaskViewModel (統合)
    ├── useTaskCRUD
    ├── useTaskFilters
    ├── useHabitLogic
    ├── useTaskDragDrop
    └── useTaskCalendar
```

**実装手順**:
1. `lib/hooks/task/` ディレクトリ作成
2. 型定義を `lib/types/task-viewmodel.ts` に抽出
3. `useTaskCRUD.ts` 作成（addTask, updateTask, deleteTask, duplicateTask）
4. `useTaskFilters.ts` 作成（groupTasksBySuit, filterByDate, sortTasks）
5. `useHabitLogic.ts` 作成（calculateStreak, updateUmeHabitStreak, archiveLogs）
6. `useTaskDragDrop.ts` 作成（handleDrop, changeSuit）
7. `useTaskCalendar.ts` 作成（importCalendarEvents, syncToCalendar）
8. `useTaskViewModel.ts` を統合レイヤーとして再構成
9. 既存インポートを更新（re-export パターン使用）

---

### A-2: useOKRViewModel.ts (1194行 → 4ファイル)

**現状の責務**:
- Objective CRUD
- KeyResult CRUD
- 進捗計算・ロールアップ
- ActionMap連携
- フィルタリング
- CSV エクスポート

**分割計画**:

```
lib/hooks/okr/
├── useOKRViewModel.ts       (~300行) 統合レイヤー・公開API
├── useObjectiveCRUD.ts      (~250行) Objective 作成・更新・削除
├── useKeyResultCRUD.ts      (~250行) KR 作成・更新・削除・ActionMap連携
└── useOKRProgress.ts        (~350行) 進捗計算・ロールアップ・サマリー
```

**依存関係**:
```
useOKRViewModel (統合)
    ├── useObjectiveCRUD
    ├── useKeyResultCRUD
    └── useOKRProgress
```

**実装手順**:
1. `lib/hooks/okr/` ディレクトリ作成
2. `useObjectiveCRUD.ts` 作成
3. `useKeyResultCRUD.ts` 作成（linkActionMapToKR含む）
4. `useOKRProgress.ts` 作成（recalculateAllKRProgress, recalculateAllObjectiveProgress）
5. `useOKRViewModel.ts` を統合レイヤーとして再構成
6. 既存インポートを更新

---

## Worker B: Leads & Templates ViewModel 分割計画

### B-1: useLeadsViewModel.ts (928行 → 4ファイル)

**現状の責務**:
- 見込み客 CRUD
- ファネルステータス管理
- 失注アンケート
- タグ・履歴管理
- CSV インポート

**分割計画**:

```
lib/hooks/leads/
├── useLeadsViewModel.ts     (~250行) 統合レイヤー・公開API
├── useLeadsCRUD.ts          (~300行) 作成・更新・削除
├── useLeadsFunnel.ts        (~200行) ファネル・失注アンケート
└── useLeadsHistory.ts       (~200行) タグ・履歴・リマインダー
```

**実装手順**:
1. `lib/hooks/leads/` ディレクトリ作成
2. `useLeadsCRUD.ts` 作成
3. `useLeadsFunnel.ts` 作成（updateStatus, openLostSurvey, submitLostSurvey）
4. `useLeadsHistory.ts` 作成（addTag, removeTag, addHistory）
5. `useLeadsViewModel.ts` を統合レイヤーとして再構成

---

### B-2: useTemplatesViewModel.ts (902行 → 4ファイル)

**現状の責務**:
- テンプレート CRUD
- タイプ切替（messenger/email/proposal/closing）
- 使用記録・統計
- クリップボードコピー
- CSV エクスポート

**分割計画**:

```
lib/hooks/templates/
├── useTemplatesViewModel.ts (~250行) 統合レイヤー・公開API
├── useTemplateCRUD.ts       (~300行) 作成・更新・削除・複製
├── useTemplateUsage.ts      (~200行) 使用記録・統計計算
└── useTemplatePreview.ts    (~150行) プレビュー・クリップボード
```

**実装手順**:
1. `lib/hooks/templates/` ディレクトリ作成
2. `useTemplateCRUD.ts` 作成
3. `useTemplateUsage.ts` 作成（recordUsage, recordResult, usageStats計算）
4. `useTemplatePreview.ts` 作成（selectTemplateForUse, copyToClipboard）
5. `useTemplatesViewModel.ts` を統合レイヤーとして再構成

---

## Worker C: Settings & ActionMap ViewModel 分割計画

### C-1: useSettingsViewModel.ts (812行 → 4ファイル)

**現状の責務**:
- 認証状態管理
- Google Tasks 連携
- Google カレンダー連携
- データエクスポート/インポート/リセット

**分割計画**:

```
lib/hooks/settings/
├── useSettingsViewModel.ts  (~200行) 統合レイヤー・公開API
├── useGoogleTasksSync.ts    (~200行) Google Tasks 連携
├── useGoogleCalendarSync.ts (~200行) Google カレンダー連携
└── useDataManagement.ts     (~200行) エクスポート/インポート/リセット
```

**実装手順**:
1. `lib/hooks/settings/` ディレクトリ作成
2. `useGoogleTasksSync.ts` 作成（connectGoogleTasks, disconnectGoogleTasks）
3. `useGoogleCalendarSync.ts` 作成（connectCalendar, createTestEvent）
4. `useDataManagement.ts` 作成（exportData, importData, resetAllData）
5. `useSettingsViewModel.ts` を統合レイヤーとして再構成

---

### C-2: useActionMapViewModel.ts (758行 → 4ファイル)

**現状の責務**:
- ActionMap CRUD
- ActionItem CRUD
- ツリー構造構築
- 進捗計算
- TODO連携

**分割計画**:

```
lib/hooks/action-map/
├── useActionMapViewModel.ts (~200行) 統合レイヤー・公開API
├── useActionMapCRUD.ts      (~200行) Map 作成・更新・削除
├── useActionItemCRUD.ts     (~200行) Item 作成・更新・削除・移動
└── useActionMapProgress.ts  (~150行) 進捗計算・ツリー構築
```

**実装手順**:
1. `lib/hooks/action-map/` ディレクトリ作成
2. `useActionMapCRUD.ts` 作成
3. `useActionItemCRUD.ts` 作成（createItem, updateItem, moveItem）
4. `useActionMapProgress.ts` 作成（recomputeProgress, buildTree）
5. `useActionMapViewModel.ts` を統合レイヤーとして再構成

---

## Worker D: Landing & CSV Utilities 分割計画

### D-1: LandingPage.tsx (862行 → 6ファイル)

**現状の責務**:
- ヘッダー・ナビゲーション
- ヒーローセクション
- 機能紹介セクション
- 料金プラン
- FAQ
- フッター
- お問い合わせフォーム

**分割計画**:

```
components/landing/
├── LandingPage.tsx          (~100行) レイアウト統合
├── LandingHeader.tsx        (~80行)  ヘッダー・ナビ
├── HeroSection.tsx          (~100行) ヒーロー
├── FeaturesSection.tsx      (~150行) 機能紹介
├── PricingSection.tsx       (~150行) 料金プラン
├── FAQSection.tsx           (~100行) FAQ
├── ContactForm.tsx          (~120行) お問い合わせフォーム
└── LandingFooter.tsx        (~60行)  フッター
```

**実装手順**:
1. 各セクションを独立コンポーネントとして抽出
2. スタイルは `LandingPage.module.css` を共有
3. `LandingPage.tsx` を統合レイアウトとして再構成

---

### D-2: csv-utils.ts (658行 → 4ファイル)

**現状の責務**:
- CSV パーサー
- CSV ジェネレーター
- フィールドマッピング
- バリデーション
- 各種変換関数

**分割計画**:

```
lib/csv/
├── index.ts                 (~50行)  re-export
├── csv-parser.ts            (~200行) parseCSV, parseCSVLine
├── csv-generator.ts         (~150行) generateCSV, downloadCSV
├── csv-validators.ts        (~150行) バリデーション・変換
└── csv-mappings.ts          (~100行) フィールドマッピング定義
```

**実装手順**:
1. `csv-parser.ts` 作成（パース関連）
2. `csv-generator.ts` 作成（生成・ダウンロード）
3. `csv-validators.ts` 作成（バリデーション）
4. `csv-mappings.ts` 作成（マッピング定義）
5. `index.ts` で re-export（後方互換性維持）

---

## 共通ルール

### 1. 後方互換性の維持

```typescript
// lib/hooks/useTaskViewModel.ts (元のパス)
// 後方互換性のため re-export
export * from './task/useTaskViewModel';
export { useTaskViewModel as default } from './task/useTaskViewModel';
```

### 2. 型定義の分離

```typescript
// lib/types/task-viewmodel.ts
export interface TaskFormData { ... }
export interface UseTaskViewModelReturn { ... }
```

### 3. テストの更新

- 分割後も既存テストがパスすることを確認
- 必要に応じて新規テストを追加

### 4. 命名規則

- 統合レイヤー: `use{Domain}ViewModel.ts`
- CRUD: `use{Domain}CRUD.ts`
- 機能別: `use{Domain}{Feature}.ts`

---

## 検証チェックリスト

### 各 Worker 完了時

- [ ] `npm run type-check` パス
- [ ] `npm run test:unit` パス
- [ ] `npm run build` パス
- [ ] 分割後の各ファイルが 300行以下
- [ ] 既存インポートが動作する（後方互換性）

### 全体完了時

- [ ] E2E テスト（手動確認）
- [ ] 本番デプロイ
- [ ] ランブック更新

---

## タイムライン

```
Phase 14.6.3 開始
    │
    ├── Worker A: Task & OKR (並行)
    ├── Worker B: Leads & Templates (並行)
    ├── Worker C: Settings & ActionMap (並行)
    └── Worker D: Landing & CSV (並行)
    │
    ▼
全 Worker 完了 → 統合検証
    │
    ▼
Phase 14.6.3 完了 → main マージ
```

---

## ロールバック手順

分割に問題が発生した場合:

```bash
# 直前のコミットに戻す
git revert HEAD

# または特定のコミットまで戻す
git reset --hard <commit-hash>
```

---

## 関連ドキュメント

- [FDC-GRAND-GUIDE.md](../FDC-GRAND-GUIDE.md)
- [PHASE14.6-I-SECURITY-HARDENING-RUNBOOK.md](./PHASE14.6-I-SECURITY-HARDENING-RUNBOOK.md)
- [tests/skipped-tests.md](../../tests/skipped-tests.md)
