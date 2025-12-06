# Phase 17: Action Map v2 ランブック

## 概要

**目的**: ActionMap のロジック見直し。テンプレート機能と上司→部下へのアサイン機能を追加。

**責務**: 戦術層 - 「どのように達成するか」を構造化

---

## ★ 実装方針（UI活用・ロジック刷新）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  既存UI活用 + ロジックはゼロベースで実装                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【活用するUI（変更不要）】                                                  │
│  ├── ActionMapTab.tsx          ... 左右2カラムレイアウト                    │
│  ├── ActionMapList.tsx         ... Map一覧表示                              │
│  ├── ActionMapDetail.tsx       ... Map詳細 + ActionItem表示                 │
│  ├── ActionItemFormModal.tsx   ... ActionItem作成/編集                      │
│  ├── ActionItemTree.tsx        ... ツリー表示                               │
│  ├── ActionItemKanban.tsx      ... カンバン表示                             │
│  └── FocusMode.tsx             ... フォーカスモード                         │
│                                                                             │
│  【変更が必要なUI】                                                          │
│  ├── ActionMapFormModal.tsx    ... Skeleton選択UIを追加                     │
│  └── ActionMapList.tsx         ... Skeleton表示バッジ追加（軽微）            │
│                                                                             │
│  【新規実装（ロジック）】                                                     │
│  ├── Skeleton自動生成ロジック                                               │
│  ├── ActionMap進捗計算の統合                                                │
│  └── ProgressServiceとの連携                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 現状実装との差分

| 機能 | 現状 | 本ランブック | 対応 |
|------|------|-------------|------|
| ActionMap CRUD | ✅ 実装済み | そのまま活用 | - |
| ActionItem CRUD | ✅ 実装済み | そのまま活用 | - |
| Tree/Kanban表示 | ✅ 実装済み | そのまま活用 | - |
| linkedTaskIds連携 | ✅ 実装済み | そのまま活用 | - |
| Skeleton機能 | ❌ 未実装 | **新規追加** | DB + UI |
| ProgressService連携 | ❌ 未実装 | **新規追加** | ロジック |

### 既存Hook活用

```typescript
// 既存（活用）
import { useActionMapViewModel } from '@/lib/hooks/action-map/useActionMapViewModel';
import { useActionMapCRUD } from '@/lib/hooks/action-map/useActionMapCRUD';
import { useActionItemCRUD } from '@/lib/hooks/action-map/useActionItemCRUD';
import { useActionMapProgress } from '@/lib/hooks/action-map/useActionMapProgress';

// 新規追加
import { ProgressService } from '@/lib/services/progress/ProgressService';
import { createSkeletonActionMap } from '@/lib/services/action-map/SkeletonService';
```

---

## 設計決定事項（Phase 16-17-18 共通）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. KR直結型は廃止 → ActionMap経由に統一                                     │
│    ・すべてのKRはActionMap経由で進捗を計算                                   │
│    ・シンプルなKRには「スケルトンActionMap」を Phase 17 が自動生成            │
│                                                                             │
│ 2. 進捗伝播は同期（Phase 18 がオーケストレーション）                          │
│                                                                             │
│ 3. 責務分担:                                                                │
│    ・Phase 16: タスク完了 → イベント発火                                    │
│    ・Phase 17: ActionMap進捗計算 + スケルトンActionMap生成                   │
│    ・Phase 18: 進捗伝播オーケストレーション + KR/Objective計算               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 並行開発ガイド

### Phase 17 の独立開発範囲

Phase 17 は以下を **Phase 16/18 と独立して** 開発可能：

| 機能 | 依存関係 | 備考 |
|-----|---------|------|
| action_maps テーブル | なし | 独立して作成可能 |
| action_items テーブル | なし | 独立して作成可能 |
| action_map_templates テーブル | なし | 独立して作成可能 |
| テンプレート生成ロジック | なし | 独立して実装可能 |
| アサイン機能 | なし | 独立して実装可能 |
| ActionMap進捗計算 | なし | 独立して実装可能 |

### 他 Phase との接点（インターフェース契約）

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Phase 17 が提供するインターフェース
// ═══════════════════════════════════════════════════════════════════════════

/**
 * スケルトンActionMap 自動生成（Phase 18 から呼び出される）
 * シンプルなKRに対して、1ActionMap + 1ActionItem を自動生成
 */
interface SkeletonActionMapRequest {
  workspaceId: number;
  keyResultId: string;
  title: string;  // KRタイトルから自動生成
}

interface SkeletonActionMapResponse {
  actionMapId: string;
  actionItemId: string;
}

async function createSkeletonActionMap(
  req: SkeletonActionMapRequest
): Promise<SkeletonActionMapResponse>;

/**
 * ActionMap 進捗計算（Phase 18 から呼び出される）
 */
async function calculateActionMapProgress(actionMapId: string): Promise<number>;

// ═══════════════════════════════════════════════════════════════════════════
// Phase 17 が呼び出すインターフェース（Phase 18 が実装）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ActionMap 進捗更新時のイベント
 */
interface ActionMapProgressUpdatedEvent {
  actionMapId: string;
  workspaceId: number;
  newProgressRate: number;
  updatedAt: string;
}

// Phase 18 が実装
declare function onActionMapProgressUpdated(
  event: ActionMapProgressUpdatedEvent
): Promise<void>;
```

### 開発・テスト戦略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Phase 17 開発フロー                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DB テーブル作成（独立）                                                   │
│     - action_maps, action_items, action_map_templates                       │
│     - 単体テスト: CRUD 操作                                                  │
│                                                                             │
│  2. テンプレート機能実装（独立）                                               │
│     - テンプレート作成・編集・削除                                            │
│     - テンプレートからActionMap生成                                          │
│     - 単体テスト: テンプレート操作                                            │
│                                                                             │
│  3. アサイン機能実装（独立）                                                  │
│     - ActionItem へのユーザーアサイン                                         │
│     - 承認/拒否フロー                                                        │
│     - 単体テスト: アサイン操作                                                │
│                                                                             │
│  4. 進捗計算実装（独立）                                                      │
│     - calculateActionMapProgress()                                          │
│     - モックで onActionMapProgressUpdated() を呼び出し                       │
│     - 単体テスト: 進捗計算                                                    │
│                                                                             │
│  5. 統合テスト（Phase 18 と結合後）                                           │
│     - onActionMapProgressUpdated() の実接続                                  │
│     - E2E: Task完了 → ActionItem → ActionMap → KR                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 16-17-18 連携図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Phase 16-17-18 連携アーキテクチャ                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Phase 18: OKR v2 (戦略層)                        │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │   │
│  │  │  Objective  │────▶│  KeyResult  │────▶│  KR Metrics │            │   │
│  │  │  (目標)     │ 1:N │  (成果指標)  │     │  (進捗履歴)  │            │   │
│  │  └─────────────┘     └──────┬──────┘     └─────────────┘            │   │
│  │                              │                                       │   │
│  │                              │ N:M (kr_action_map_links)             │   │
│  │                              ▼                                       │   │
│  └──────────────────────────────┼───────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┼───────────────────────────────────────┐   │
│  │                     Phase 17: ActionMap v2 (戦術層)                   │   │
│  │                              ▼                                       │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │   │
│  │  │ ActionMap   │────▶│ ActionItem  │────▶│  SubItem    │            │   │
│  │  │ (テンプレ)  │ 1:N │ (アサイン)   │ 1:N │  (子タスク)  │            │   │
│  │  └──────┬──────┘     └──────┬──────┘     └─────────────┘            │   │
│  │         │                   │                                        │   │
│  │         │ template_id       │ task_links                             │   │
│  │         ▼                   ▼                                        │   │
│  │  ┌─────────────┐                                                     │   │
│  │  │ MapTemplate │                                                     │   │
│  │  │ (型保存)    │                                                     │   │
│  │  └─────────────┘                                                     │   │
│  └──────────────────────────────┼───────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┼───────────────────────────────────────┐   │
│  │                     Phase 16: Task System v4 (実行層)                 │   │
│  │                              ▼                                       │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │   │
│  │  │   Tasks     │◀────│ task_links  │     │  task_logs  │            │   │
│  │  │ (タスク/習慣)│     │ (疎結合)    │     │  (完了履歴)  │            │   │
│  │  └─────────────┘     └─────────────┘     └─────────────┘            │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 新機能

### 1. テンプレート機能（型保存）

**ユースケース**:
- 営業マネージャーが「新規開拓プラン」のテンプレートを作成
- チームメンバーに同じ構造のActionMapを一括配布
- 四半期ごとにテンプレートから新しいActionMapを生成

### 2. アサイン機能（上司→部下）

**ユースケース**:
- 上司がActionMapを作成し、ActionItemを部下にアサイン
- アサインされると部下のダッシュボードにタスクとして表示
- 部下が完了すると上司のActionMapの進捗に自動反映

### 3. スケルトンActionMap生成

**ユースケース**:
- シンプルなKRに対して、最小構成のActionMapを自動生成
- Phase 18 から呼び出される

---

## スケルトンActionMap生成

### 概要

シンプルなKR向けに、最小構成のActionMapを自動生成する。
これにより、すべてのKRがActionMap経由で進捗計算される統一経路を維持できる。

### 実装

```typescript
// lib/api/action-map/createSkeletonActionMap.ts

interface SkeletonActionMapRequest {
  workspaceId: number;
  keyResultId: string;
  title: string;  // KRタイトルから自動生成
}

interface SkeletonActionMapResponse {
  actionMapId: string;
  actionItemId: string;
}

async function createSkeletonActionMap(
  req: SkeletonActionMapRequest
): Promise<SkeletonActionMapResponse> {
  const { workspaceId, keyResultId, title } = req;

  // 1. ActionMap を作成
  const { data: actionMap, error: mapError } = await supabase
    .from('action_maps')
    .insert({
      workspace_id: workspaceId,
      title: `${title} - アクションマップ`,
      description: '自動生成されたスケルトンActionMap',
      is_skeleton: true,  // ★ スケルトンフラグ
      progress_rate: 0,
    })
    .select()
    .single();

  if (mapError) throw mapError;

  // 2. ActionItem を1つ作成
  const { data: actionItem, error: itemError } = await supabase
    .from('action_items')
    .insert({
      workspace_id: workspaceId,
      action_map_id: actionMap.id,
      title: title,
      description: 'タスクをこのアイテムにリンクしてください',
      order_index: 0,
      progress_rate: 0,
    })
    .select()
    .single();

  if (itemError) throw itemError;

  // 3. KR ↔ ActionMap リンクを作成
  await supabase
    .from('kr_action_map_links')
    .insert({
      workspace_id: workspaceId,
      key_result_id: keyResultId,
      action_map_id: actionMap.id,
      weight: 1.00,
    });

  return {
    actionMapId: actionMap.id,
    actionItemId: actionItem.id,
  };
}

export { createSkeletonActionMap };
```

### 使用タイミング

1. **KR作成時（Phase 18から呼び出し）**
   - ユーザーが「スケルトン生成」ボタンを押した場合
   - または、KR作成時にActionMapリンクがない場合のデフォルト動作

2. **移行時（既存KRへの適用）**
   - 既存の `calc_method='from_tasks'` の KR に対して一括生成

---

## DBスキーマ設計

### 新規テーブル

#### action_map_templates（テンプレート）

```sql
CREATE TABLE action_map_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Template info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'sales', 'marketing', 'development', etc.

  -- Template structure (JSONB)
  structure JSONB NOT NULL,
  -- {
  --   items: [
  --     { title: "...", description: "...", children: [...] }
  --   ]
  -- }

  -- Metadata
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  is_shared BOOLEAN DEFAULT FALSE,  -- ワークスペース全体で共有
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON action_map_templates(workspace_id) WHERE is_shared = TRUE;
CREATE INDEX idx_templates_owner ON action_map_templates(owner_user_id);
```

#### action_maps（v2: テンプレート参照追加）

```sql
-- 既存テーブルに追加
ALTER TABLE action_maps ADD COLUMN template_id UUID REFERENCES action_map_templates(id);
ALTER TABLE action_maps ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id);
ALTER TABLE action_maps ADD COLUMN assignment_status TEXT DEFAULT 'draft'
  CHECK (assignment_status IN ('draft', 'assigned', 'accepted', 'rejected'));
ALTER TABLE action_maps ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE action_maps ADD COLUMN assignment_note TEXT;

-- ★ スケルトンActionMap用フラグ
ALTER TABLE action_maps ADD COLUMN is_skeleton BOOLEAN DEFAULT FALSE;
-- シンプルなKR向けに自動生成されたActionMapを識別
```

#### action_items（v2: アサイン機能強化）

```sql
-- 既存テーブルに追加
ALTER TABLE action_items ADD COLUMN assigned_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE action_items ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN rejected_at TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN rejection_reason TEXT;

-- アサイン通知用
ALTER TABLE action_items ADD COLUMN notify_on_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE action_items ADD COLUMN notify_on_overdue BOOLEAN DEFAULT TRUE;
```

#### kr_action_map_links（KR連携用 - Phase 18で使用）

```sql
CREATE TABLE kr_action_map_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  key_result_id UUID NOT NULL,  -- FK は Phase 18 で追加
  action_map_id UUID NOT NULL REFERENCES action_maps(id) ON DELETE CASCADE,

  -- Weight for progress calculation
  weight DECIMAL(3,2) DEFAULT 1.00,  -- 0.00〜1.00

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(key_result_id, action_map_id)
);

CREATE INDEX idx_kr_am_links_kr ON kr_action_map_links(key_result_id);
CREATE INDEX idx_kr_am_links_am ON kr_action_map_links(action_map_id);

-- ★ワークスペース整合性チェックトリガー
CREATE OR REPLACE FUNCTION check_kr_action_map_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- KR の workspace_id をチェック
  IF NOT EXISTS (
    SELECT 1 FROM okr_key_results kr
    JOIN okr_objectives o ON kr.objective_id = o.id
    WHERE kr.id = NEW.key_result_id
      AND o.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'KR workspace_id mismatch (code: WORKSPACE_MISMATCH)';
  END IF;

  -- ActionMap の workspace_id をチェック
  IF NOT EXISTS (
    SELECT 1 FROM action_maps am
    WHERE am.id = NEW.action_map_id
      AND am.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'ActionMap workspace_id mismatch (code: WORKSPACE_MISMATCH)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_kr_action_map_workspace
  BEFORE INSERT OR UPDATE ON kr_action_map_links
  FOR EACH ROW
  EXECUTE FUNCTION check_kr_action_map_workspace();
```

#### action_maps / action_items に楽観ロック追加

```sql
-- 楽観ロック用 version カラム
ALTER TABLE action_maps ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE action_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 更新時の version チェック関数（共通）
CREATE OR REPLACE FUNCTION check_version_and_increment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.version != NEW.version - 1 THEN
    RAISE EXCEPTION 'Optimistic lock conflict (code: CONFLICT, expected: %, actual: %)',
      OLD.version, NEW.version - 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_action_maps_version
  BEFORE UPDATE ON action_maps
  FOR EACH ROW
  WHEN (NEW.version != OLD.version)
  EXECUTE FUNCTION check_version_and_increment();

CREATE TRIGGER trg_action_items_version
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  WHEN (NEW.version != OLD.version)
  EXECUTE FUNCTION check_version_and_increment();
```

---

## 型定義

```typescript
// lib/types/action-map-v2.ts

/**
 * ActionMap テンプレート
 */
export interface ActionMapTemplate {
  id: string;
  workspaceId: number;
  title: string;
  description?: string;
  category?: 'sales' | 'marketing' | 'development' | 'operations' | 'custom';
  structure: TemplateStructure;
  ownerUserId: number;
  isShared: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStructure {
  items: TemplateItem[];
}

export interface TemplateItem {
  title: string;
  description?: string;
  defaultAssigneeRole?: string;  // 'manager', 'member', 'specific'
  estimatedDays?: number;
  children?: TemplateItem[];
}

/**
 * ActionMap v2（アサイン機能付き）
 */
export interface ActionMapV2 extends ActionMap {
  templateId?: string;
  assignedToUserId?: number;
  assignmentStatus: 'draft' | 'assigned' | 'accepted' | 'rejected';
  assignedAt?: string;
  assignmentNote?: string;
}

/**
 * ActionItem v2（アサイン機能強化）
 */
export interface ActionItemV2 extends ActionItem {
  assignedByUserId?: number;
  assignedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notifyOnComplete: boolean;
  notifyOnOverdue: boolean;
}

/**
 * アサイン状態
 */
export type AssignmentStatus = 'draft' | 'assigned' | 'accepted' | 'rejected';

/**
 * KR ↔ ActionMap 連携
 */
export interface KRActionMapLink {
  id: string;
  workspaceId: number;
  keyResultId: string;
  actionMapId: string;
  weight: number;  // 0.00〜1.00
  createdAt: string;
}
```

---

## アサインワークフロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           アサインワークフロー                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  上司                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ テンプレート │────▶│ ActionMap  │────▶│ ActionItem │                   │
│  │ 選択/作成   │     │ 作成       │     │ 作成       │                   │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                   │
│                                                  │                          │
│                                                  │ アサイン                  │
│                                                  ▼                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         通知 & 承認フロー                             │  │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │  │
│  │  │   通知      │────▶│  承認/拒否  │────▶│ ステータス  │            │  │
│  │  │ (メール/UI) │     │   待ち      │     │   更新     │            │  │
│  │  └─────────────┘     └─────────────┘     └─────────────┘            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                  │                          │
│                                                  │ 承認後                    │
│                                                  ▼                          │
│  部下                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ ダッシュボード│◀────│   Tasks    │◀────│ task_links │                   │
│  │ に表示      │     │ 自動生成    │     │ 自動作成   │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                  │                          │
│                                                  │ 完了                      │
│                                                  ▼                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         進捗ロールアップ                              │  │
│  │  Task → ActionItem → ActionMap → (KR) → (Objective)                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API設計

### テンプレート API

```typescript
// POST /api/workspaces/{id}/action-map-templates
interface CreateTemplateRequest {
  title: string;
  description?: string;
  category?: string;
  structure: TemplateStructure;
  isShared?: boolean;
}

// GET /api/workspaces/{id}/action-map-templates
// Query: ?category=sales&shared=true

// POST /api/workspaces/{id}/action-map-templates/{templateId}/instantiate
interface InstantiateTemplateRequest {
  title: string;  // 新しいActionMapのタイトル
  assignToUserId?: number;  // 即時アサイン
  periodStart?: string;
  periodEnd?: string;
  // ★追加: KR連携オプション
  linkToKeyResultId?: string;  // 生成後に自動でKRにリンク
  linkWeight?: number;          // デフォルト 1.00
}
```

### アサイン API

```typescript
// POST /api/workspaces/{id}/action-maps/{mapId}/assign
interface AssignActionMapRequest {
  assignToUserId: number;
  note?: string;
  itemAssignments?: {
    itemId: string;
    assigneeUserId: number;
  }[];
}

// POST /api/workspaces/{id}/action-items/{itemId}/assign
interface AssignActionItemRequest {
  assigneeUserId: number;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createTask?: boolean;  // タスクを自動生成するか
  // ★追加: 即時承認オプション
  autoAccept?: boolean;  // true の場合、承認待ちをスキップして即時タスク生成
}

// POST /api/workspaces/{id}/action-items/{itemId}/accept
// POST /api/workspaces/{id}/action-items/{itemId}/reject
interface RejectRequest {
  reason: string;
}
```

---

## フック設計

```typescript
// lib/hooks/action-map/useActionMapTemplate.ts
export function useActionMapTemplate(workspaceId: number) {
  return {
    templates: ActionMapTemplate[],
    createTemplate: (data: CreateTemplateRequest) => Promise<ActionMapTemplate>,
    updateTemplate: (id: string, data: Partial<ActionMapTemplate>) => Promise<ActionMapTemplate>,
    deleteTemplate: (id: string) => Promise<void>,
    instantiateTemplate: (templateId: string, data: InstantiateTemplateRequest) => Promise<ActionMapV2>,
    saveAsTemplate: (actionMapId: string, title: string) => Promise<ActionMapTemplate>,
  };
}

// lib/hooks/action-map/useActionMapAssignment.ts
export function useActionMapAssignment(workspaceId: number) {
  return {
    assignMap: (mapId: string, data: AssignActionMapRequest) => Promise<void>,
    assignItem: (itemId: string, data: AssignActionItemRequest) => Promise<void>,
    acceptItem: (itemId: string) => Promise<void>,
    rejectItem: (itemId: string, reason: string) => Promise<void>,
    myAssignments: ActionItemV2[],  // 自分にアサインされたアイテム
    pendingApprovals: ActionItemV2[],  // 承認待ちアイテム（上司向け）
  };
}
```

---

## UI コンポーネント

### 新規コンポーネント

| コンポーネント | 責務 |
|--------------|------|
| `TemplateSelector` | テンプレート選択モーダル |
| `TemplateEditor` | テンプレート構造の編集UI |
| `AssignmentModal` | アサイン先ユーザー選択 |
| `AssignmentBadge` | アサイン状態表示バッジ |
| `MyAssignmentsPanel` | 自分へのアサイン一覧 |
| `PendingApprovalsPanel` | 承認待ち一覧（上司向け） |

---

## Phase 16 との連携

### task_links の利用

```typescript
// ActionItem を承認時にタスクを自動生成
async function onItemAccepted(item: ActionItemV2): Promise<void> {
  // 1. Task を生成
  const task = await createTask({
    workspace_id: item.workspaceId,
    title: item.title,
    task_type: 'task',
    position: 'spade',  // priorityToSuit(item.priority)
    scheduled_date: item.dueDate,
    user_id: item.assigneeUserId,
  });

  // 2. task_links で紐付け
  await createTaskLink({
    workspace_id: item.workspaceId,
    task_id: task.id,
    target_type: 'action_item',
    target_id: item.id,
  });

  // 3. ActionItem を更新
  await updateActionItem(item.id, {
    acceptedAt: new Date().toISOString(),
  });
}
```

### 進捗ロールアップ

Task 完了時に Phase 16 の `onTaskCompleted()` → `propagateProgressUpdate()` が呼ばれ、
ActionItem → ActionMap → (KR) と進捗が伝播する。

---

## マイグレーション計画

### Step 1: 新規テーブル作成

```sql
-- action_map_templates 作成
-- kr_action_map_links 作成（Phase 18 準備）
```

### Step 2: 既存テーブル拡張

```sql
-- action_maps にカラム追加
-- action_items にカラム追加
```

### Step 3: データ移行

- 既存の ActionMap は `assignment_status = 'draft'` として扱う
- `assigned_to_user_id` は `owner_user_id` と同じにセット

---

## Phase 18 との連携ポイント

### KR ↔ ActionMap 連携

- `kr_action_map_links` テーブルで N:M 関係を管理
- KR 側の `calc_method = 'from_action_maps'` で進捗計算
  - ただし Phase 16 で廃止したため、`propagateProgressUpdate()` 経由で伝播
- ActionMap 完了時に KR の進捗を更新

### 依存関係

```
Phase 16 (Task) ─────────────────▶ Phase 17 (ActionMap)
     │                                    │
     │ task_links                         │ kr_action_map_links
     │                                    │
     ▼                                    ▼
Phase 16 の propagateProgressUpdate ◀──── Phase 18 (OKR)
```

---

## DOD（Definition of Done）

### Phase 17.1: テンプレート機能

- [ ] `action_map_templates` テーブル作成
- [ ] テンプレート CRUD API 実装
- [ ] `useActionMapTemplate` フック実装
- [ ] `TemplateSelector` コンポーネント実装
- [ ] テンプレートからの ActionMap 生成
- [ ] 既存 ActionMap をテンプレート化

### Phase 17.2: アサイン機能

- [ ] `action_maps`, `action_items` カラム追加
- [ ] アサイン API 実装
- [ ] 承認/拒否 API 実装
- [ ] `useActionMapAssignment` フック実装
- [ ] アサイン通知（UI 通知）
- [ ] `MyAssignmentsPanel` 実装

### Phase 17.3: Phase 16 連携

- [ ] 承認時のタスク自動生成
- [ ] `task_links` による紐付け
- [ ] 進捗ロールアップ確認

### Phase 17.4: Phase 18 準備

- [ ] `kr_action_map_links` テーブル作成
- [ ] 連携 API の準備（実装は Phase 18）

---

## 通知システム設計

### 通知トリガー

| イベント | 通知先 | 通知内容 |
|----------|--------|----------|
| ActionItem アサイン | 担当者 | 「{上司名}から新しいタスクがアサインされました」 |
| ActionItem 承認 | アサイン者 | 「{担当者名}がタスクを承認しました」 |
| ActionItem 拒否 | アサイン者 | 「{担当者名}がタスクを拒否しました: {理由}」 |
| ActionItem 完了 | アサイン者 | 「{担当者名}がタスクを完了しました」 |
| 期限超過 | 担当者 | 「タスク「{タイトル}」が期限を過ぎています」 |
| ActionMap 進捗 80%達成 | オーナー | 「ActionMap「{タイトル}」が80%に到達しました」 |

### 通知チャンネル（Phase 1）

- **アプリ内通知**: ベルアイコン + バッジ
- **ダッシュボード表示**: 「アサインされたタスク」セクション

### 通知チャンネル（Phase 2 - 将来拡張）

- メール通知
- Slack 連携
- LINE 連携

### 通知テーブル

**※ Phase 16 で定義された共通 `notifications` テーブルを使用**

参照: `docs/runbooks/PHASE16-TASK-SYSTEM-V4-RUNBOOK.md` の `notifications` セクション

ActionMap 関連の通知タイプ:
- `action_item_assigned`: ActionItem がアサインされた
- `action_item_accepted`: アサインが承認された
- `action_item_rejected`: アサインが拒否された
- `action_item_completed`: ActionItem が完了した
- `action_item_overdue`: ActionItem が期限超過
- `action_map_progress`: ActionMap 進捗マイルストーン達成

---

## エラーハンドリング

### エラーコード一覧

| コード | 意味 | 対処法 |
|--------|------|--------|
| 409 | 楽観ロック競合 | 最新データを再取得してリトライ |
| 403 | ワークスペース不一致 | 正しいワークスペースで操作 |
| 404 | リソース未発見 | 削除済みか確認 |
| 400 | アサイン先が無効 | 同一ワークスペースのユーザーを指定 |

---

## 整合性チェックリスト

### 実装時確認

- [ ] `action_maps` に version カラムがある
- [ ] `action_items` に version カラムがある
- [ ] `kr_action_map_links` にワークスペース整合性トリガーがある
- [ ] アサイン時に `autoAccept` オプションが動作する
- [ ] テンプレート生成時に `linkToKeyResultId` で自動リンクされる
- [ ] 通知テーブルが作成されている

### スケルトンActionMap確認

- [ ] `createSkeletonActionMap()` が実装されている
- [ ] `action_maps.is_skeleton` カラムが存在する
- [ ] Phase 18 から `createSkeletonActionMap()` が呼び出し可能
- [ ] スケルトン生成時に `kr_action_map_links` が自動作成される

### Phase 16 連携確認

- [ ] ActionItem 承認時にタスク自動生成 + task_links 作成
- [ ] `task_links.target_type` が 'action_item' のみ許可されている

### Phase 18 連携確認

- [ ] `kr_action_map_links` の FK が Phase 18 で追加される
- [ ] ActionMap 進捗更新時に `onActionMapProgressUpdated()` が呼ばれる
- [ ] `calculateActionMapProgress()` が ProgressService から呼び出される

---

## 参照

- Phase 16 Runbook: `docs/runbooks/PHASE16-TASK-SYSTEM-V4-RUNBOOK.md`
- Phase 18 Runbook: `docs/runbooks/PHASE18-OKR-V2-RUNBOOK.md`
