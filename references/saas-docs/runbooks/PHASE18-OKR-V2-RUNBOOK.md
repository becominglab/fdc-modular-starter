# Phase 18: OKR v2 ランブック

## 概要

**目的**: OKR のロジック見直し。KR と ActionMap の連携を強化し、進捗の自動集計を実現。

**責務**: 戦略層 + 進捗計算オーケストレーション

---

## ★ 実装方針（UI活用・ロジック刷新）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  既存UI活用 + ロジックはゼロベースで実装                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【活用するUI（変更不要）】                                                  │
│  ├── OKRTab.tsx                ... 左右2カラムレイアウト                    │
│  ├── ObjectiveList.tsx         ... Objective一覧表示                        │
│  ├── ObjectiveDetail.tsx       ... Objective詳細 + KR表示                   │
│  ├── ObjectiveForm.tsx         ... Objective作成/編集                       │
│  └── ActionMapLinkModal.tsx    ... KR↔ActionMapリンク                       │
│                                                                             │
│  【変更が必要なUI】                                                          │
│  ├── KeyResultForm.tsx         ... calcMethod選択を非表示化（固定）          │
│  └── ObjectiveDetail.tsx       ... 進捗表示の更新（軽微）                    │
│                                                                             │
│  【新規実装（ロジック）】                                                     │
│  ├── ProgressService（中核）                                                │
│  ├── KR進捗の自動計算（ActionMap経由のみ）                                   │
│  └── Objective進捗のロールアップ                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 現状実装との差分

| 機能 | 現状 | 本ランブック | 対応 |
|------|------|-------------|------|
| Objective CRUD | ✅ 実装済み | そのまま活用 | - |
| KeyResult CRUD | ✅ 実装済み | そのまま活用 | - |
| KR→ActionMapリンク | ✅ 実装済み | そのまま活用 | - |
| calcMethod: manual | ✅ 実装済み | **廃止** | UI非表示 |
| calcMethod: fromActionMaps | ✅ 実装済み | **必須化** | ロジック |
| ProgressService | ❌ 未実装 | **新規追加** | 中核ロジック |

### 既存Hook活用

```typescript
// 既存（活用）
import { useOKRViewModel } from '@/lib/hooks/okr/useOKRViewModel';
import { useObjectiveCRUD } from '@/lib/hooks/okr/useObjectiveCRUD';
import { useKeyResultCRUD } from '@/lib/hooks/okr/useKeyResultCRUD';
import { useOKRProgress } from '@/lib/hooks/okr/useOKRProgress';

// 新規追加
import { ProgressService } from '@/lib/services/progress/ProgressService';
```

### KR直結廃止の詳細

```
【現状】
KR.calcMethod = 'manual' | 'fromActionMaps'
  ├── manual: currentValue / targetValue で手動計算
  └── fromActionMaps: リンクされたActionMapの平均進捗

【変更後】
KR.calcMethod = 'fromActionMaps' のみ（固定）
  ├── すべてのKRはActionMap経由で進捗を計算
  ├── シンプルなKRには「SkeletonActionMap」を自動生成
  └── 手動入力が必要な場合は ActionItem の完了状態で管理
```

---

## 設計決定事項（Phase 16-17-18 共通）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. KR直結型は廃止 → ActionMap経由に統一                                     │
│    ・すべてのKRはActionMap経由で進捗を計算                                   │
│    ・シンプルなKRには Phase 17 が「スケルトンActionMap」を自動生成            │
│                                                                             │
│ 2. 進捗伝播は同期（Phase 18 がオーケストレーション）                          │
│                                                                             │
│ 3. 責務分担:                                                                │
│    ・Phase 16: タスク完了 → イベント発火（onTaskCompleted）                 │
│    ・Phase 17: ActionMap進捗計算 + スケルトンActionMap生成                   │
│    ・Phase 18: 進捗伝播オーケストレーション + KR/Objective計算 ★ここ         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 並行開発ガイド

### Phase 18 の独立開発範囲

Phase 18 は以下を **Phase 16/17 と独立して** 開発可能：

| 機能 | 依存関係 | 備考 |
|-----|---------|------|
| okr_objectives テーブル | なし | 独立して作成可能 |
| okr_key_results テーブル | なし | 独立して作成可能 |
| okr_periods テーブル | なし | 独立して作成可能 |
| kr_action_map_links テーブル | なし | 独立して作成可能 |
| kr_progress_logs テーブル | なし | 独立して作成可能 |
| KR/Objective CRUD | なし | 独立して実装可能 |
| ProgressService（モック） | なし | Phase 16/17 をモックして単体テスト可能 |

### Phase 18 が提供する ProgressService

**★ Phase 18 の中核責務**: 進捗伝播のオーケストレーション

```typescript
// lib/services/progress/ProgressService.ts

/**
 * ProgressService - 進捗計算の中央集約点
 *
 * Phase 16/17 からのイベントを受け取り、進捗伝播を実行する。
 * すべての進捗計算ロジックはここに集約される。
 */
class ProgressService {
  /**
   * タスク完了からの進捗伝播（Phase 16 から呼び出される）
   *
   * 処理フロー:
   * 1. task_links からリンクされた ActionItem を取得
   * 2. ActionItem の進捗を再計算
   * 3. ActionMap の進捗を再計算
   * 4. KR の進捗を再計算
   * 5. Objective の進捗を再計算
   */
  async propagateProgressFromTask(taskId: string): Promise<void> {
    // 1. リンクされた ActionItem を取得
    const { data: links } = await supabase
      .from('task_links')
      .select('target_id')
      .eq('task_id', taskId);

    if (!links || links.length === 0) return;

    // 2. 各 ActionItem から進捗を伝播
    for (const link of links) {
      await this.propagateFromActionItem(link.target_id);
    }
  }

  /**
   * ActionItem からの進捗伝播
   */
  async propagateFromActionItem(actionItemId: string): Promise<void> {
    // 1. ActionItem の進捗を計算
    const itemProgress = await this.recalculateActionItemProgress(actionItemId);

    // 2. ActionItem を更新
    await supabase
      .from('action_items')
      .update({ progress_rate: itemProgress, updated_at: new Date() })
      .eq('id', actionItemId);

    // 3. 親 ActionItem があれば再帰的に処理
    const { data: item } = await supabase
      .from('action_items')
      .select('action_map_id, parent_item_id')
      .eq('id', actionItemId)
      .single();

    if (item?.parent_item_id) {
      await this.propagateFromActionItem(item.parent_item_id);
    }

    // 4. ActionMap の進捗を更新
    if (item?.action_map_id) {
      await this.propagateFromActionMap(item.action_map_id);
    }
  }

  /**
   * ActionMap からの進捗伝播
   */
  async propagateFromActionMap(actionMapId: string): Promise<void> {
    // 1. ActionMap の進捗を計算（Phase 17 の関数を呼び出し）
    const mapProgress = await calculateActionMapProgress(actionMapId);

    // 2. ActionMap を更新
    await supabase
      .from('action_maps')
      .update({ progress_rate: mapProgress, updated_at: new Date() })
      .eq('id', actionMapId);

    // 3. この ActionMap にリンクされた KR を取得
    const { data: krLinks } = await supabase
      .from('kr_action_map_links')
      .select('key_result_id, weight')
      .eq('action_map_id', actionMapId);

    if (!krLinks || krLinks.length === 0) return;

    // 4. 各 KR の進捗を更新
    for (const link of krLinks) {
      await this.propagateFromKeyResult(link.key_result_id);
    }
  }

  /**
   * KR からの進捗伝播
   */
  async propagateFromKeyResult(keyResultId: string): Promise<void> {
    // 1. KR の進捗を計算
    const krProgress = await this.recalculateKeyResultProgress(keyResultId);

    // 2. KR を更新
    const { data: kr } = await supabase
      .from('okr_key_results')
      .select('objective_id, progress_rate')
      .eq('id', keyResultId)
      .single();

    const previousProgress = kr?.progress_rate || 0;

    await supabase
      .from('okr_key_results')
      .update({ progress_rate: krProgress, updated_at: new Date() })
      .eq('id', keyResultId);

    // 3. 進捗履歴を記録
    await supabase
      .from('kr_progress_logs')
      .insert({
        key_result_id: keyResultId,
        previous_progress: previousProgress,
        new_progress: krProgress,
        change_type: 'auto_calculated',
      });

    // 4. Objective の進捗を更新
    if (kr?.objective_id) {
      await this.propagateFromObjective(kr.objective_id);
    }
  }

  /**
   * Objective の進捗計算
   */
  async propagateFromObjective(objectiveId: string): Promise<void> {
    const objProgress = await this.recalculateObjectiveProgress(objectiveId);

    await supabase
      .from('okr_objectives')
      .update({ progress_rate: objProgress, updated_at: new Date() })
      .eq('id', objectiveId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 進捗計算ロジック
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ActionItem の進捗計算
   * - リンクされたタスクの完了率から計算
   */
  async recalculateActionItemProgress(actionItemId: string): Promise<number> {
    const { data: links } = await supabase
      .from('task_links')
      .select('task_id')
      .eq('target_id', actionItemId);

    if (!links || links.length === 0) return 0;

    const taskIds = links.map(l => l.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .in('id', taskIds)
      .is('trashed_at', null);

    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.status === 'done').length || 0;

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /**
   * KR の進捗計算
   * - リンクされた ActionMap の重み付け平均
   */
  async recalculateKeyResultProgress(keyResultId: string): Promise<number> {
    const { data: links } = await supabase
      .from('kr_action_map_links')
      .select(`
        weight,
        action_map:action_maps(progress_rate)
      `)
      .eq('key_result_id', keyResultId);

    if (!links || links.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const link of links) {
      const progress = link.action_map?.progress_rate || 0;
      const weight = link.weight || 1.0;
      weightedSum += progress * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Objective の進捗計算
   * - 子 KR の重み付け平均
   */
  async recalculateObjectiveProgress(objectiveId: string): Promise<number> {
    const { data: krs } = await supabase
      .from('okr_key_results')
      .select('progress_rate, weight')
      .eq('objective_id', objectiveId);

    if (!krs || krs.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const kr of krs) {
      const weight = kr.weight || 1.0;
      weightedSum += (kr.progress_rate || 0) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }
}

// シングルトンとしてエクスポート
export const progressService = new ProgressService();
```

### 他 Phase との接点（インターフェース契約）

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Phase 18 が受け取るイベント（Phase 16/17 から）
// ═══════════════════════════════════════════════════════════════════════════

// Phase 16 から: タスク完了時
interface TaskCompletedEvent {
  taskId: string;
  workspaceId: number;
  userId: number;
  completedAt: string;
  actualMinutes: number;
  linkedActionItemIds: string[];
}

// Phase 17 から: ActionMap 進捗更新時
interface ActionMapProgressUpdatedEvent {
  actionMapId: string;
  workspaceId: number;
  newProgressRate: number;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 18 が呼び出す関数（Phase 17 が実装）
// ═══════════════════════════════════════════════════════════════════════════

// ActionMap 進捗計算（Phase 17 が実装）
declare function calculateActionMapProgress(actionMapId: string): Promise<number>;

// スケルトン ActionMap 生成（Phase 17 が実装）
declare function createSkeletonActionMap(req: {
  workspaceId: number;
  keyResultId: string;
  title: string;
}): Promise<{ actionMapId: string; actionItemId: string }>;
```

### 開発・テスト戦略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Phase 18 開発フロー                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DB テーブル作成（独立）                                                   │
│     - okr_objectives, okr_key_results, okr_periods                         │
│     - kr_action_map_links, kr_progress_logs                                │
│     - 単体テスト: CRUD 操作                                                  │
│                                                                             │
│  2. OKR 管理機能実装（独立）                                                  │
│     - Objective/KR の作成・編集・削除                                        │
│     - 期間管理                                                               │
│     - 単体テスト: OKR 操作                                                   │
│                                                                             │
│  3. ProgressService 実装（モック使用）                                        │
│     - Phase 17 の calculateActionMapProgress() をモック                     │
│     - 進捗計算ロジックの単体テスト                                            │
│     - 伝播チェーンの単体テスト                                                │
│                                                                             │
│  4. スケルトン ActionMap 連携（Phase 17 と結合後）                            │
│     - KR 作成時にスケルトン ActionMap を自動生成                              │
│     - 統合テスト                                                             │
│                                                                             │
│  5. E2E テスト（Phase 16/17/18 全結合後）                                     │
│     - Task完了 → ActionItem → ActionMap → KR → Objective                   │
│     - 進捗伝播の全経路検証                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 16-17-18 連携全体図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3層アーキテクチャ完全連携図                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【戦略層】Phase 18: OKR v2                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌──────────┐   1:N   ┌──────────┐                                 │   │
│  │  │Objective │────────▶│KeyResult │                                 │   │
│  │  │ (目標)   │         │ (成果指標)│                                 │   │
│  │  └──────────┘         └────┬─────┘                                 │   │
│  │       ▲                    │                                        │   │
│  │       │ 進捗               │ N:M                                    │   │
│  │       │ ロールアップ        │ kr_action_map_links                    │   │
│  │       │                    ▼                                        │   │
│  └───────┼────────────────────┼────────────────────────────────────────┘   │
│          │                    │                                            │
│  ┌───────┼────────────────────┼────────────────────────────────────────┐   │
│  │       │     【戦術層】Phase 17: ActionMap v2                        │   │
│  │       │                    ▼                                        │   │
│  │       │            ┌──────────┐   1:N   ┌──────────┐               │   │
│  │       │            │ActionMap │────────▶│ActionItem│               │   │
│  │       │            │(戦術計画) │         │(実行項目) │               │   │
│  │       │            └──────────┘         └────┬─────┘               │   │
│  │       │                  ▲                   │                      │   │
│  │       │ 進捗             │ 進捗              │ task_links           │   │
│  │       │ ロールアップ      │ ロールアップ       │ (疎結合)             │   │
│  │       │                  │                   ▼                      │   │
│  └───────┼──────────────────┼───────────────────┼──────────────────────┘   │
│          │                  │                   │                          │
│  ┌───────┼──────────────────┼───────────────────┼──────────────────────┐   │
│  │       │                  │  【実行層】Phase 16: Task System v4       │   │
│  │       │                  │                   ▼                      │   │
│  │       │                  │           ┌──────────┐                  │   │
│  │       └──────────────────┴───────────│  Tasks   │                  │   │
│  │                                      │(タスク/習慣)│                  │   │
│  │                                      └────┬─────┘                  │   │
│  │                                           │ 完了                    │   │
│  │                                           ▼                        │   │
│  │                                    ┌──────────┐                    │   │
│  │                                    │task_logs │                    │   │
│  │                                    │(完了履歴) │                    │   │
│  │                                    └──────────┘                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 新機能

### 1. KR ↔ ActionMap 連携強化

**現状の問題**:
- KR の `linkedActionMapIds` は配列で N:M 関係を表現しているが、更新が煩雑
- 進捗計算が手動 or 未実装

**解決策**:
- `kr_action_map_links` 中間テーブルで N:M を正規化
- 重み付け（weight）で貢献度を調整可能に
- ActionMap 完了時に自動で KR 進捗を更新

### 2. 進捗履歴の記録

**現状の問題**:
- KR の進捗変更履歴がない
- 振り返りができない

**解決策**:
- `kr_progress_logs` テーブルで履歴を記録
- グラフ表示で進捗推移を可視化

### 3. OKR 期間管理の改善

**現状の問題**:
- 四半期/年度の期間管理が弱い

**解決策**:
- `okr_periods` テーブルで期間を一元管理
- 期間別フィルタリング
- 期間クローズ時の振り返りフロー

---

## DBスキーマ設計

### 新規テーブル

#### okr_periods（期間管理）

```sql
CREATE TABLE okr_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  title TEXT NOT NULL,  -- 'Q1 2025', 'FY2025' など
  period_type TEXT NOT NULL
    CHECK (period_type IN ('quarterly', 'yearly', 'custom')),

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planning', 'active', 'closed')),

  -- 振り返り
  retrospective_notes TEXT,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_okr_periods_workspace ON okr_periods(workspace_id, status);
CREATE INDEX idx_okr_periods_dates ON okr_periods(start_date, end_date);
```

#### okr_objectives（v2: 期間参照追加）

```sql
-- 既存テーブルに追加
ALTER TABLE okr_objectives ADD COLUMN period_id UUID REFERENCES okr_periods(id);
ALTER TABLE okr_objectives ADD COLUMN parent_objective_id UUID REFERENCES okr_objectives(id);
  -- 会社OKR → チームOKR → 個人OKR の階層化
```

#### okr_key_results（v2: ActionMap経由に統一）

```sql
-- ★ 設計決定: KR直結型廃止、ActionMap経由のみ
-- calc_method は廃止し、すべての KR は ActionMap 経由で進捗計算
-- シンプルな KR には「スケルトン ActionMap」を自動生成（Phase 17）

ALTER TABLE okr_key_results ADD COLUMN weight DECIMAL(3,2) DEFAULT 1.00;
  -- Objective 内での KR の重み付け（合計が1.00になるよう正規化）

-- 既存の calc_method カラムがある場合は削除
-- ALTER TABLE okr_key_results DROP COLUMN IF EXISTS calc_method;
```

**進捗計算方式（統一ルール）:**

| 方式 | 説明 |
|------|------|
| ActionMap経由 | すべてのKRはActionMap経由で進捗を計算 |
| スケルトンActionMap | シンプルなKRには1ActionMap + 1ActionItemを自動生成 |
| 手動入力 | manual_value カラムで手動オーバーライド可能 |

**バリデーション（ワークスペース整合性のみ）:**

```typescript
// KR ↔ ActionMap リンク時のバリデーション
async function validateKRActionMapLink(krId: string, actionMapId: string): Promise<void> {
  // ワークスペース整合性チェックのみ
  const { data: kr } = await supabase
    .from('okr_key_results')
    .select('objective:okr_objectives(workspace_id)')
    .eq('id', krId)
    .single();

  const { data: actionMap } = await supabase
    .from('action_maps')
    .select('workspace_id')
    .eq('id', actionMapId)
    .single();

  if (kr?.objective?.workspace_id !== actionMap?.workspace_id) {
    throw new ValidationError(
      'WORKSPACE_MISMATCH',
      'KRとActionMapのワークスペースが一致しません'
    );
  }
}
```

#### okr_objectives / okr_key_results に楽観ロック追加

```sql
-- 楽観ロック用 version カラム
ALTER TABLE okr_objectives ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE okr_key_results ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- トリガーは Phase 17 で定義した check_version_and_increment() を再利用
CREATE TRIGGER trg_okr_objectives_version
  BEFORE UPDATE ON okr_objectives
  FOR EACH ROW
  WHEN (NEW.version != OLD.version)
  EXECUTE FUNCTION check_version_and_increment();

CREATE TRIGGER trg_okr_key_results_version
  BEFORE UPDATE ON okr_key_results
  FOR EACH ROW
  WHEN (NEW.version != OLD.version)
  EXECUTE FUNCTION check_version_and_increment();
```

#### kr_progress_logs（進捗履歴）

```sql
CREATE TABLE kr_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_result_id UUID NOT NULL REFERENCES okr_key_results(id) ON DELETE CASCADE,

  -- Snapshot
  previous_value DECIMAL(12,2),
  new_value DECIMAL(12,2),
  previous_progress DECIMAL(5,2),
  new_progress DECIMAL(5,2),

  -- Change info
  -- ★ 設計決定: KR直結廃止のため from_task は削除
  change_type TEXT NOT NULL
    CHECK (change_type IN ('manual', 'auto_calculated', 'system')),
  change_source_id UUID,  -- action_map_id (参考情報)
  change_note TEXT,

  -- User
  changed_by_user_id INTEGER REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kr_progress_logs_kr ON kr_progress_logs(key_result_id, created_at DESC);
```

---

## 進捗計算ロジック

### 計算フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           進捗計算フロー                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. タスク完了                                                               │
│  ┌─────────────┐                                                            │
│  │ Task.status │ = 'done'                                                   │
│  │ = 'done'    │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         ▼ onTaskCompleted()                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. task_links 検索                                                   │   │
│  │    SELECT * FROM task_links WHERE task_id = $1                       │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼ propagateProgressUpdate()                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. ActionItem 進捗更新                                               │   │
│  │    - 紐づくタスクの完了率を計算                                        │   │
│  │    - action_items.progress_rate を更新                               │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼ propagateProgressUpdate() 再帰                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. ActionMap 進捗更新                                                │   │
│  │    - トップレベル ActionItem の平均進捗                                │   │
│  │    - action_maps.progress_rate を更新                                │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼ onActionMapProgressUpdated() ← 新規トリガー                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. KR 進捗更新                                                       │   │
│  │    - kr_action_map_links からリンクされた KR を取得                    │   │
│  │    - 重み付け平均で KR 進捗を計算                                      │   │
│  │    - kr_progress_logs に履歴記録                                     │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. Objective 進捗更新                                                │   │
│  │    - 紐づく KR の重み付け平均                                         │   │
│  │    - ステータス自動判定（on_track / at_risk / off_track）             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 計算関数

```typescript
// lib/api/okr/calculateProgress.ts

/**
 * ActionMap 進捗更新時のトリガー
 */
async function onActionMapProgressUpdated(
  actionMapId: string,
  newProgress: number
): Promise<void> {
  // 1. リンクされた KR を取得
  const { data: links } = await supabase
    .from('kr_action_map_links')
    .select('key_result_id, weight')
    .eq('action_map_id', actionMapId);

  if (!links || links.length === 0) return;

  // 2. 各 KR の進捗を更新
  for (const link of links) {
    await updateKRProgressFromActionMaps(link.key_result_id);
  }
}

/**
 * KR の進捗を ActionMap から計算
 */
async function updateKRProgressFromActionMaps(krId: string): Promise<void> {
  // 1. リンクされた ActionMap を取得
  const { data: links } = await supabase
    .from('kr_action_map_links')
    .select(`
      weight,
      action_map:action_maps(id, progress_rate)
    `)
    .eq('key_result_id', krId);

  if (!links || links.length === 0) return;

  // 2. 重み付け平均を計算
  let totalWeight = 0;
  let weightedSum = 0;

  for (const link of links) {
    const progress = link.action_map?.progress_rate || 0;
    const weight = link.weight || 1;
    weightedSum += progress * weight;
    totalWeight += weight;
  }

  const newProgress = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 0;

  // 3. KR を取得して差分を計算
  const { data: kr } = await supabase
    .from('okr_key_results')
    .select('progress_rate, workspace_id, objective_id')
    .eq('id', krId)
    .single();

  const previousProgress = kr?.progress_rate || 0;

  // 4. KR を更新
  await supabase
    .from('okr_key_results')
    .update({
      progress_rate: newProgress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', krId);

  // 5. 進捗履歴を記録
  await supabase
    .from('kr_progress_logs')
    .insert({
      workspace_id: kr.workspace_id,
      key_result_id: krId,
      previous_progress: previousProgress,
      new_progress: newProgress,
      change_type: 'from_action_map',
    });

  // 6. Objective 進捗を更新
  await updateObjectiveProgress(kr.objective_id);
}

/**
 * Objective の進捗を KR から計算（重み付け対応）
 */
async function updateObjectiveProgress(objectiveId: string): Promise<void> {
  const { data: krs } = await supabase
    .from('okr_key_results')
    .select('progress_rate, weight')
    .eq('objective_id', objectiveId);

  if (!krs || krs.length === 0) return;

  // 重み付け平均（weight が null の場合は均等配分）
  let totalWeight = 0;
  let weightedSum = 0;

  for (const kr of krs) {
    const weight = kr.weight || (1 / krs.length);
    weightedSum += (kr.progress_rate || 0) * weight;
    totalWeight += weight;
  }

  const newProgress = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 0;

  // ステータス自動判定
  const status = determineObjectiveStatus(newProgress);

  await supabase
    .from('okr_objectives')
    .update({
      progress_rate: newProgress,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', objectiveId);
}
```

---

## 型定義

```typescript
// lib/types/okr-v2.ts

/**
 * OKR 期間
 */
export interface OKRPeriod {
  id: string;
  workspaceId: number;
  title: string;  // 'Q1 2025', 'FY2025'
  periodType: 'quarterly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'closed';
  retrospectiveNotes?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Objective v2（期間・階層対応）
 */
export interface ObjectiveV2 extends Objective {
  periodId?: string;
  parentObjectiveId?: string;  // 階層化
}

/**
 * KeyResult v2（重み付け対応）
 */
export interface KeyResultV2 extends KeyResult {
  weight: number;  // 0.00〜1.00
}

/**
 * KR 進捗履歴
 */
export interface KRProgressLog {
  id: string;
  workspaceId: number;
  keyResultId: string;
  previousValue?: number;
  newValue?: number;
  previousProgress?: number;
  newProgress?: number;
  changeType: 'manual' | 'from_task' | 'from_action_map' | 'system';
  changeSourceId?: string;
  changeNote?: string;
  changedByUserId?: number;
  createdAt: string;
}

/**
 * KR ↔ ActionMap 連携（Phase 17 で定義、ここで再エクスポート）
 */
export type { KRActionMapLink } from './action-map-v2';
```

---

## API設計

### 期間管理 API

```typescript
// POST /api/workspaces/{id}/okr-periods
interface CreatePeriodRequest {
  title: string;
  periodType: 'quarterly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
}

// PUT /api/workspaces/{id}/okr-periods/{periodId}/close
interface ClosePeriodRequest {
  retrospectiveNotes?: string;
}
```

### KR ↔ ActionMap 連携 API

```typescript
// POST /api/workspaces/{id}/key-results/{krId}/link-action-map
interface LinkActionMapRequest {
  actionMapId: string;
  weight?: number;  // default 1.00
}

// DELETE /api/workspaces/{id}/key-results/{krId}/unlink-action-map/{actionMapId}

// GET /api/workspaces/{id}/key-results/{krId}/linked-action-maps
interface LinkedActionMapsResponse {
  links: Array<{
    actionMapId: string;
    actionMap: ActionMap;
    weight: number;
    contributionRate: number;  // この ActionMap がどれだけ貢献しているか
  }>;
}
```

### 進捗履歴 API

```typescript
// GET /api/workspaces/{id}/key-results/{krId}/progress-logs
interface ProgressLogsResponse {
  logs: KRProgressLog[];
  summary: {
    startProgress: number;
    currentProgress: number;
    changeCount: number;
    lastChangedAt: string;
  };
}
```

---

## フック設計

```typescript
// lib/hooks/okr/useOKRPeriod.ts
export function useOKRPeriod(workspaceId: number) {
  return {
    periods: OKRPeriod[],
    activePeriod: OKRPeriod | null,
    createPeriod: (data: CreatePeriodRequest) => Promise<OKRPeriod>,
    closePeriod: (periodId: string, notes?: string) => Promise<void>,
    filterByPeriod: (periodId: string) => void,
  };
}

// lib/hooks/okr/useKRActionMapLink.ts
export function useKRActionMapLink(workspaceId: number, krId: string) {
  return {
    linkedActionMaps: LinkedActionMap[],
    linkActionMap: (actionMapId: string, weight?: number) => Promise<void>,
    unlinkActionMap: (actionMapId: string) => Promise<void>,
    updateWeight: (actionMapId: string, weight: number) => Promise<void>,
    recalculateProgress: () => Promise<void>,
  };
}

// lib/hooks/okr/useKRProgressHistory.ts
export function useKRProgressHistory(workspaceId: number, krId: string) {
  return {
    logs: KRProgressLog[],
    summary: ProgressSummary,
    chartData: ChartDataPoint[],  // グラフ表示用
  };
}
```

---

## UI コンポーネント

### 新規コンポーネント

| コンポーネント | 責務 |
|--------------|------|
| `OKRPeriodSelector` | 期間選択ドロップダウン |
| `OKRPeriodManager` | 期間管理画面 |
| `KRActionMapLinker` | KR-ActionMap 連携UI |
| `KRProgressChart` | 進捗推移グラフ |
| `KRProgressTimeline` | 進捗変更履歴タイムライン |
| `ObjectiveHierarchy` | 会社→チーム→個人OKR階層表示 |

---

## Phase 16-17 との連携

### Phase 16: Task System v4

- `task_links` で Task → ActionItem を紐付け
- `onTaskCompleted()` → `propagateProgressUpdate()` で進捗伝播
- Phase 18 では ActionMap → KR への伝播を追加

### Phase 17: ActionMap v2

- `kr_action_map_links` で KR ↔ ActionMap を紐付け
- ActionMap 進捗更新時に `onActionMapProgressUpdated()` を呼び出し
- KR 進捗を自動更新

### 連携シーケンス

```
Task 完了
    │
    ▼ Phase 16: onTaskCompleted()
ActionItem 進捗更新
    │
    ▼ Phase 16: propagateProgressUpdate()
ActionMap 進捗更新
    │
    ▼ Phase 18: onActionMapProgressUpdated()  ← 新規
KR 進捗更新
    │
    ▼ Phase 18: updateObjectiveProgress()
Objective 進捗更新
```

---

## マイグレーション計画

### Step 1: 新規テーブル作成

```sql
-- okr_periods 作成
-- kr_progress_logs 作成
```

### Step 2: 既存テーブル拡張

```sql
-- okr_objectives に period_id, parent_objective_id 追加
-- okr_key_results に weight 追加
-- kr_action_map_links に FK 追加
```

### Step 3: データ移行

```sql
-- 既存 KR の linkedActionMapIds を kr_action_map_links に移行
INSERT INTO kr_action_map_links (workspace_id, key_result_id, action_map_id, weight)
SELECT
  o.workspace_id,
  kr.id,
  unnest(kr.linked_action_map_ids)::UUID,
  1.00
FROM okr_key_results kr
JOIN okr_objectives o ON kr.objective_id = o.id
WHERE kr.linked_action_map_ids IS NOT NULL
  AND array_length(kr.linked_action_map_ids, 1) > 0;

-- linkedActionMapIds カラムを削除
ALTER TABLE okr_key_results DROP COLUMN linked_action_map_ids;
```

### Step 4: 進捗再計算

```sql
-- すべての KR の進捗を再計算
-- バッチジョブで実行
```

---

## DOD（Definition of Done）

### Phase 18.1: 期間管理

- [ ] `okr_periods` テーブル作成
- [ ] `okr_objectives` に period_id 追加
- [ ] 期間 CRUD API 実装
- [ ] `useOKRPeriod` フック実装
- [ ] `OKRPeriodSelector` コンポーネント実装

### Phase 18.2: KR ↔ ActionMap 連携

- [ ] `kr_action_map_links` に FK 追加
- [ ] KR 連携 API 実装
- [ ] `useKRActionMapLink` フック実装
- [ ] `KRActionMapLinker` コンポーネント実装
- [ ] `onActionMapProgressUpdated()` トリガー実装

### Phase 18.3: 進捗履歴

- [ ] `kr_progress_logs` テーブル作成
- [ ] 進捗履歴 API 実装
- [ ] `useKRProgressHistory` フック実装
- [ ] `KRProgressChart` コンポーネント実装

### Phase 18.4: 進捗自動計算

- [ ] 重み付け進捗計算の実装
- [ ] Phase 16 `propagateProgressUpdate()` との連携
- [ ] データ移行スクリプト作成
- [ ] E2E テスト

---

## UIフロー設計

### OKR → ActionMap → Task 作成フロー

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OKR 作成・運用フロー                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: Objective 作成                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ユーザー → [Objective 作成画面]                            │   │
│  │    ・目標タイトル入力                                       │   │
│  │    ・期間選択（OKRPeriodSelector）                          │   │
│  │    ・親Objective選択（任意）                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  Step 2: Key Result 作成                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Objective詳細画面 → [KR 追加]                              │   │
│  │    ・KRタイトル入力                                         │   │
│  │    ・目標値設定（target_value）                             │   │
│  │    ・重み設定（weight）                                     │   │
│  │    ★ 設計決定: ActionMap経由に統一                         │   │
│  │      ┌─────────────────────────────────────────────────┐   │   │
│  │      │ ActionMap連携オプション:                        │   │   │
│  │      │   ・「既存ActionMapをリンク」                    │   │   │
│  │      │   ・「新規ActionMap作成」                        │   │   │
│  │      │   ・「スケルトン生成」（シンプルなKR向け）       │   │   │
│  │      │     → 1 ActionMap + 1 ActionItem を自動生成     │   │   │
│  │      └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  Step 3: ActionMap リンク（必須）                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [KRActionMapLinker コンポーネント]                         │   │
│  │    ・既存ActionMapから選択                                  │   │
│  │    ・または「テンプレートから作成」→ Phase 17連携           │   │
│  │    ・リンク重み設定（複数ActionMapの場合）                  │   │
│  │    ・「スケルトン生成」ボタン（Phase 17 呼び出し）          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  Step 4: 実行（日常運用）                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Task完了 → ActionItem更新 → ActionMap進捗更新              │   │
│  │          → KR進捗自動更新 → Objective進捗自動更新           │   │
│  │                                                             │   │
│  │  ※ 進捗伝播は Phase 16 propagateProgressUpdate() が起点    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### KR ActionMap連携UI

```typescript
// ★ 設計決定: ActionMap経由に統一（Task直結は廃止）
interface KRActionMapLinkerProps {
  keyResultId: string;
  workspaceId: number;
  linkedActionMaps: LinkedActionMap[];
  onLink: (actionMapId: string, weight?: number) => Promise<void>;
  onUnlink: (actionMapId: string) => Promise<void>;
  onCreateSkeleton: () => Promise<void>;
}

const KRActionMapLinker: React.FC<KRActionMapLinkerProps> = ({
  keyResultId,
  workspaceId,
  linkedActionMaps,
  onLink,
  onUnlink,
  onCreateSkeleton,
}) => {
  const { data: availableActionMaps } = useAvailableActionMaps(workspaceId);
  const hasLinkedMaps = linkedActionMaps.length > 0;

  return (
    <div className="kr-action-map-linker">
      <h4>ActionMap連携</h4>

      {/* リンク済みActionMap一覧 */}
      {hasLinkedMaps ? (
        <LinkedActionMapList
          maps={linkedActionMaps}
          onUnlink={onUnlink}
        />
      ) : (
        <EmptyState
          message="ActionMapがリンクされていません"
          action={
            <Button onClick={onCreateSkeleton}>
              スケルトンActionMapを生成
            </Button>
          }
        />
      )}

      {/* ActionMap追加 */}
      <ActionMapSelector
        actionMaps={availableActionMaps}
        excludeIds={linkedActionMaps.map(m => m.actionMapId)}
        onSelect={(id) => onLink(id)}
      />

      {/* シンプルKR向けスケルトン生成 */}
      {!hasLinkedMaps && (
        <div className="skeleton-hint">
          <InfoIcon />
          <span>
            シンプルなKRの場合は「スケルトン生成」で
            1 ActionMap + 1 ActionItem を自動作成できます
          </span>
        </div>
      )}
    </div>
  );
};
```

---

## 進捗トレーサビリティ

### KR 進捗内訳表示

```typescript
// ★ 設計決定: ActionMap経由に統一（Task直結は廃止）
interface KRProgressBreakdown {
  keyResultId: string;
  keyResultTitle: string;
  targetValue: number;
  currentValue: number;
  progressRate: number;

  // ActionMap経由（唯一の進捗計算方式）
  actionMapContributions: Array<{
    actionMapId: string;
    actionMapTitle: string;
    weight: number;
    progressRate: number;
    contribution: number; // weight * progressRate
    actionItems: Array<{
      id: string;
      title: string;
      completed: boolean;
      linkedTaskCount: number;
    }>;
  }>;

  // 進捗履歴
  progressHistory: Array<{
    recordedAt: string;
    previousValue: number;
    newValue: number;
    changeReason: 'auto_calculated' | 'manual';  // ★ ActionMap経由のみ
    sourceActionMapId?: string;  // 参考情報
  }>;
}
```

### KRProgressBreakdownView コンポーネント

```typescript
const KRProgressBreakdownView: React.FC<{ krId: string }> = ({ krId }) => {
  const { data: breakdown } = useKRProgressBreakdown(krId);

  if (!breakdown) return <Loading />;

  return (
    <div className="kr-progress-breakdown">
      {/* 全体進捗 */}
      <ProgressBar
        value={breakdown.progressRate}
        label={`${breakdown.currentValue} / ${breakdown.targetValue}`}
      />

      {/* ActionMap別貢献度（唯一の進捗計算方式） */}
      <ActionMapContributionList
        contributions={breakdown.actionMapContributions}
      />

      {/* 進捗履歴グラフ */}
      <KRProgressChart history={breakdown.progressHistory} />

      {/* トレーサビリティリンク */}
      <TraceabilityLinks breakdown={breakdown} />
    </div>
  );
};

const ActionMapContributionList: React.FC<{
  contributions: KRProgressBreakdown['actionMapContributions'];
}> = ({ contributions }) => (
  <div className="contribution-list">
    <h4>ActionMap 別貢献度</h4>
    {contributions?.map(am => (
      <div key={am.actionMapId} className="contribution-item">
        <Link href={`/action-maps/${am.actionMapId}`}>
          {am.actionMapTitle}
        </Link>
        <ProgressBar value={am.progressRate} />
        <span className="weight">重み: {am.weight}</span>
        <span className="contribution">
          貢献: {(am.contribution * 100).toFixed(1)}%
        </span>

        {/* ActionItem 展開 */}
        <Collapsible>
          {am.actionItems.map(item => (
            <div key={item.id} className="action-item">
              <Checkbox checked={item.completed} disabled />
              {item.title}
              <Badge>{item.linkedTaskCount} tasks</Badge>
            </div>
          ))}
        </Collapsible>
      </div>
    ))}
  </div>
);
```

---

## 通知システム連携

### OKR関連通知イベント

```typescript
type OKRNotificationEvent =
  | 'objective_created'
  | 'objective_period_ending'      // 期間終了7日前
  | 'key_result_progress_updated'  // 進捗が一定閾値を超えた
  | 'key_result_achieved'          // 100%達成
  | 'key_result_at_risk'           // 期限近いが進捗低い
  | 'action_map_linked'            // ActionMapがKRにリンクされた
  | 'action_map_unlinked';         // ActionMapがKRからリンク解除された

interface OKRNotification {
  type: OKRNotificationEvent;
  objectiveId?: string;
  keyResultId?: string;
  actionMapId?: string;
  message: string;
  createdAt: string;
}

// 通知生成例
async function notifyKRProgress(krId: string, newProgress: number): Promise<void> {
  const { data: kr } = await supabase
    .from('okr_key_results')
    .select(`
      *,
      objective:okr_objectives(owner_id, title)
    `)
    .eq('id', krId)
    .single();

  if (!kr) return;

  // 100%達成
  if (newProgress >= 100 && kr.progress_rate < 100) {
    await createNotification({
      userId: kr.objective.owner_id,
      type: 'key_result_achieved',
      title: 'KR達成！',
      message: `「${kr.title}」が100%達成しました`,
      relatedId: krId,
      relatedType: 'key_result',
    });
  }

  // 進捗マイルストーン (25%, 50%, 75%)
  const milestones = [25, 50, 75];
  for (const milestone of milestones) {
    if (newProgress >= milestone && kr.progress_rate < milestone) {
      await createNotification({
        userId: kr.objective.owner_id,
        type: 'key_result_progress_updated',
        title: `KR進捗 ${milestone}%`,
        message: `「${kr.title}」が${milestone}%に到達しました`,
        relatedId: krId,
        relatedType: 'key_result',
      });
      break;
    }
  }
}
```

---

## エラーハンドリング

### Phase 18 エラーコード

| エラーコード | HTTP | 説明 |
|-------------|------|------|
| `PERIOD_NOT_FOUND` | 404 | 指定された期間が存在しない |
| `PERIOD_OVERLAP` | 422 | 期間が既存の期間と重複している |
| `OBJECTIVE_NOT_FOUND` | 404 | Objectiveが存在しない |
| `KR_NOT_FOUND` | 404 | Key Resultが存在しない |
| `ACTION_MAP_NOT_FOUND` | 404 | ActionMapが存在しない |
| `INVALID_WEIGHT` | 422 | 重みが0〜1の範囲外 |
| `WORKSPACE_MISMATCH` | 422 | KRとActionMapのワークスペース不一致 |
| `VERSION_CONFLICT` | 409 | 楽観ロック競合 |
| `CIRCULAR_OBJECTIVE` | 422 | 親子Objectiveが循環参照 |
| `PROGRESS_PROPAGATION_FAILED` | 500 | 進捗伝播中にエラーが発生 |

### エラーハンドリング実装

```typescript
class OKRError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 400
  ) {
    super(message);
    this.name = 'OKRError';
  }
}

async function handleOKROperation<T>(
  operation: () => Promise<T>,
  context: { objectiveId?: string; keyResultId?: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof OKRError) {
      throw error;
    }

    // Supabase エラー変換
    if (error?.code === '23505') {
      throw new OKRError('PERIOD_OVERLAP', '指定された期間は既存の期間と重複しています', 422);
    }
    if (error?.message?.includes('WORKSPACE_MISMATCH')) {
      throw new OKRError('WORKSPACE_MISMATCH', 'KRとActionMapのワークスペースが一致しません', 422);
    }
    if (error?.message?.includes('version mismatch')) {
      throw new OKRError('VERSION_CONFLICT', '他のユーザーが更新中です。画面を更新してください', 409);
    }

    // 予期しないエラーはログして再スロー
    console.error('[OKR Operation Error]', { ...context, error });
    throw error;
  }
}
```

---

## 整合性チェックリスト

Phase 18 実装時に確認すべき項目：

### 設計決定の反映確認

- [ ] KR直結型が完全に廃止されている（task_links.target_type に 'key_result' がない）
- [ ] すべての KR は ActionMap 経由で進捗計算される
- [ ] ProgressService が進捗計算の中央集約点として機能している
- [ ] Phase 17 の createSkeletonActionMap() と正しく連携している

### データ整合性

- [ ] `kr_action_map_links` の FK 制約が正しく設定されている
- [ ] `workspace_id` が KR と ActionMap で一致することを検証（validateKRActionMapLink）
- [ ] KR の `version` カラムが楽観ロックとして機能している
- [ ] 循環参照防止（親子Objective）のチェックが実装されている
- [ ] 期間の重複チェックが実装されている

### Phase 16-17-18 連携（進捗伝播チェーン）

- [ ] Phase 16: onTaskCompleted() → progressService.propagateProgressFromTask()
- [ ] ProgressService: ActionItem → ActionMap → KR → Objective の順で伝播
- [ ] Phase 17: calculateActionMapProgress() が ProgressService から呼び出される
- [ ] 進捗伝播は同期的に実行される（非同期キューは使用しない）
- [ ] エラー発生時のロールバック範囲が定義されている

### UIフロー

- [ ] KR 作成時に ActionMap リンク UI（KRActionMapLinker）が表示される
- [ ] 「スケルトン生成」ボタンが機能する
- [ ] KRProgressBreakdownView で ActionMap 別貢献度が表示される
- [ ] 進捗履歴グラフが正しく描画される

### 通知

- [ ] KR 100%達成時に通知が送信される
- [ ] 進捗マイルストーン（25%, 50%, 75%）で通知が送信される
- [ ] 期間終了7日前に警告通知が送信される

### 移行

- [ ] 既存 `linkedActionMapIds` が `kr_action_map_links` に移行されている
- [ ] 移行後に `linkedActionMapIds` カラムが削除されている
- [ ] 既存の calc_method='from_tasks' の KR にスケルトン ActionMap が生成されている
- [ ] 全 KR の進捗が ProgressService 経由で再計算されている

---

## 参照

- Phase 16 Runbook: `docs/runbooks/PHASE16-TASK-SYSTEM-V4-RUNBOOK.md`
- Phase 17 Runbook: `docs/runbooks/PHASE17-ACTION-MAP-V2-RUNBOOK.md`
