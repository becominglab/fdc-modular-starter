# Phase 12：OKR レイヤー実装（戦略レイヤー）v12.2

**Version:** 12.2
**Status:** ✅ 完了（2025-11-29）
**Claude Code 用ランブック**

---

## Phase 12 完了サマリ

**Phase 12 ✅ 完了（2025-11-29）**

| サブフェーズ | 状態 | 概要 |
|-------------|------|------|
| Phase 12-0 | ✅ 完了 | 設計ドキュメント作成・レビュー |
| Phase 12-1 | ✅ 完了 | 型定義・core拡張（Objective, KeyResult） |
| Phase 12-2 | ✅ 完了 | OKRTab基礎UI（ActionMapと同じ左右カラム） |
| Phase 12-3 | ✅ 完了 | KeyResult CRUD |
| Phase 12-4 | ✅ 完了 | KR↔ActionMap連携・ActionMapLinkModal |

**主要実装ファイル**:
- `lib/types/okr.ts` - Objective, KeyResult, ObjectiveScope 型定義
- `lib/core/okr.ts` - OKR CRUD・ロールアップ計算
- `lib/hooks/useOKRViewModel.ts` - OKR ViewModel
- `lib/hooks/useMVVViewModel.ts` - MVV専用ViewModel（OKRから分離）
- `app/_components/okr/OKRTab.tsx` - OKRタブ（左右カラム）
- `app/_components/okr/ObjectiveList.tsx` - Objective一覧（左サイドバー）
- `app/_components/okr/ObjectiveDetail.tsx` - Objective詳細 + KRリスト
- `app/_components/okr/ObjectiveForm.tsx` - Objectiveモーダル
- `app/_components/okr/KeyResultForm.tsx` - KRモーダル
- `app/_components/okr/ActionMapLinkModal.tsx` - KR↔AM連携モーダル

**削除されたレガシーファイル**:
- `lib/hooks/useMVVOKRViewModel.ts` - MVVとOKRの分離に伴い削除
- `app/_components/mvv/MVVTab.tsx` - 旧統合タブ削除
- `app/_components/mvv/MVVOKRTab.tsx` - 旧統合タブ削除

**三層構造完成**:
```
OKR（戦略）
  ↓ KR.linkedActionMapIds
Action Map（戦術）
  ↓ ActionItem.linkedTaskIds
TODO（実行）
```

---

## 0. 前提（必ず最初に読むファイル）

作業開始前に、必ず以下を読み込んでから処理を始めること：

**必読ドキュメント:**
- **DOCS/FDC-GRAND-GUIDE.md**
- **DOCS/HOW-TO-DEVELOP.md**
- **DOCS/PHASE9-ENCRYPTION-AND-API-RUNBOOK.md**（Phase 9完了が前提）
- **DOCS/PHASE10-TODO-ELASTIC-RUNBOOK.md**（Phase 10完了が前提）
- **DOCS/PHASE11-ACTION-MAP-RUNBOOK.md**（Phase 11完了が前提）

### Phase 9 & Phase 10 & Phase 11 完了確認（Phase 12 開始の前提条件）：

Phase 12 を開始する前に、以下が完了していることを確認すること：

**Phase 9 完了確認:**
- [ ] JWT認証が動作している（dev / 本番）
- [ ] 暗号化基盤が整備されている（Encryption Allocation Table確定）
- [ ] Performance Specification v1.0 が確定している
- [ ] workspace_data 250KB容量制限ポリシーが確定している

**Phase 10 完了確認:**
- [ ] 4象限ボード（TODO拡張）が動作している
  - 日本語ラベル併記（♠ 緊急かつ重要 / ♥ 重要なこと / ♦ 緊急なだけ / ♣ 未来創造）
- [ ] Googleカレンダー連携が動作している（インポート機能含む）
- [ ] Elastic Habits（松竹梅）が実装されている（ストリークカウンター含む）
- [ ] workspace_data が225KB以下（Phase 10完了時点）
- [ ] Phase 10のパフォーマンス基準を満たしている

**Phase 11 完了確認:**
- [ ] **Action Map CRUD が動作している**
- [ ] **Action Item ツリー構造が実装されている**
- [ ] **カンバンボードビューが動作している**（UX強化）
- [ ] **フォーカスモードが動作している**（UX強化）
- [ ] **TODO連携（生成/紐付け）が動作している**
- [ ] **進捗集計（TODO → ActionItem → ActionMap）が動作している**
- [ ] **Phase 11のE2Eテストが全てpass**
- [ ] **workspace_data が200KB以下推奨**（Phase 11完了時点）
- [ ] **Phase 11のパフォーマンス基準を満たしている**
  - Action Map タブ表示: P95 < 1.5秒
  - Action Item 進捗計算: P95 < 100ms
- [ ] **アーカイブ機能が実装されている**（容量制限対策）

**Phase 9 & 10 & 11 が未完了の場合は、Phase 12を開始しないこと。**

---

### 特に守るべきルール：

- **依存方向**：`js/core → js/tabs → js/main.ts` の一方向のみ。逆依存は禁止。
- **localStorage**：必ず `storage.js` 経由で扱う。直接 `localStorage.*` は使用しない。
- **DOM操作**：`DOM.get()` / `updateUI()` 等の既存ユーティリティ経由で行う。`document.*` 直呼びはしない。
- **既存 UI / SVG**：破壊的変更は禁止。レイアウトは維持し、必要最小限の追加・拡張のみ行う。

### フェーズ進行：

- Phase 12 は **12-x サブフェーズ単位**で進行する。
- 各サブフェーズごとに**レポートして一度停止し、人間の承認なしに次へ進まない**。

---

## 1. Phase 12 で実現する世界（全体ゴール）

### 1-1. 機能ゴール（全体概要）

本フェーズでは、FDC に **OKR 戦略レイヤー** を追加し、以下の三層構造を完成させる：

```
OKR（戦略）
  ↓ 紐付け
Action Map（戦術）
  ↓ 紐付け
TODO（実行）
```

- **Objective（目的）**：インパクトの大きい定性的な目標
- **Key Result（成果指標）**：Objective を数値的に測る定量指標
- **KR → Action Map 連携**：戦術プランと成果指標を接続
- **進捗ロールアップ**：TODO → Action Item → Action Map → KR → Objective の一気通貫

これにより、**「目的 → 手段 → 実行 → 成果」が1本の線でつながったプロダクト構造**が完成する。

### 1-2. 機能ゴール（経営層・管理職視点）

- **Objective / Key Result の設定**
  - 会社全体 / チーム / 個人のレベルで Objective を設定
  - 各 Objective に対して複数の Key Result を定義
  - KR は「手動入力」または「Action Map の進捗から自動計算」を選択可能

- **戦術との接続**
  - KR から Action Map を作成・紐付け
  - Action Map の進捗が KR の達成率に反映される
  - 「なぜこの Action Map をやっているのか」が明確になる

- **進捗の可視化**
  - Objective / KR の進捗バーをリアルタイム表示
  - 期間（Q1/Q2/Q3/Q4）別の OKR 一覧
  - Dashboard に「今期の OKR 進捗サマリ」を表示

### 1-3. 機能ゴール（メンバー視点）

- 自分が Owner / Contributor の OKR を一覧表示
- 日々の TODO が「どの KR につながっているか」を辿れる
- OKR → Action Map → TODO という構造を俯瞰できる

---

## 2. ドメイン設計（core レイヤーの拡張）

### 2-1. OKR の概念

Workspace 内で：

- **1 Workspace に複数の Objective** を持てる
- 各 Objective に**複数の Key Result**
- Key Result は**複数の Action Map** に紐づく（1:N）

#### 型イメージ（`core/okr.ts`）

```typescript
export type ObjectiveId = string;
export type KeyResultId = string;

export type ObjectiveScope = 'company' | 'team' | 'individual';

export type Objective = {
  id: ObjectiveId;
  title: string;              // 例: 「市場シェアを拡大し、業界リーダーになる」
  description?: string;

  scope: ObjectiveScope;      // 会社/チーム/個人
  ownerUserId: string;        // 責任者

  periodStart?: string;       // ISO日付（例：2025-01-01）
  periodEnd?: string;         // ISO日付（例：2025-03-31）

  progressRate?: number;      // 0〜100（配下KRから自動集計）
  status?: 'on_track' | 'at_risk' | 'off_track';

  createdAt: string;
  updatedAt: string;

  tagIds?: string[];          // レポート用途
};

export type KeyResult = {
  id: KeyResultId;
  objectiveId: ObjectiveId;

  title: string;              // 例: 「新規案件数を前年比150%に増やす」

  // 定量目標
  targetValue?: number;       // 例: 150
  currentValue?: number;      // 例: 120
  unit?: string;              // 例: "%", "件", "万円"

  // 定性目標（UX強化 v12.1）
  isQualitative?: boolean;    // Yes/No達成型KR
  isAchieved?: boolean;       // 定性KRの達成フラグ

  calcMethod: 'manual' | 'fromActionMaps'; // 手入力 or ActionMap連動で算出
  progressRate?: number;      // 0〜100

  // 戦術層との連携
  linkedActionMapIds?: string[];  // Phase 11 の ActionMap 型参照

  ownerUserId: string;        // KRオーナー（担当責任者）

  createdAt: string;
  updatedAt: string;
};
```

### 2-2. 保存先と容量分析

**保存場所**:
- **既存の `workspace_data` JSON 配下**に `objectives` / `keyResults` として追加
- **Phase 10 の容量制限 250KB** の中で収まる前提で設計
- 軽量化のため、大量の OKR は想定しない（1 Workspace あたり Objective 最大 50件、KR 最大 200件程度を目安）

**現状分析**（Phase 11完了時点）:
- `workspace_data` の平均サイズ: **計測必要**（Phase 12-0 で実施）
- 内訳想定:
  - `todos`: 推定 30-50 KB（500件想定）
  - `actionMaps`: 推定 20-40 KB（50件想定）
  - `actionItems`: 推定 15-30 KB（200件想定）
  - その他メタデータ: 推定 10-20 KB
  - **合計推定**: 75-140 KB

**Phase 12 追加容量見積もり**:
- Objective 50件 × 500 bytes/件 ≒ 25 KB
- KeyResult 200件 × 400 bytes/件 ≒ 80 KB
- **Phase 12 追加合計**: 105 KB

**容量チェック**:
- Phase 12-0 で以下を実施:
  1. 全 Workspace の現在の `workspace_data` サイズを計測
  2. 最大・平均・P95 サイズを算出
  3. 250KB 制限に対する余裕を確認（推奨: 現状 + Phase12 追加 < 200KB）
  4. 超過リスクがある場合は、Phase 12-1 で軽量化策を検討
     - 例: 古い Objective のアーカイブ機能
     - 例: KR の linkedActionMapIds を別テーブル化

### 2-2-2. 容量・ライフサイクルポリシー（Phase 12 正式仕様）

**workspace_data JSON の容量目標**:
- **通常運用時**: 200KB以下（推奨）
- **ハード上限**: 250KB（絶対制約、Phase 10〜11から継承）

**アーカイブポリシー（Phase 12）**:
- **Objective**: 期間終了後90日経過したものをアーカイブ対象
- **アーカイブ時の動作**:
  - アーカイブされた Objective はデフォルト非表示
  - 「過去のOKR」「アーカイブ一覧」フィルタから表示・復元可能
  - 配下の KeyResult も連動してアーカイブ
  - アーカイブデータは将来的に workspace_data から分離

**データ最適化（上限値・Phase 12 必須実装）**:

| データ種別 | フィールド | 上限値 | 超過時の動作 |
|-----------|-----------|--------|-------------|
| KeyResult | linkedActionMapIds | 10件 | UI警告「1つのKRに紐づけられるAction Mapは最大10件までです」、保存不可 |
| KeyResult | title | 200文字 | UI警告「タイトルは200文字以内にしてください」、保存不可 |
| Objective | description | 1000文字 | UI警告「説明は1000文字以内にしてください」、保存不可 |
| Objective | title | 150文字 | UI警告、保存不可 |

**Phase 10, 11 のデータ最適化も併せて適用**:
- Task.subTasks: 10件
- Task.title: 200文字
- ActionItem.linkedTaskIds: 20件
- ActionItem.description: 500文字

**将来的な選択肢（Phase 13以降で検討）**:
Phase 11 と同様の選択肢を保持（IndexedDB移行、ストレージ分離、DB移行等）

**Phase 12-0 での判断**:
- 250KB上限は維持（Phase 10, 11 と同じハード制約）
- 必須対策: ① アーカイブ機能、② データ最適化（上限値を仕様化）
- Phase 11 のアーカイブポリシーとの連携（ActionMapアーカイブ時、紐づくKRも考慮）

### 2-3. 参照構造（改訂版：N:M 対応）

#### 基本構造

```
Objective (1)
  ├─ KeyResult (N)
  │    └─ ActionMap (N:M) ← 1つのActionMapが複数のKRに貢献する可能性
  │         └─ ActionItem (1:N)
  │              └─ Task (TODO) (1:N)
```

#### N:M 関係の理由

実務では、**1つのActionMapが複数のKRに貢献するケース**が頻繁に発生する。

**例1: 営業強化プラン**
- 同じ「営業強化プラン」ActionMap が以下の複数KRに貢献:
  - KR1「新規リード数150%増」
  - KR2「商談転換率20%向上」
  - KR3「平均案件サイズ30%増」

**例2: 採用強化プラン**
- 同じ「採用強化プラン」ActionMap が:
  - KR1「営業チーム5名増員」
  - KR2「エンジニアチーム3名増員」

#### 実装方針

- **KR側から参照**: `KeyResult.linkedActionMapIds: string[]`
- **ActionMap側からは逆引きしない**: 計算時に全KRを走査（パフォーマンス影響は軽微）
- **Phase 12-4 で実装**: 「1つのActionMapを複数KRに紐付け可能」とする
- **UI/UX**:
  - KR詳細画面: 「このKRに紐づくActionMap一覧」を表示
  - ActionMap詳細画面: 「このActionMapが貢献しているKR一覧」を逆引き表示

#### 参照整合性の保証

- ActionMap削除時: 全KRの `linkedActionMapIds` から該当IDを自動削除
- KR削除時: 紐づくActionMapは削除しない（他のKRでも使われている可能性）
- 実装場所: `js/core/okr.ts` - `unlinkActionMapFromAllKRs()`

この一本の線で**戦略から実行まで追跡可能**にする。

---

## 3. 進捗ロールアップ（Rollup Logic）

### 3-1. Task → Action Item → Action Map（Phase 11 で実装済み）

```typescript
// Phase 11 で実装済み
Task 完了率 → ActionItem.progressRate
ActionItem.progressRate → ActionMap.progressRate（平均）
```

### 3-2. Action Map → KR progress

KR の `calcMethod` が `"fromActionMaps"` の場合：

```typescript
function computeKRProgress(kr: KeyResult, actionMaps: ActionMap[]): number {
  const linked = actionMaps.filter(am => kr.linkedActionMapIds?.includes(am.id));
  if (linked.length === 0) return 0;

  const totalProgress = linked.reduce((sum, am) => sum + (am.progressRate || 0), 0);
  return Math.round(totalProgress / linked.length);
}
```

### 3-3. 手動 KR の扱い

KR の `calcMethod` が `"manual"` の場合：

```typescript
kr.progressRate = Math.round((kr.currentValue / kr.targetValue) * 100);
```

- ユーザーが `currentValue` を手動更新する
- `targetValue` に対する達成率が `progressRate` になる

### 3-3-1. 定性的なマイルストーン（Yes/No型KR）（UX強化 v12.1）

すべてが数値化できるわけではないため、**Yes/No達成型KR**をサポートする：

```typescript
// 定性KRの進捗計算
function computeQualitativeKRProgress(kr: KeyResult): number {
  if (!kr.isQualitative) return kr.progressRate || 0;
  return kr.isAchieved ? 100 : 0;
}
```

**UIでの表示**:
- 定性KRには「達成」ボタンを表示（トグル）
- 達成時は 100%、未達成時は 0%

**使用例**:
- 「新規市場参入の意思決定を完了する」→ Yes/No
- 「セキュリティ監査を完了する」→ Yes/No
- 「新製品ローンチを完了する」→ Yes/No

### 3-4. KR → Objective progress

```typescript
function computeObjectiveProgress(objective: Objective, keyResults: KeyResult[]): number {
  const krs = keyResults.filter(kr => kr.objectiveId === objective.id);
  if (krs.length === 0) return 0;

  const totalProgress = krs.reduce((sum, kr) => sum + (kr.progressRate || 0), 0);
  return Math.round(totalProgress / krs.length);
}
```

### 3-5. ステータス自動判定（Objective）

```typescript
function computeObjectiveStatus(progressRate: number, periodEnd: string): Objective['status'] {
  const now = new Date();
  const end = new Date(periodEnd);
  const daysLeft = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (progressRate >= 70) return 'on_track';
  if (progressRate >= 40 && daysLeft > 7) return 'on_track';
  if (progressRate < 40 && daysLeft < 14) return 'off_track';
  return 'at_risk';
}
```

### 3-5-1. 手動リスクフラグ設定（UX強化 v12.1）

数字だけでは見えない問題を上司が早期に把握できるよう、**手動でのリスクフラグ設定**を可能にする：

```typescript
export type Objective = {
  // ...existing fields
  manualRiskFlag?: boolean;           // 手動リスクフラグ
  manualRiskReason?: string;          // リスク理由（最大200文字）
};

// ステータス計算（手動フラグを考慮）
function computeObjectiveStatusWithManualFlag(
  objective: Objective,
  progressRate: number,
  periodEnd: string
): Objective['status'] {
  // 手動リスクフラグがONの場合は常に 'at_risk' を返す
  if (objective.manualRiskFlag) return 'at_risk';

  return computeObjectiveStatus(progressRate, periodEnd);
}
```

**UIでの表示**:
```
┌─────────────────────────────────────────────────┐
│ 🎯 市場シェア拡大                               │
│ 進捗: ████████░░ 75%   ステータス: 🟢 on_track  │
│                                                 │
│ ⚠️ 手動リスクフラグ: [ON] [OFF]                 │
│ 理由: 主要顧客Aとの契約更新が難航中            │
└─────────────────────────────────────────────────┘
```

### 3-6. ロールアップ処理の実装方針

#### タイミング

**即時更新**（ユーザー操作時）:
- Task完了 → ActionItem.progressRate 更新（即座）
- ActionItem更新 → ActionMap.progressRate 更新（即座）

**遅延更新**（KR/Objective）:
- ActionMap更新 → KR.progressRate は**保存時に再計算**（debounce 500ms）
- KR更新 → Objective.progressRate は**保存時に再計算**（debounce 500ms）

#### パフォーマンス対策

- **ロールアップは差分更新のみ**（全体走査しない）
- **影響範囲**: 変更されたActionMapに紐づくKRのみ
- **計算量**: O(K) where K = 紐づくKRの数（通常1〜3件、最大10件想定）
- **バッチ処理不要**: リアルタイム更新で十分（250KB制限内では性能問題なし）

#### 実装場所

**ファイル**: `js/core/okr.ts`

**関数**:
```typescript
// ActionMap 更新時に呼び出す
export function rollupKRProgress(actionMapId: string): void {
  const affectedKRs = findKRsByActionMapId(actionMapId);
  affectedKRs.forEach(kr => {
    if (kr.calcMethod === 'fromActionMaps') {
      kr.progressRate = computeKRProgress(kr, getAllActionMaps());
      kr.updatedAt = new Date().toISOString();
    }
  });
  saveWorkspaceData();
}

// KR 更新時に呼び出す
export function rollupObjectiveProgress(objectiveId: string): void {
  const objective = getObjectiveById(objectiveId);
  const allKRs = getAllKeyResults();
  objective.progressRate = computeObjectiveProgress(objective, allKRs);
  objective.status = computeObjectiveStatusWithManualFlag(objective, objective.progressRate, objective.periodEnd);
  objective.updatedAt = new Date().toISOString();
  saveWorkspaceData();
}
```

**呼び出し元**:
- `tabs/action-map.ts` - ActionMap 保存時に `rollupKRProgress()` を呼ぶ
- `tabs/okr.ts` - KR 保存時に `rollupObjectiveProgress()` を呼ぶ

#### エラーハンドリング

- ActionMapが削除済みの場合: スキップ（エラーにしない）
- KRが削除済みの場合: スキップ
- 計算エラー時: ログ記録 + 前回の progressRate を維持

---

## 4. UI / UX 設計（OKR タブ）

### 4-1. タブ構成

- **既存タブ**：Dash / Leads / Clients / Reports / TODO / Action Map / Settings...
- **新たに OKR タブを追加**（`js/tabs/okr.ts` 想定）

### 4-2. OKR タブのレイアウト

#### レイアウトモック（ASCII Art）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OKR タブ                                              [+ 新規Objective作成]  │
├─────────────┬───────────────────────┬───────────────────────────────────────┤
│ 📅 期間     │ Objective 一覧        │ Objective 詳細                        │
│             │                       │                                       │
│ [全期間]    │ 🎯 市場シェア拡大     │ 🎯 市場シェア拡大                     │
│ [Q1 2025]   │ 🟢 75% on_track      │ 説明: 業界トップ3入りを目指す         │
│ [Q2 2025]   │ スコープ: company     │ スコープ: company                    │
│ [Q3 2025]   │ Owner: 山田太郎       │ Owner: 山田太郎                      │
│ [Q4 2025]   │ 2025-01 〜 2025-03   │ 期間: 2025-01-01 ~ 2025-03-31        │
│ [年間 2025] │ ████████░░ 75%       │ 進捗: ████████░░ 75%                │
│ [カスタム]  │                       │ ステータス: 🟢 on_track              │
│             │ 🎯 営業力強化         │                                       │
│ [+ 作成]    │ 🟡 40% at_risk       │ ⚠️ リスクフラグ: [OFF]                │
│             │ ⚠️ リスクフラグON     │                                       │
│             │ スコープ: team        │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│             │ Owner: 鈴木花子       │ Key Results (3)       [+ KR追加]     │
│             │ 2025-01 〜 2025-03   │                                       │
│             │ ████░░░░░░ 40%       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR1: 新規案件数150%増 (数値型)   │ │
│             │ 🎯 コスト最適化       │ │ 目標: 150 / 現在: 120 (件)       │ │
│             │ 🔴 20% off_track     │ │ 計算: 自動（ActionMapから）      │ │
│             │ スコープ: individual  │ │ 進捗: ████████░░ 80%            │ │
│             │ Owner: 佐藤次郎       │ │ 連携ActionMap: 2件               │ │
│             │ 2025-01 〜 2025-03   │ │ [編集] [削除] [AM作成] [AMリンク] │ │
│             │ ██░░░░░░░░ 20%       │ └──────────────────────────────────┘ │
│             │                       │                                       │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR2: 商談転換率20%向上 (数値型)  │ │
│             │                       │ │ 目標: 20 / 現在: 15 (%)          │ │
│             │                       │ │ 計算: 手動入力                   │ │
│             │                       │ │ 進捗: ███████░░░ 75%            │ │
│             │                       │ │ 連携ActionMap: 1件               │ │
│             │                       │ │ [編集] [削除] [AM作成] [AMリンク] │ │
│             │                       │ └──────────────────────────────────┘ │
│             │                       │                                       │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR3: セキュリティ監査完了 (Y/N型)│ │
│             │                       │ │ タイプ: Yes/No達成型             │ │
│             │                       │ │ 達成状況: ✅ 達成済み            │ │
│             │                       │ │ 進捗: ██████████ 100%           │ │
│             │                       │ │ [編集] [削除]                    │ │
│             │                       │ └──────────────────────────────────┘ │
│             │                       │                                       │
│             │                       │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│             │                       │ 振り返りコメント（期間終了後）        │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ ## 何がうまくいったか             │ │
│             │                       │ │ - リード獲得は目標超過            │ │
│             │                       │ │                                  │ │
│             │                       │ │ ## 課題                          │ │
│             │                       │ │ - 商談転換率が低迷                │ │
│             │                       │ │                                  │ │
│             │                       │ │ ## 次への改善点                   │ │
│             │                       │ │ - 商談スキル研修を実施予定        │ │
│             │                       │ └──────────────────────────────────┘ │
└─────────────┴───────────────────────┴───────────────────────────────────────┘
```

#### 左カラム：期間フィルタ（UX強化 v12.1）

- 「**全期間**」「**Q1**」「**Q2**」「**Q3**」「**Q4**」などのフィルタボタン
- **「年間」ビュー**（UX強化）: 4四半期を俯瞰できるビュー
- **「カスタム期間」**（UX強化）: 任意の日付範囲を指定可能
- 選択した期間内の Objective のみを表示
- 現在の四半期をデフォルト選択

#### 中央カラム：Objective 一覧

- タイトル、スコープ（会社/チーム/個人）、進捗バー、ステータス（🟢 on_track / 🟡 at_risk / 🔴 off_track）
- **手動リスクフラグ表示**（⚠️マーク）（UX強化）
- Owner名、期間（YYYY-MM 形式）
- クリックで右カラムに詳細を表示
- ソート: 進捗率降順（デフォルト）、作成日順、期限順を選択可能

#### 右カラム：Objective 詳細

- **上部**：Objective 情報
  - タイトル、説明、スコープ、オーナー、期間
  - 進捗バー（配下 KR の平均）
  - ステータスバッジ（🟢🟡🔴）
  - **手動リスクフラグ設定**（UX強化）

- **中央**：Key Result 一覧（カード形式）
  - タイトル
  - **KRタイプ表示**（数値型 / Yes/No型）（UX強化）
  - targetValue / currentValue / unit（数値型の場合）
  - **達成ボタン**（Yes/No型の場合）（UX強化）
  - calcMethod（手動 / 自動）
  - 紐づく ActionMap の個数とステータス
  - 進捗バー
  - 編集／削除／ActionMap作成／ActionMapリンク ボタン

- **下部**：振り返りコメント欄（UX強化 v12.1）
  - **構造化された振り返りフォーム**:
    - 「何がうまくいったか」
    - 「課題」
    - 「次への改善点」
  - Markdown 対応
  - 期間終了後に入力を促すリマインダー

### 4-3. KR → Action Map 連携操作

KR の行に以下のボタンを配置：

- **「Action Map を作成」ボタン**
  - クリックすると Action Map 新規作成モーダル（タイトル初期値は KR タイトル）
  - 作成後、自動的に `KR.linkedActionMapIds` に追加

- **「Action Map をリンク」ボタン**
  - 既存の ActionMap 一覧から選択
  - 選択した ActionMap を `KR.linkedActionMapIds` に追加

### 4-4. Action Map 側の表示

- Action Map タブの Action Map 詳細に「**関連 KR**」セクションを追加
- この Action Map が紐づいている KR のタイトルとリンクを表示
- クリックで OKR タブの該当 Objective/KR に遷移

### 4-5. OKRテンプレート機能（UX強化 v12.1）

初めてOKRを導入する組織向けに、**よくある目標パターンを選んで開始**できる機能：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OKRテンプレートを選択                                        [✕ 閉じる]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 💼 営業・売上                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 売上拡大                                                                │ │
│ │ Obj: 売上を前年比XXX%に成長させる                                       │ │
│ │ KR1: 新規案件数をX件獲得                                               │ │
│ │ KR2: 平均案件単価をX%向上                                              │ │
│ │ KR3: 既存顧客からの売上をX%増加                                        │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 👥 採用・人事                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 採用強化                                                                │ │
│ │ Obj: 優秀な人材を確保し、チームを強化する                               │ │
│ │ KR1: X名の新規採用を完了                                               │ │
│ │ KR2: 採用リードタイムをX日以内に短縮                                   │ │
│ │ KR3: 入社後90日離職率をX%以下に維持                                    │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 🛠️ プロダクト・開発                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ プロダクト品質向上                                                      │ │
│ │ Obj: ユーザー満足度を高め、プロダクトの競争力を強化する                 │ │
│ │ KR1: NPS（顧客推奨度）をX点以上に向上                                  │ │
│ │ KR2: 重大バグ発生件数をX件以下に削減                                   │ │
│ │ KR3: 新機能リリース数をX件達成                                         │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 📊 カスタム                                                                 │
│ [空白から作成]                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**テンプレートカテゴリ**:
- 営業・売上
- 採用・人事
- プロダクト・開発
- マーケティング
- カスタマーサクセス
- 財務・管理

### 4-6. 週次/月次のOKR進捗メールサマリー（UX強化 v12.1 オプション）

能動的にログインしなくても進捗を把握できるよう、**進捗サマリーの通知機能**を実装：

```typescript
type OKRSummaryNotification = {
  frequency: 'weekly' | 'monthly' | 'none';
  dayOfWeek?: number;        // 週次の場合: 0(日)〜6(土)
  dayOfMonth?: number;       // 月次の場合: 1〜28
  recipients: string[];      // 通知先（Owner + 任意の追加メンバー）
};
```

**通知内容**:
- 自分がOwnerのObjective/KRの進捗サマリー
- 自分にアサインされたActionItemの進捗
- リスクフラグがONのObjective一覧
- 期限が近いKR一覧

**実装優先度**: Phase 12-7 以降でオプション実装（本番運用開始後のフィードバックに基づく）

---

## 5. 権限・ロール

### OKR の CRUD 権限

| 操作 | 権限 |
|------|------|
| **Objective の作成** | `isManager` / `isAdmin` |
| **Objective の編集** | `owner` または `isAdmin` |
| **Objective の削除** | `owner` または `isAdmin` |
| **KR の作成** | Objective の `owner` または `isAdmin` |
| **KR の編集** | KR の `owner` または `isAdmin` |
| **KR の進捗手動更新** | KR の `owner` または `isAdmin` |
| **KR → ActionMap 連携** | `isManager` / `isAdmin` |
| **閲覧** | 同一 Workspace メンバー全員 |

### Action Map 側

- Phase 11 の権限ルールを踏襲
- Action Map が KR に紐づいている場合、KR の owner も Action Map の進捗を閲覧可能（編集は不可）

---

## 6. Phase 12 サブフェーズ構成案

Phase 10, 11 のパターンに合わせて、Phase 12 も **12-0〜** で刻みます。

### 12-0：PHASE12-OKR-DESIGN（設計ドキュメント作成）

**目的**：OKR レイヤーの全体像を1つのドキュメントに整理し、実装前にレビューを受ける。

**成果物**：`DOCS/PHASE12-OKR-DESIGN.md`

**必須セクション**:

#### 1. 用語定義
- Objective, Key Result, Scope, Owner, Progress の定義
- 具体例を3つ以上含める（営業、開発、人事など異なる部門）
- OKR と Action Map / TODO の関係性を図示

#### 2. データモデル
- Objective型, KeyResult型の最終版（TypeScript 型定義）
  - **定性KR（Yes/No型）のフィールドを含む**（UX強化）
  - **手動リスクフラグのフィールドを含む**（UX強化）
- workspace_data への追加構造（JSON形式で例示）
  ```json
  {
    "objectives": [
      {
        "id": "obj_001",
        "title": "市場シェア拡大",
        "manualRiskFlag": false,
        ...
      }
    ],
    "keyResults": [
      {
        "id": "kr_001",
        "objectiveId": "obj_001",
        "linkedActionMapIds": ["am_001", "am_002"],
        "isQualitative": false,
        ...
      },
      {
        "id": "kr_002",
        "objectiveId": "obj_001",
        "isQualitative": true,
        "isAchieved": true,
        ...
      }
    ]
  }
  ```
- 既存データとの互換性保証（Phase 11 以前のデータが壊れないこと）

#### 3. ロールアップ計算ポリシー
- 手動KR / 自動KR / **定性KR** の計算式（擬似コード）
- 更新タイミング（即時 / 遅延、debounce 時間）
- エッジケース処理:
  - 紐づくActionMapが0件の場合
  - ActionMap削除時の整合性
  - KR削除時の影響範囲

#### 4. ActionMap 連携ルール
- **1:N or N:M の判断理由**を明記
- 紐付けUI/UXフロー（ステップバイステップ）
- 削除時の整合性保証ルール
- 逆引き表示の仕様

#### 5. 権限ポリシー
- CRUD権限マトリクス:

  | 操作 | OWNER | ADMIN | MEMBER |
  |------|-------|-------|--------|
  | Objective作成 | ✓ | ✓ | ✗ |
  | Objective編集（自分） | ✓ | ✓ | ✗ |
  | Objective編集（他人） | ✓ | ✗ | ✗ |
  | KR作成 | ✓ | ✓（自分のObj） | ✗ |
  | ... | ... | ... | ... |

- RLS との統合方針

#### 6. UI/UX モック
- OKRタブの3カラムレイアウト（ASCII art または画像）
- **カスタム期間フィルタ**（UX強化）
- **手動リスクフラグUI**（UX強化）
- **定性KR（Yes/No型）のUI**（UX強化）
- **OKRテンプレート選択画面**（UX強化）
- **構造化された振り返りフォーム**（UX強化）
- Dashboard OKRウィジェット
- Action Map側の「関連KR」セクション
- モーダル・フォームの詳細（入力項目・バリデーション）

#### 7. 容量見積もり
- 現状の workspace_data サイズ（Phase 12-0 で計測）
  - 最大・平均・P95 サイズ
  - Workspace別の内訳
- Phase 12 追加容量:
  - Objective 50件: 25 KB
  - KeyResult 200件: 80 KB
  - 合計: 105 KB
- 250KB制限への影響:
  - 現状 + Phase12 追加 < 200KB であることを確認
  - 超過リスクがある場合の軽量化策（アーカイブ、別テーブル化等）

#### 8. 非機能要件
- パフォーマンス目標:
  - ロールアップ処理: P95 < 100ms
  - OKRタブ初回表示: P95 < 1.5秒
  - Dashboard OKRウィジェット: P95 < 800ms
- セキュリティ:
  - RLS との統合（どのユーザーがどのOKRを見られるか）
  - 監査ログ（誰がいつOKRを変更したか）

#### 9. 実装スコープの明確化
- Phase 12 で実装する機能（Must Have）
  - OKR CRUD
  - KR ↔ ActionMap 連携
  - **定性KR（Yes/No型）**（UX強化）
  - **手動リスクフラグ**（UX強化）
  - **OKRテンプレート**（UX強化）
  - **構造化された振り返りフォーム**（UX強化）
  - **カスタム期間フィルタ**（UX強化）
- Phase 13 以降に延期する機能（Nice to Have）
  - 週次/月次のメールサマリー通知
  - 過去OKRの検索・分析機能
  - OKRの複製機能

#### 10. リスク・懸念事項
- 想定される技術的課題
- ユーザー受容性（OKRを使ってもらえるか）
- 他フェーズとの依存関係

**完了条件**:
- [ ] 上記10セクションをすべて記載
- [ ] レビュー承認を得ること
- [ ] 設計に対する質問・懸念がゼロになること
- [ ] 次フェーズ（12-1）の実装が明確にイメージできること

**コード変更は禁止**。レポート後、承認を待つ。

---

### 12-1：core 拡張（Objective / KeyResult 型・保存）

**目的**：OKR を `workspace_data` に安全に載せる。

**対象**：

- `js/core/state.ts`（WorkspaceData 型拡張）
- `js/core/okr.ts`（新規ファイル）
- `js/core/storage.js`（読み書き対応）

**作業**：

- `WorkspaceData` に `objectives: Objective[]`、`keyResults: KeyResult[]` を追加
- **定性KRフィールド**（`isQualitative`, `isAchieved`）を含める
- **手動リスクフラグフィールド**（`manualRiskFlag`, `manualRiskReason`）を含める
- ロード時に旧データでもエラーにならないようフォールバック
- 基本的な CRUD 関数を `okr.ts` に実装
  - `createObjective()`, `updateObjective()`, `deleteObjective()`
  - `createKeyResult()`, `updateKeyResult()`, `deleteKeyResult()`
  - `computeKRProgress()`, `computeObjectiveProgress()`
  - `computeQualitativeKRProgress()`（定性KR用）

---

### 12-2：OKR タブ基礎実装（UI/UX 基盤）

**目的**：OKR タブの CRUD と、Objective/KR の一覧・詳細を行う UI の土台を作る。

**対象**：

- `js/tabs/okr.ts`（新規）
- 対応 HTML / Tab 切り替え

**要点**：

- 左に期間フィルタ（**カスタム期間対応**）、中央に Objective 一覧、右に Objective 詳細の**3カラム**
- Objective の：
  - 新規作成モーダル（タイトル・スコープ・期間・説明）
  - **OKRテンプレート選択機能**（UX強化）
  - 編集・削除
  - **手動リスクフラグ設定**（UX強化）
- KR の一覧表示（まだ Action Map 連携は後回し）

---

### 12-3：Key Result CRUD

**目的**：KR の追加・編集・削除を完全に機能させる。

**対象**：

- `js/tabs/okr.ts`（KR 編集モーダル）

**要点**：

- KR の追加ボタン（Objective 詳細内）
- KR 編集モーダル：
  - タイトル
  - **KRタイプ選択**（数値型 / Yes/No型）（UX強化）
  - targetValue / currentValue / unit（数値型の場合）
  - **達成トグル**（Yes/No型の場合）（UX強化）
  - calcMethod（手動 / 自動）の切り替え
- KR の削除（確認ダイアログあり）
- KR の進捗バー表示

---

### 12-4：KR ↔ Action Map 連携

**目的**：KR から Action Map を作成・紐付けし、双方向参照を実現する。

**対象**：

- `js/tabs/okr.ts`（KR 詳細に Action Map 連携ボタン）
- `js/tabs/action-map.ts`（Action Map 詳細に「関連 KR」セクション追加）

**要点**：

- KR の行に：
  - 「Action Map を作成」ボタン
  - 「Action Map をリンク」ボタン
- KR から Action Map 作成時：
  - タイトル初期値を KR タイトルにする
  - `ActionMap.ownerUserId` は KR の `ownerUserId` と同じにする
  - 作成後、`KR.linkedActionMapIds` に追加
- 既存 Action Map を紐付け時：
  - 現在の Workspace 内の Action Map 一覧から選択
  - 選択した ActionMap の id を `KR.linkedActionMapIds` に push
- Action Map 側：
  - Action Map 詳細に「関連 KR」セクションを表示
  - 紐づいている KR のタイトルとリンクを表示

---

### 12-5：ロールアップ実装

**目的**：Task → ActionItem → ActionMap → KR → Objective の一連の進捗計算を実装する。

**対象**：

- `js/core/okr.ts`（ロールアップ関数）
- `js/tabs/okr.ts`（進捗表示の更新）
- `js/tabs/action-map.ts`（Action Map 更新時に KR も更新）

**要点**：

- イベントドリブンで実行：
  - Task 完了時 → Action Item の進捗を再計算
  - Action Item 更新時 → Action Map の進捗を再計算
  - Action Map 更新時 → 紐づく KR の進捗を再計算（`calcMethod === 'fromActionMaps'` の場合のみ）
  - KR 更新時 → Objective の進捗を再計算
- **定性KRの進捗計算**（Yes/No型）
- **手動リスクフラグを考慮したステータス計算**
- UI リフレッシュ：
  - 進捗バーを即座に更新
  - ステータスバッジも自動更新

---

### 12-6：Dashboard 連携（OKRサマリウィジェット）＋振り返り機能

**目的**：Dashboard に「今期の OKR 進捗」を表示し、振り返り機能を実装する。

**対象**：

- `js/tabs/dashboard.ts`（OKR ウィジェット追加）
- `js/tabs/okr.ts`（振り返りフォーム）

**要点**：

- 「**今期のOKR進捗**」ウィジェット
  - 自分が owner の Objective / KR を集約表示
  - 進捗バー
  - ステータス（on_track / at_risk / off_track）のカウント
  - 「詳細を見る」リンクで OKR タブに遷移
- **構造化された振り返りフォーム**（UX強化）
  - 「何がうまくいったか」
  - 「課題」
  - 「次への改善点」
  - Markdown 対応

---

### 12-7：E2E テスト & 回帰確認

**目的**：OKR → Action Map → TODO の一連の流れが壊れていないことを確認。

#### テストシナリオ

**シナリオ1: ハッピーパス（自動KR連携）**

1. 経営層（OWNER権限）が Objective を作成
   - タイトル：「Q1 新規リード 10件獲得」
   - スコープ: company
   - 期間: 2025-01-01 〜 2025-03-31
2. Objective に KR を追加
   - タイトル：「新規案件数を150%に増やす」
   - targetValue: 150, unit: "件"
   - calcMethod: `fromActionMaps`
3. KR から Action Map を作成
   - タイトル：「テレアポ強化プラン」
   - 自動的に KR.linkedActionMapIds に追加される
4. Action Map に Action Item を追加（担当者：部下A）
5. Action Item から TODO を作成（♠ 緊急かつ重要 30分ブロック）
6. 部下Aが TODO を完了
7. **検証**:
   - Action Item の進捗が更新される（100%）
   - Action Map の進捗が更新される（100%）
   - KR の進捗が更新される（100%、calcMethod: `fromActionMaps` のため）
   - Objective の進捗が更新される（100%）
   - Dashboard の OKR ウィジェットに反映される

**シナリオ2: 手動KR**

1. ADMIN が Objective を作成（スコープ: team）
2. KR を作成:
   - calcMethod: `manual`
   - targetValue: 100, currentValue: 0
3. **検証**: progressRate = 0%
4. currentValue を 50 に更新
5. **検証**: progressRate = 50%
6. currentValue を 75 に更新
7. **検証**: progressRate = 75%

**シナリオ3: 定性KR（Yes/No型）（UX強化）**

1. Objective を作成
2. KR を作成:
   - isQualitative: true
   - タイトル: 「セキュリティ監査を完了する」
3. **検証**: progressRate = 0%、達成ボタンが表示される
4. 達成ボタンをクリック
5. **検証**:
   - isAchieved = true
   - progressRate = 100%
   - Objective の進捗が更新される

**シナリオ4: 手動リスクフラグ（UX強化）**

1. Objective を作成（progressRate = 80%、自動ステータス = on_track）
2. 手動リスクフラグをONにする
3. リスク理由を入力：「主要顧客Aとの契約更新が難航中」
4. **検証**:
   - ステータスが 'at_risk' に変更される（progressRateは80%のまま）
   - 一覧に⚠️マークが表示される

**シナリオ5: OKRテンプレート使用（UX強化）**

1. 「新規Objective作成」をクリック
2. 「テンプレートから作成」を選択
3. 「営業・売上」カテゴリから「売上拡大」を選択
4. **検証**:
   - Objective が作成される（タイトル: 売上を前年比XXX%に成長させる）
   - KR が3つ自動作成される
   - 各フィールドは編集可能な状態

**シナリオ6: ActionMap削除時の整合性**

1. KR に ActionMap を紐付け（linkedActionMapIds: ["am_001"]）
2. ActionMap "am_001" を削除
3. **検証**:
   - KR.linkedActionMapIds から "am_001" が自動削除される
   - KR.progressRate が再計算される（紐づくActionMapが0件の場合は0%）
   - エラーが発生しない

**シナリオ7: N:M 関係（1つのActionMapが複数KRに貢献）**

1. Objective "営業強化" を作成
2. KR1 "リード150%増" を作成（calcMethod: `fromActionMaps`）
3. KR2 "転換率20%向上" を作成（calcMethod: `fromActionMaps`）
4. ActionMap "営業強化プラン" を作成
5. ActionMap を KR1 と KR2 の**両方**にリンク
6. ActionMap の進捗を 80% に更新
7. **検証**:
   - KR1.progressRate = 80%
   - KR2.progressRate = 80%
   - Objective.progressRate = 80%（KR1とKR2の平均）

**シナリオ8: 権限チェック**

1. MEMBER ロールでログイン
2. Objective 作成を試みる
3. **検証**: 403エラーまたは「権限がありません」メッセージ
4. ADMIN ロールでログイン
5. Objective 作成
6. **検証**: 成功
7. 他人（別ADMIN）の Objective を編集しようとする
8. **検証**: 403エラー
9. OWNER ロールでログイン
10. 他人の Objective を編集
11. **検証**: 成功

**シナリオ9: 容量オーバーテスト**

1. Objective を 50 件作成（制限ギリギリ）
2. **検証**: 成功
3. Objective を 51 件目作成しようとする
4. **検証**:
   - エラーメッセージ表示「Objective は最大 50 件までです」
   - 既存データが破損していない
   - workspace_data サイズが 250KB を超えていない

**シナリオ10: ロールアップパフォーマンス**

1. 1つの Objective に KR を 10 件作成
2. 各 KR に ActionMap を 3 件ずつリンク（合計 30 件のActionMap）
3. 1つの ActionMap の進捗を更新
4. **検証**:
   - ロールアップ処理が 100ms 以内に完了（P95）
   - UI がフリーズしない
   - 正しい KR のみが更新される（他のKRは変更されない）

**シナリオ11: 構造化された振り返り（UX強化）**

1. Objective の期間を過去に設定（期間終了済み）
2. 振り返りフォームを開く
3. 各セクション（何がうまくいったか / 課題 / 次への改善点）に入力
4. **検証**:
   - Markdown形式で保存される
   - 再度開いた時に内容が表示される

**シナリオ12: カスタム期間フィルタ（UX強化）**

1. 左カラムで「カスタム」期間を選択
2. 任意の日付範囲を入力（例: 2025-02-01 〜 2025-05-31）
3. **検証**: 指定した期間に重なるObjectiveのみが表示される

**シナリオ13: 既存機能の回帰テスト**

Phase 10, 11 の主要E2Eテストを再実行:
- [ ] TODO作成・完了・削除（日本語ラベル表示確認）
- [ ] Action Map作成・編集・削除
- [ ] カンバンボードビュー操作
- [ ] フォーカスモード操作
- [ ] Action Item の TODO 連携
- [ ] Leads / Clients CRUD
- [ ] Reports 生成
- [ ] Workspace 切り替え
- [ ] 権限チェック（OWNER / ADMIN / MEMBER）

**すべてのテストが Phase 12 実装後も pass すること**

#### E2Eテスト実装

**ファイル**: `tests/e2e/okr.spec.ts`

**必須テストケース**:
- ✅ Objective CRUD
- ✅ KeyResult CRUD
- ✅ **定性KR（Yes/No型）操作**（UX強化）
- ✅ **手動リスクフラグ操作**（UX強化）
- ✅ **OKRテンプレート使用**（UX強化）
- ✅ **構造化された振り返り入力**（UX強化）
- ✅ **カスタム期間フィルタ**（UX強化）
- ✅ KR ↔ ActionMap 連携
- ✅ 自動KRのロールアップ
- ✅ 手動KRの進捗計算
- ✅ 権限チェック
- ✅ 容量制限チェック
- ✅ ActionMap削除時の整合性
- ✅ Dashboard OKRウィジェット表示

**テスト実行**:
```bash
npm run test:e2e -- okr.spec.ts
```

**合格基準**: すべてのテストが pass すること

---

## 7. 進め方の共通パターン（全サブフェーズで徹底）

各サブフェーズ（12-0 / 12-1 / …）は、必ず次の順で行う：

1. **Design（設計）**
   対象ファイルと変更内容をテキストで整理（この段階ではコードを書かない）。

2. **Implement（実装）**
   `core → tabs → main` と既存ルールを守りながら、差分を実装。

3. **Test（テスト）**
   手動テスト＋関連テスト（E2E / unit）があれば実行し、必要なら修正。

4. **Refine（微調整）**
   UIの違和感、型の不整合などを最小限の修正で整える。

5. **Report（レポート & STOP）**
   - サブフェーズ番号（例：12-3）
   - 変更ファイルと主な差分（可能なら行番号）
   - 設計意図と理由
   - 影響範囲
   - テスト内容と結果
   - 残課題・次サブフェーズへの引き継ぎ

   をテキストで報告し、**必ず一度停止する**。

---

## 8. 依存関係（Dependency）

- **Phase 11 の Action Map 構造が 前提条件**
  - `ActionMap` / `ActionItem` 型が既に定義されていること
  - Action Map タブが機能していること
  - Action Item → TODO の紐付けが動作していること
- **Task 進捗が Action Item へ反映されることが 前提条件**
  - Phase 11-4 で実装済み
- **Performance Spec v1.0 の PC前提設計を踏襲する**
  - 250KB の容量制限内で運用

---

## 9. 非機能要件（NFR）

- **容量**：
  - OKR 合計で最大 200 件を想定（軽量 JSON）
  - Objective 最大 50件、KR 最大 200件
- **パフォーマンス**：
  - ロールアップ処理は **100ms 以下（P95）**
  - ActionMap / TODO との連携部分は**差分更新**（フル走査しない）
- **互換性**：
  - 旧データ（OKR フィールドがないもの）を読み込んでもエラーにならないこと

---

## 10. UX強化機能サマリー（v12.1 追加）

Phase 12 で実装する UX 強化機能の一覧：

| # | 機能 | 対象サブフェーズ | 効果 |
|---|------|-----------------|------|
| 1 | OKRテンプレート機能 | 12-2 | 初めてOKRを導入する組織の負担軽減 |
| 2 | 手動リスクフラグ | 12-2, 12-5 | 数字だけでは見えない問題を早期把握 |
| 3 | 定性KR（Yes/No型） | 12-3 | 数値化できない目標への対応 |
| 4 | カスタム期間フィルタ | 12-2 | 四半期をまたぐOKRの確認 |
| 5 | 構造化された振り返りフォーム | 12-6 | 振り返りの質向上、ナレッジ蓄積 |
| 6 | 週次/月次メールサマリー（オプション） | 12-7以降 | 受動的な進捗把握 |

---

## 11. まとめ

- **Phase 10**：TODO（時間＆実行レイヤー）
- **Phase 11**：Action Map（上司→部下の戦術レイヤー）
- **Phase 12**：OKR（戦略レイヤー）

という積み上げにより、**「戦略 → 戦術 → 実行 → 成果」が1本の線でつながったプロダクト構造**が完成する。

- `core/state` に Objective/KeyResult を追加し、Action Map と id で参照連携する
- UI は：
  - **OKR タブ**：戦略の設定・進捗確認
    - **OKRテンプレート**（UX強化）
    - **手動リスクフラグ**（UX強化）
    - **定性KR**（UX強化）
    - **構造化された振り返り**（UX強化）
  - **Action Map タブ**：戦術の設計・指示・進捗確認
  - **TODO タブ**：実行・日程管理
  - **Dashboard**：OKR サマリの可視化
- 実装は **12-0〜12-7** のサブフェーズで、**Design → Implement → Test → Refine → Report** の型を踏襲する

---

## 12. Phase 12 完了基準（DOD）

Phase 12 は以下をすべて満たした時点で完了とする。Phase 12 は全Phase（9〜12）の最終段階であり、本番運用可能な状態になる。

### 必須項目（本番運用開始の前提条件）

- ✅ **機能実装完了**
  - Objective / Key Result CRUD
  - **OKRテンプレート機能**（UX強化）
  - **定性KR（Yes/No型）**（UX強化）
  - **手動リスクフラグ**（UX強化）
  - **カスタム期間フィルタ**（UX強化）
  - **構造化された振り返りフォーム**（UX強化）
  - KR ↔ ActionMap 連携（N:M対応）
  - 自動KR（ActionMapから計算）と手動KR の両方が動作
  - ロールアップ処理（Task → ActionItem → ActionMap → KR → Objective）
  - Dashboard OKRウィジェット

- ✅ **E2Eテスト全てpass**
  - `tests/e2e/okr.spec.ts` が全て成功
  - 既存機能の回帰テストが全て成功（Phase 9〜11の全機能）
  - **統合E2Eテスト**: OKR → Action Map → TODO の一気通貫テスト成功

- ✅ **workspace_data が容量制限内**
  - Phase 12完了時点の実測値: **250KB以下**（ハード上限）
  - 推奨: **200KB以下**（80%以内）
  - 超過している場合は**アーカイブ機能を強化**（Phase 12-0で判断、12-7までに実装）
  - Objective / KR アーカイブポリシー実装済み（期間終了後90日で自動アーカイブ）

- ✅ **パフォーマンス基準を満たす（必須）**
  - ロールアップ処理（OKR進捗計算）: **P95 < 100ms**
  - OKRタブ初回表示: **P95 < 1.5秒**
  - Dashboard OKRウィジェット: **P95 < 800ms**
  - **Phase 9〜11の基準もすべて維持**:
    - 初回Dashboard表示: P95 < 2.0s
    - 4象限ボード表示: P95 < 1.2s
    - Action Map タブ表示: P95 < 1.5s

- ✅ **コード品質基準を満たす**
  - HOW-TO-DEVELOP.md の基本ルール違反: 0件
  - 依存方向（core → tabs → main）遵守
  - localStorage 直接アクセス: 0件
  - Phase 9〜12 全体でのコード統一性確保

- ✅ **既存機能に破壊的変更がない**
  - Leads / Clients / Reports が正常動作
  - Phase 10 TODO機能が正常動作
  - Phase 11 Action Map機能が正常動作
  - Workspace 切替・メンバー管理が正常動作

### 本番運用への引き継ぎ事項
- workspace_data 容量実測値（Phase 12完了時点）
- 全Phaseのパフォーマンス計測結果
- アーカイブ戦略の実装状況
- 監視・アラート設定（Phase 9で定義したモニタリングベースライン）

**重要:** パフォーマンス基準、容量制限、E2Eテストのいずれかを満たさない場合は Phase 12 未完了とする。全基準を満たすまで改善を継続する。

---

## 13. Claude Code への運用上のお願い

1. **サブフェーズ単位で必ず止まること**
   例：「12-4 まで完了しました。差分とテスト結果を報告するので、次に進めてよいか判断してください。」

2. **差分ベースで実装すること**
   ファイル丸ごと書き換えではなく、必要な箇所だけを変更する。

3. **テストを軽視しないこと**
   少なくとも OKR / Action Map / TODO 関連の E2E が通っているかを確認する。
   落ちた場合は原因と修正案をレポートに含める。

4. **Design → Implement → Test → Refine → Report の順番を必ず守ること**
   設計をテキストで出し、人間の目で確認してから、一気に実装しない。

---

## 14. 横断的UX機能（Phase 10-12 共通）

Phase 12 完了時点で、以下の横断的UX機能の実装状況を確認すること：

### 14-1. クイックツアー/オンボーディング機能

各タブに初回アクセス時のガイド表示を実装（Phase 12-7 で統合）：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👋 OKRタブへようこそ！                                         [スキップ]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ OKRは「目的（Objective）」と「成果指標（Key Result）」で                   │
│ チームの目標を管理するフレームワークです。                                  │
│                                                                             │
│ 📝 ステップ1: Objectiveを作成しましょう                                    │
│ 📊 ステップ2: Key Resultを追加しましょう                                   │
│ 🔗 ステップ3: Action Mapと連携しましょう                                   │
│                                                                             │
│                                          [ツアーを開始] [後で見る]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14-2. グローバル検索

OKR/Action Map/TODOを横断検索（Phase 13以降で検討）：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 検索: テレアポ                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📋 TODO                                                                     │
│   - [♠] テレアポ実施 (01/21 09:00-09:30)                                   │
│   - [♠] テレアポ実施 (01/22 09:00-09:30)                                   │
│                                                                             │
│ 📊 Action Item                                                              │
│   - 毎日30分テレアポ実施 (Q1 新規リード獲得プラン)                          │
│   - テレアポリスト作成 (Q1 新規リード獲得プラン)                            │
│                                                                             │
│ 🎯 Key Result                                                               │
│   - 新規リード数150%増 (市場シェア拡大)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14-3. 通知センター

期限切れ、進捗停滞、アサイン変更などをまとめて表示（Phase 13以降で検討）：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔔 通知 (5件)                                                   [すべて既読] │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔴 期限切れ: リード品質チェック (3日超過)                       10分前      │
│ 🟡 期限注意: 30分テレアポ実施 (残り5日)                        1時間前     │
│ 📝 アサイン: 商談資料作成 があなたにアサインされました          3時間前     │
│ ✅ 完了: テレアポリスト作成 が完了しました                      昨日        │
│ ⚠️ リスク: 営業力強化 にリスクフラグが設定されました            昨日        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14-4. ショートカットキー

OKR→Action Map→TODO間のナビゲーション高速化（Phase 12-7 で実装）：

| ショートカット | 機能 |
|---------------|------|
| `g o` | OKRタブに移動 |
| `g a` | Action Mapタブに移動 |
| `g t` | TODOタブに移動 |
| `g d` | Dashboardに移動 |
| `n` | 新規作成（現在のタブに応じて） |
| `/` | 検索を開く |
| `?` | ショートカット一覧を表示 |

---

**以上、Phase 12 OKR レイヤー実装ランブック v12.1**
