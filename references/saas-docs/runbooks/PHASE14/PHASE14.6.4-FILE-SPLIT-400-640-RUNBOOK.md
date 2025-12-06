# Phase 14.6.4: 中規模ファイル分割ランブック (400-640行)

## 概要

**目的**: 400-640行の中規模ファイルを分割し、将来の肥大化を防止
**実施日**: 2025-12-02
**前提**: Phase 14.6.3 完了後に実施
**バージョン**: v2.8.8

---

## 対象ファイル一覧 (55ファイル)

### 分割対象 (プロダクションコード: 35ファイル)

| # | ファイル | 行数 | 種別 | Worker |
|---|---------|------|------|--------|
| 1 | useSADashboardViewModel.ts | 640 | ViewModel | A |
| 2 | useBrandViewModel.ts | 636 | ViewModel | A |
| 3 | useTaskViewModel.ts (分割後) | 610 | ViewModel | - (14.6.3で対応済み) |
| 4 | validator.ts | 610 | Core | B |
| 5 | useLeanCanvasViewModel.ts | 608 | ViewModel | A |
| 6 | calendar.ts (types) | 598 | Types | D |
| 7 | sync-engine.ts | 592 | Service | C |
| 8 | UnifiedCSVSection.tsx | 589 | Component | B |
| 9 | useClientsViewModel.ts | 580 | ViewModel | A |
| 10 | useActionMapViewModel.ts (分割後) | 560 | ViewModel | - (14.6.3で対応済み) |
| 11 | TemplateManager.tsx | 560 | Component | B |
| 12 | calendar-client.ts | 527 | Service | C |
| 13 | google/sync/route.ts | 523 | API | C |
| 14 | data/route.ts | 520 | API | C |
| 15 | TenantDetailModal.tsx | 507 | Component | D |
| 16 | org-chart-service.ts | 499 | Service | C |
| 17 | emailCategories.tsx | 497 | Component | D |
| 18 | HabitSlot.tsx | 489 | Component | B |
| 19 | okr.ts | 481 | Core | B |
| 20 | sync-queue.ts | 480 | Service | C |
| 21 | useTemplatesViewModel.ts (分割後) | 474 | ViewModel | - (14.6.3で対応済み) |
| 22 | customer-journey.ts (types) | 473 | Types | D |
| 23 | google/tasks/sync/route.ts | 470 | API | C |
| 24 | template-variables.ts (types) | 465 | Types | D |
| 25 | required-fields.ts (types) | 460 | Types | D |
| 26 | CSVImportExport.tsx | 460 | Component | B |
| 27 | CreateTenantModal.tsx | 457 | Component | D |
| 28 | useHabitLogic.ts (分割後) | 456 | Hook | - (14.6.3で対応済み) |
| 29 | useLeadsViewModel.ts (分割後) | 456 | ViewModel | - (14.6.3で対応済み) |
| 30 | invite/[token]/page.tsx | 455 | Page | D |
| 31 | data-quality.ts | 452 | Core | B |
| 32 | EditTenantModal.tsx | 449 | Component | D |
| 33 | ProductsSection.tsx | 448 | Component | B |
| 34 | SADashboard.tsx | 446 | Component | D |
| 35 | WorkspaceMembersModal.tsx | 441 | Component | D |
| 36 | useZoomScriptViewModel.ts | 432 | ViewModel | A |
| 37 | google/tasks/route.ts | 432 | API | C |
| 38 | business-summary.ts | 425 | Core | B |
| 39 | api-utils.ts | 423 | Service | C |
| 40 | DepartmentsTab.tsx | 422 | Component | D |
| 41 | google/calendars/events/route.ts | 421 | API | C |
| 42 | status-master.ts (types) | 419 | Types | D |
| 43 | template-engine.ts | 417 | Core | B |
| 44 | UsersManagementTable.tsx | 416 | Component | D |
| 45 | action-recommender.ts | 415 | Core | B |
| 46 | ZoomScriptTab.tsx | 413 | Component | B |
| 47 | TodoCard.tsx | 412 | Component | B |
| 48 | LostProspectsSection.tsx | 409 | Component | B |
| 49 | JourneyFunnel.tsx | 405 | Report | B |
| 50 | encryption.ts | 401 | Service | C |
| 51 | tag-master.ts (types) | 400 | Types | D |

### テストファイル (分割対象外: 5ファイル)

| ファイル | 行数 | 備考 |
|---------|------|------|
| form-save.spec.ts | 545 | E2Eテスト - 許容 |
| action-map-crud.spec.ts | 526 | E2Eテスト - 許容 |
| api-analyze.spec.ts | 523 | E2Eテスト - 許容 |
| all-features.spec.ts | 455 | E2Eテスト - 許容 |

---

## 4並行ワーカー割り当て

### Worker A: ViewModel専任 (4ファイル)

**担当**: ViewModel系の分割
**総行数**: 2,288行
**所要時間目安**: 3-4時間

| # | ファイル | 行数 | 分割案 |
|---|---------|------|--------|
| 1 | useSADashboardViewModel.ts | 640 | CRUD / Stats / Filters |
| 2 | useBrandViewModel.ts | 636 | CRUD / Validation / Export |
| 3 | useLeanCanvasViewModel.ts | 608 | CRUD / Analysis / Export |
| 4 | useClientsViewModel.ts | 580 | 既存分割構造に追従 |
| 5 | useZoomScriptViewModel.ts | 432 | CRUD / Generation / Preview |

**実行コマンド**:
```bash
git worktree add ../.worktrees/phase14.6.4-worker-a -b phase14.6.4-worker-a
cd ../.worktrees/phase14.6.4-worker-a
```

---

### Worker B: Component + Core専任 (14ファイル)

**担当**: UIコンポーネントとCoreロジック
**総行数**: 5,737行
**所要時間目安**: 5-6時間

| # | ファイル | 行数 | 分割案 |
|---|---------|------|--------|
| 1 | validator.ts | 610 | field/ lead/ client/ common |
| 2 | UnifiedCSVSection.tsx | 589 | Import / Export / Preview |
| 3 | TemplateManager.tsx | 560 | List / Editor / Preview |
| 4 | HabitSlot.tsx | 489 | Display / Edit / Stats |
| 5 | okr.ts | 481 | types / calculations / utils |
| 6 | CSVImportExport.tsx | 460 | Import / Export / Mapping |
| 7 | data-quality.ts | 452 | rules / scoring / suggestions |
| 8 | ProductsSection.tsx | 448 | List / Form / Details |
| 9 | business-summary.ts | 425 | collectors / aggregators / formatters |
| 10 | template-engine.ts | 417 | parser / renderer / helpers |
| 11 | action-recommender.ts | 415 | rules / scoring / formatter |
| 12 | ZoomScriptTab.tsx | 413 | Viewer / Editor / Controls |
| 13 | TodoCard.tsx | 412 | Display / Actions / DragHandle |
| 14 | LostProspectsSection.tsx | 409 | List / Filters / Details |
| 15 | JourneyFunnel.tsx | 405 | Chart / Legend / Tooltip |

**実行コマンド**:
```bash
git worktree add ../.worktrees/phase14.6.4-worker-b -b phase14.6.4-worker-b
cd ../.worktrees/phase14.6.4-worker-b
```

---

### Worker C: Service + API専任 (12ファイル)

**担当**: バックエンドサービスとAPI
**総行数**: 5,329行
**所要時間目安**: 5-6時間

| # | ファイル | 行数 | 分割案 |
|---|---------|------|--------|
| 1 | sync-engine.ts | 592 | queue / processor / handlers |
| 2 | calendar-client.ts | 527 | auth / events / sync |
| 3 | google/sync/route.ts | 523 | GET / POST / handlers |
| 4 | data/route.ts | 520 | GET / PUT / validators |
| 5 | org-chart-service.ts | 499 | crud / tree / utils |
| 6 | sync-queue.ts | 480 | queue / worker / retry |
| 7 | google/tasks/sync/route.ts | 470 | sync / diff / apply |
| 8 | google/tasks/route.ts | 432 | GET / POST / DELETE |
| 9 | api-utils.ts | 423 | response / validation / error |
| 10 | google/calendars/events/route.ts | 421 | CRUD / sync / utils |
| 11 | encryption.ts | 401 | encrypt / decrypt / key-mgmt |

**実行コマンド**:
```bash
git worktree add ../.worktrees/phase14.6.4-worker-c -b phase14.6.4-worker-c
cd ../.worktrees/phase14.6.4-worker-c
```

---

### Worker D: Types + Admin Components専任 (14ファイル)

**担当**: 型定義とAdmin関連コンポーネント
**総行数**: 5,412行
**所要時間目安**: 4-5時間

| # | ファイル | 行数 | 分割案 |
|---|---------|------|--------|
| 1 | calendar.ts (types) | 598 | event / sync / google |
| 2 | TenantDetailModal.tsx | 507 | Info / Stats / Actions |
| 3 | emailCategories.tsx | 497 | categories / templates / utils |
| 4 | customer-journey.ts (types) | 473 | stage / action / analytics |
| 5 | template-variables.ts (types) | 465 | system / custom / computed |
| 6 | required-fields.ts (types) | 460 | lead / client / common |
| 7 | CreateTenantModal.tsx | 457 | Form / Validation / Submit |
| 8 | invite/[token]/page.tsx | 455 | Token / Form / Success |
| 9 | EditTenantModal.tsx | 449 | Form / Validation / Submit |
| 10 | SADashboard.tsx | 446 | Overview / Charts / Actions |
| 11 | WorkspaceMembersModal.tsx | 441 | List / Invite / Remove |
| 12 | DepartmentsTab.tsx | 422 | List / Form / Tree |
| 13 | status-master.ts (types) | 419 | lead / client / common |
| 14 | UsersManagementTable.tsx | 416 | Table / Actions / Filters |
| 15 | tag-master.ts (types) | 400 | lead / client / system |

**実行コマンド**:
```bash
git worktree add ../.worktrees/phase14.6.4-worker-d -b phase14.6.4-worker-d
cd ../.worktrees/phase14.6.4-worker-d
```

---

## 分割方針

### 1. ViewModel分割パターン

```
# Before
lib/hooks/useXxxViewModel.ts (600行)

# After
lib/hooks/xxx/
├── useXxxViewModel.ts      (~150行) 統合レイヤー
├── useXxxCRUD.ts           (~150行) 作成・更新・削除
├── useXxxFilters.ts        (~100行) フィルタ・ソート
├── useXxxExport.ts         (~100行) エクスポート
└── types.ts                (~50行)  内部型定義
```

### 2. Component分割パターン

```
# Before
components/xxx/XxxSection.tsx (500行)

# After
components/xxx/
├── XxxSection.tsx          (~100行) コンテナ
├── XxxList.tsx             (~150行) リスト表示
├── XxxForm.tsx             (~150行) フォーム
├── XxxDetails.tsx          (~100行) 詳細表示
└── hooks/useXxxSection.ts  (~50行)  セクション固有ロジック
```

### 3. Service分割パターン

```
# Before
lib/server/xxx-service.ts (500行)

# After
lib/server/xxx/
├── index.ts                (~50行)  エクスポート
├── xxx-service.ts          (~100行) ファサード
├── xxx-crud.ts             (~150行) CRUD操作
├── xxx-utils.ts            (~100行) ユーティリティ
└── types.ts                (~50行)  内部型
```

### 4. Types分割パターン

```
# Before
lib/types/xxx.ts (500行)

# After
lib/types/xxx/
├── index.ts                (~30行)  re-export
├── base.ts                 (~100行) 基本型
├── extended.ts             (~150行) 拡張型
├── guards.ts               (~100行) 型ガード
└── utils.ts                (~100行) 型ユーティリティ
```

### 5. API Route分割パターン

```
# Before
app/api/xxx/route.ts (500行)

# After
app/api/xxx/
├── route.ts                (~100行) ルートハンドラ
├── handlers/
│   ├── get.ts              (~100行) GET処理
│   ├── post.ts             (~100行) POST処理
│   └── delete.ts           (~100行) DELETE処理
└── utils.ts                (~50行)  共通ユーティリティ
```

---

## 実行手順

### Step 1: 事前準備 (全Worker共通)

```bash
# 1. masterを最新化
cd /Users/5dmgmt/プラグイン/foundersdirect
git checkout master
git pull origin master

# 2. Phase 14.6.3完了確認
git log --oneline -5  # 14.6.3のコミットがあることを確認

# 3. ビルド確認
npm run type-check
npm run build
```

### Step 2: 各Workerでworktree作成

```bash
# Worker A
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-a -b phase14.6.4-worker-a

# Worker B
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-b -b phase14.6.4-worker-b

# Worker C
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-c -b phase14.6.4-worker-c

# Worker D
git worktree add /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-d -b phase14.6.4-worker-d
```

### Step 3: 各Workerで作業実施

各Workerは以下のサイクルで作業:

```bash
# 1. ファイル分割
# 2. import更新
# 3. type-check
npm run type-check

# 4. 単体テスト
npm run test:unit -- --testPathPattern="分割したファイル名"

# 5. コミット
git add -A
git commit -m "refactor(phase14.6.4): split XXX into smaller modules"
```

### Step 4: 統合 (並行作業完了後)

```bash
# 1. Worker Aをmasterにマージ
git checkout master
git merge phase14.6.4-worker-a --no-ff -m "merge: phase14.6.4-worker-a"

# 2. Worker Bをリベース＆マージ
git checkout phase14.6.4-worker-b
git rebase master
git checkout master
git merge phase14.6.4-worker-b --no-ff -m "merge: phase14.6.4-worker-b"

# 3. Worker C, Dも同様に
git checkout phase14.6.4-worker-c
git rebase master
git checkout master
git merge phase14.6.4-worker-c --no-ff -m "merge: phase14.6.4-worker-c"

git checkout phase14.6.4-worker-d
git rebase master
git checkout master
git merge phase14.6.4-worker-d --no-ff -m "merge: phase14.6.4-worker-d"

# 4. 最終確認
npm run type-check
npm run build
npm run test
```

### Step 5: クリーンアップ

```bash
# worktree削除
git worktree remove /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-a
git worktree remove /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-b
git worktree remove /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-c
git worktree remove /Users/5dmgmt/.claude-worktrees/foundersdirect/phase14.6.4-worker-d

# ブランチ削除
git branch -d phase14.6.4-worker-a
git branch -d phase14.6.4-worker-b
git branch -d phase14.6.4-worker-c
git branch -d phase14.6.4-worker-d
```

---

## 分割優先度マトリクス

### 必須分割 (400行以上かつ複雑度高)

| ファイル | 理由 |
|---------|------|
| validator.ts | 多数のバリデーションルールが混在 |
| sync-engine.ts | 非同期処理が複雑 |
| calendar-client.ts | Google API統合が複雑 |
| okr.ts | 計算ロジックが多い |

### 推奨分割 (400行以上かつ複雑度中)

| ファイル | 理由 |
|---------|------|
| 各ViewModel | CRUD + フィルタ + エクスポートの混在 |
| 各Admin Component | 表示 + フォーム + アクションの混在 |
| API routes | 複数HTTPメソッドの処理 |

### 様子見 (400行以上だが安定)

| ファイル | 理由 |
|---------|------|
| Types定義ファイル | 型のみ、ロジックなし |
| E2Eテストファイル | テストは長くても問題なし |

---

## 品質チェックリスト

### 各ファイル分割後の確認

- [ ] 分割後の各ファイルが300行以下
- [ ] 循環参照がない
- [ ] 既存のimportパスが更新されている
- [ ] re-exportで後方互換性を維持
- [ ] type-checkが通る
- [ ] 関連するテストが通る

### 全体統合後の確認

- [ ] `npm run type-check` PASS
- [ ] `npm run build` PASS
- [ ] `npm run test:unit` PASS
- [ ] `npm run test:e2e` PASS (主要シナリオ)
- [ ] 本番デプロイ前のスモークテスト

---

## リスク管理

### コンフリクトリスク

| 組み合わせ | リスク | 対策 |
|-----------|--------|------|
| A + B | 低 | 担当ファイルが異なる |
| A + C | 低 | ViewModel vs Service |
| A + D | 低 | 担当領域が異なる |
| B + C | 中 | csv-utils と API が連携 |
| B + D | 低 | 担当領域が異なる |
| C + D | 低 | Service vs Types |

### コンフリクト発生時の対応

```bash
# 1. コンフリクト確認
git status

# 2. 両方の変更を確認
git diff --ours path/to/file
git diff --theirs path/to/file

# 3. 手動解決後
git add path/to/file
git rebase --continue
```

---

## 成功基準

### 定量指標

| 指標 | 目標値 |
|------|--------|
| 400行以上のファイル数 | 55 → 10以下 (テストファイル除く) |
| 平均ファイル行数 | 200行以下 |
| type-check時間 | 変化なし (±10%) |
| ビルド時間 | 変化なし (±10%) |

### 定性指標

- コードレビューが容易になる
- 単一ファイルの変更影響範囲が明確
- 新規メンバーの学習コスト低下

---

## 補足: 分割不要ファイルの判断基準

以下の条件を満たす場合は分割不要:

1. **型定義のみのファイル**: ロジックがなければ分割不要
2. **E2Eテストファイル**: シナリオの一貫性を重視
3. **設定ファイル**: 分割すると管理が複雑化
4. **単一責任のファイル**: 既に責任が明確な場合

---

## 次のフェーズ

Phase 14.6.4 完了後:
- Phase 14.6.5: 300-400行ファイルの監視ルール策定
- Phase 15: AI機能実装開始

---

**作成日**: 2025-12-02
**作成者**: Claude Code
**バージョン**: 1.0.0
