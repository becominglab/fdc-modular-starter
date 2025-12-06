# Phase 11：Action Map 設計ドキュメント

**Version:** 1.0
**Created:** 2025-11-29
**Status:** Ready for Review

---

## 1. 用語定義と役割

### 1.1 基本用語

| 用語 | 定義 | 例 |
|------|------|-----|
| **Action Map** | 上司が作成する戦術計画。期間・ゴールを持つ | Q1新規リード10件獲得プラン |
| **Action Item** | Action Map配下の具体的なタスク | テレアポリスト作成、毎日30分テレアポ |
| **上司（Manager）** | Action Map を作成・管理する権限者 | ADMIN または OWNER ロール |
| **部下（Member）** | Action Item にアサインされ、TODO として実行する | MEMBER ロール |

### 1.2 階層構造

```
Workspace
  └─ Action Map（戦術計画）
       ├─ Action Item（親）─ リード獲得
       │    ├─ Action Item（子）─ テレアポリスト作成
       │    │    └─ TODO Task × N 件
       │    └─ Action Item（子）─ 毎日30分テレアポ
       │         └─ TODO Task × 20 件（毎日1件）
       └─ Action Item（親）─ 商談化
            └─ ...
```

### 1.3 フロー図（上司 → 部下 → TODO → 進捗）

```
上司（ADMIN/OWNER）
  │
  ├─[1] Action Map 作成
  │     title: "Q1 新規リード 10件獲得プラン"
  │     期間: 2025-01-01 ~ 2025-03-31
  │
  ├─[2] Action Item 作成 + 部下にアサイン
  │     ├─ テレアポリスト作成 → 佐藤A
  │     ├─ 毎日30分テレアポ → 佐藤A
  │     └─ リード品質チェック → 鈴木B
  │
  ▼
部下（MEMBER）
  │
  ├─[3] Action Item から TODO 作成
  │     └─ TODO: テレアポ30分 [♠ 緊急かつ重要] 09:00-09:30
  │
  ├─[4] TODO を 4象限ボードで管理（Phase 10）
  │
  ├─[5] Google カレンダーと連携
  │
  ▼
実行・完了
  │
  ├─[6] TODO 完了 → Task.status = 'done'
  │
  ├─[7] Action Item 進捗更新（自動）
  │     progressRate = 完了TODO / 全TODO × 100
  │
  ├─[8] Action Map 進捗ロールアップ（自動）
  │     progressRate = 平均(配下ActionItem.progressRate)
  │
  ▼
上司（ADMIN/OWNER）
  │
  └─[9] 進捗を可視化・確認
        └─ Action Map タブ / ダッシュボード
```

### 1.4 具体例

#### 例1: 営業部門
```
Action Map: Q1 新規リード 10件獲得プラン
├─ リード獲得（親Item）
│   ├─ テレアポリスト作成（子Item）→ 佐藤A / 01/15 / high
│   ├─ 毎日30分テレアポ（子Item）→ 佐藤A / 01/31 / high
│   └─ リード品質チェック（子Item）→ 鈴木B / 01/20 / medium
├─ 商談化（親Item）
│   └─ 初回商談実施 → 田中C / 02/15 / medium
└─ 既存深堀り（親Item）
    └─ アップセル提案 → 鈴木B / 03/10 / low
```

#### 例2: 開発部門
```
Action Map: v2.0 リリース準備
├─ 機能開発（親Item）
│   ├─ ユーザー認証機能 → エンジニアA / 02/01 / high
│   └─ ダッシュボード刷新 → エンジニアB / 02/15 / medium
├─ 品質保証（親Item）
│   ├─ E2Eテスト拡充 → QAエンジニア / 02/20 / high
│   └─ パフォーマンス検証 → エンジニアA / 02/25 / medium
└─ ドキュメント（親Item）
    └─ ユーザーマニュアル更新 → テクニカルライター / 03/01 / low
```

#### 例3: 人事部門
```
Action Map: 新入社員オンボーディング
├─ 入社準備（親Item）
│   ├─ PC・アカウント準備 → 総務担当 / 03/25 / high
│   └─ 研修資料作成 → 人事担当 / 03/28 / medium
└─ 研修実施（親Item）
    ├─ 会社概要研修 → 人事担当 / 04/01 / high
    └─ 部門別OJT → 各部門メンター / 04/15 / medium
```

---

## 2. データモデル

### 2.1 ActionMap 型

```typescript
// lib/types/action-map.ts

export type ActionMapId = string;
export type ActionItemId = string;

/**
 * Action Map（戦術計画）
 */
export interface ActionMap {
  id: ActionMapId;
  title: string;                    // 例: 「Q1 新規リード 10件獲得プラン」
  description?: string;             // 説明（最大1000文字）
  ownerUserId: string;              // 作成者（上司）
  targetPeriodStart?: string;       // 開始日（ISO日付）
  targetPeriodEnd?: string;         // 終了日（ISO日付）
  createdAt: string;                // 作成日時（ISO）
  updatedAt: string;                // 更新日時（ISO）
  isArchived?: boolean;             // アーカイブフラグ

  // 進捗集計（配下 Action Item から自動計算）
  progressRate?: number;            // 0〜100
}

/**
 * Action Item のステータス
 */
export type ActionItemStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';

/**
 * Action Item の優先度
 */
export type ActionItemPriority = 'low' | 'medium' | 'high';

/**
 * Action Item（具体タスク）
 */
export interface ActionItem {
  id: ActionItemId;
  actionMapId: ActionMapId;         // 所属する Action Map

  parentItemId?: ActionItemId | null;  // ツリー構造用（親Item）
  title: string;                    // タイトル（最大100文字）
  description?: string;             // 説明（最大500文字）

  assigneeUserId: string;           // 担当者（部下）
  dueDate?: string;                 // 期限（ISO日付）
  priority?: ActionItemPriority;    // 優先度

  status: ActionItemStatus;         // ステータス

  // TODO タスクとの連携
  linkedTaskIds?: string[];         // Task.id の配列（最大20件）
  progressRate?: number;            // 0〜100（linkedTask の完了率から自動更新）

  createdAt: string;
  updatedAt: string;
}
```

### 2.2 workspace_data への追加構造

```json
{
  "actionMaps": [
    {
      "id": "am_001",
      "title": "Q1 新規リード 10件獲得プラン",
      "ownerUserId": "user_manager",
      "targetPeriodStart": "2025-01-01",
      "targetPeriodEnd": "2025-03-31",
      "progressRate": 60,
      "isArchived": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    }
  ],
  "actionItems": [
    {
      "id": "ai_001",
      "actionMapId": "am_001",
      "parentItemId": null,
      "title": "リード獲得",
      "assigneeUserId": "user_member_a",
      "dueDate": "2025-01-31",
      "priority": "high",
      "status": "in_progress",
      "linkedTaskIds": ["task_001", "task_002"],
      "progressRate": 50,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    },
    {
      "id": "ai_002",
      "actionMapId": "am_001",
      "parentItemId": "ai_001",
      "title": "テレアポリスト作成",
      "assigneeUserId": "user_member_a",
      "dueDate": "2025-01-15",
      "priority": "high",
      "status": "done",
      "linkedTaskIds": ["task_003"],
      "progressRate": 100,
      "createdAt": "2025-01-02T00:00:00.000Z",
      "updatedAt": "2025-01-15T18:00:00.000Z"
    }
  ]
}
```

### 2.3 既存データとの互換性

- `actionMaps` / `actionItems` は **オプショナルフィールド** として追加
- 既存の AppData に存在しない場合は空配列 `[]` として初期化
- Phase 10 以前のデータが壊れないことを保証

```typescript
// lib/types/app-data.ts への追加
export interface AppData {
  // ... 既存フィールド

  // Phase 11: Action Map
  actionMaps?: ActionMap[];
  actionItems?: ActionItem[];
}
```

---

## 3. TODO連携ポリシー

### 3.1 Action Item → TODO 生成時の初期値

| Action Item フィールド | TODO Task フィールド | 変換ルール |
|------------------------|---------------------|------------|
| priority: high | suit: 'spade' | ♠ 緊急かつ重要 |
| priority: medium | suit: 'heart' | ♥ 重要なこと |
| priority: low | suit: 'diamond' | ♦ 緊急なだけ |
| title | title | そのままコピー |
| description | description | オプションでコピー |
| - | durationMinutes | デフォルト 30分 |
| - | status | 'not_started' |

### 3.2 既存 TODO を後付けで紐付けるルール

1. **部下が自分の TODO にのみ紐付け可能**
2. **上司は部下の TODO を代理で紐付け可能**（ADMIN/OWNER 権限）
3. **1つの TODO は 1つの Action Item にのみ紐付け可能**（1:1）
4. **1つの Action Item は複数の TODO に紐付け可能**（1:N、最大20件）

### 3.3 進捗同期のタイミング

| イベント | 処理 |
|---------|------|
| TODO Task の status 変更 | 即座に ActionItem.progressRate を再計算 |
| ActionItem の status 変更 | 即座に ActionMap.progressRate を再計算 |
| TODO Task の削除 | linkedTaskIds から削除、progressRate 再計算 |
| ActionItem の削除 | 紐づく Task の「AMバッジ」を削除 |

---

## 4. 権限ポリシー（詳細版）

### 4.1 ロール定義

> **isManager** = `workspace_members.role` が `'ADMIN'` または `'OWNER'`

### 4.2 CRUD権限マトリクス

| 操作 | OWNER | ADMIN | MEMBER |
|------|-------|-------|--------|
| ActionMap作成 | ✓ | ✓ | ✗ |
| ActionMap編集（自分作成） | ✓ | ✓ | ✗ |
| ActionMap編集（他人作成） | ✓ | ✗ | ✗ |
| ActionMap削除（自分作成） | ✓ | ✓ | ✗ |
| ActionMap削除（他人作成） | ✓ | ✗ | ✗ |
| ActionMap閲覧 | ✓ | ✓ | ✓ |
| ActionItem作成 | ✓ | ✓（自分のMap） | ✗ |
| ActionItem編集（自分作成） | ✓ | ✓ | ✗ |
| ActionItem編集（自分がassignee） | ✓ | ✓ | ✓（status/progressのみ） |
| ActionItem編集（他人） | ✓ | ✗ | ✗ |
| ActionItem削除 | ✓ | ✓（自分のMap） | ✗ |
| TODO紐付け（自分のTODO） | ✓ | ✓ | ✓ |
| TODO紐付け（他人のTODO） | ✓ | ✓（部下のみ） | ✗ |

---

## 5. UI/UXモック

### 5.1 Action Map タブ - ツリービュー（デフォルト）

```
┌─────────────────────────────────────────────────────────────────┐
│ Action Map タブ                               [+ 新規Map作成]  │
├───────────────┬─────────────────────────────────────────────────┤
│ Action Map    │ Action Map 詳細: Q1 新規リード 10件獲得プラン   │
│               │                                                 │
│ Q1 新規リード │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 10件獲得      │ 📊 全体進捗: ████████░░ 75%                   │
│ 75% ✓         │ 期間: 2025-01-01 ~ 2025-03-31                  │
│ 2025-01〜03   │ オーナー: 山田太郎（Manager）                  │
│               │                                                 │
│ 営業力強化    │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 40% ⚠         │ Action Items (8)                   [+ 追加]    │
│ 2025-01〜03   │                                                 │
│               │ ┌─ 📋 リード獲得（親Item）                     │
│ [+ 作成]      │ │   ├─ テレアポリスト作成                      │
│               │ │   │   👤 佐藤A  📅 01/15  ✅ 完了            │
│               │ │   │   ⏰ 残り: - (完了)                      │
│               │ │   │   📝 TODO: 2件完了 / 2件  進捗: 100%    │
│               │ │   │                                           │
│               │ │   ├─ 毎日30分テレアポ                        │
│               │ │   │   👤 佐藤A  📅 01/31  🔄 進行中          │
│               │ │   │   ⏰ 残り: 🟡 5日 (期限注意)             │
│               │ │   │   📝 TODO: 10件完了 / 20件  進捗: 50%    │
│               │ │   │                                           │
│               │ │   └─ リード品質チェック                      │
│               │ │       👤 鈴木B  📅 01/20  ⏸ 未着手          │
│               │ │       ⏰ 残り: 🔴 期限切れ (-3日)            │
│               │ │       📝 TODO: 0件  進捗: 0%                 │
│               │ │                                               │
│               │ └─ 📋 商談化（親Item）                         │
│               │     └─ 初回商談実施                            │
│               │         👤 田中C  📅 02/15  ⏸ 未着手          │
└───────────────┴─────────────────────────────────────────────────┘
```

### 5.2 Action Map タブ - カンバンボードビュー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Action Map: Q1 新規リード 10件獲得プラン    [🌲 ツリー] [📋 カンバン]       │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│ ⏸ 未着手 (3)    │ 🔄 進行中 (2)    │ 🚫 ブロック (1)  │ ✅ 完了 (2)          │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────┐ │
│ │初回商談実施 │ │ │30分テレアポ │ │ │品質チェック │ │ │テレアポリスト   │ │
│ │👤 田中C     │ │ │👤 佐藤A     │ │ │👤 鈴木B     │ │ │👤 佐藤A         │ │
│ │📅 02/15    │ │ │📅 01/31    │ │ │📅 01/20    │ │ │📅 01/15 ✓      │ │
│ │⏰ 🟢 20日   │ │ │⏰ 🟡 5日    │ │ │⏰ 🔴 -3日   │ │ │進捗: 100%       │ │
│ │進捗: 0%    │ │ │進捗: 50%    │ │ │進捗: 0%    │ │ └─────────────────┘ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │                     │
│                 │                 │                 │ ┌─────────────────┐ │
│ ┌─────────────┐ │ ┌─────────────┐ │                 │ │商談資料完成     │ │
│ │フォローアップ│ │ │商談資料作成 │ │                 │ │👤 田中C         │ │
│ │👤 鈴木B     │ │ │👤 田中C     │ │                 │ │📅 02/01 ✓      │ │
│ │📅 02/20    │ │ │📅 02/05    │ │                 │ │進捗: 100%       │ │
│ │⏰ 🟢 25日   │ │ │⏰ 🟢 10日   │ │                 │ └─────────────────┘ │
│ │進捗: 0%    │ │ │進捗: 80%    │ │                 │                     │
│ └─────────────┘ │ └─────────────┘ │                 │                     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘

💡 カードはドラッグ&ドロップでステータス変更可能
```

### 5.3 残日数の視覚的警告

| 残日数 | 表示 | 色 | 意味 |
|--------|------|-----|------|
| 8日以上 | 🟢 | 緑 | 余裕あり |
| 4〜7日 | 🟡 | 黄 | 期限注意 |
| 1〜3日 | 🟠 | オレンジ | 要対応 |
| 0日以下 | 🔴 | 赤 | 期限切れ |

### 5.4 フォーカスモード

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 フォーカスモード: 毎日30分テレアポ実施               [✕ 閉じる]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 📊 進捗: ███████████░░░░░░░░░ 50%  (10/20 TODO完了)                        │
│                                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│ 👤 担当: 佐藤A                                                              │
│ 📅 期限: 2025-01-31 (残り 🟡 5日)                                          │
│ 🏷️ 優先度: High                                                            │
│ 📝 説明: 1日30分のテレアポを継続し、リード獲得につなげる                    │
│                                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│ 📋 紐づくTODO一覧                                        [+ TODO作成]       │
│                                                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ 01/21 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ │ ✅ 01/22 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ │ ✅ 01/23 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ │ ...                                                                    │ │
│ │ ⬜ 01/29 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ │ ⬜ 01/30 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ │ ⬜ 01/31 09:00-09:30  テレアポ実施 [♠ 緊急かつ重要]                    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [編集] [TODO一括作成] [既存TODO紐付け]                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 進捗集計ロジック

### 6.1 Action Item の progressRate 計算

```typescript
function recomputeActionItemProgress(actionItem: ActionItem, tasks: Task[]): ActionItem {
  const linkedTasks = tasks.filter(t => actionItem.linkedTaskIds?.includes(t.id));

  if (linkedTasks.length === 0) {
    return { ...actionItem, progressRate: 0 };
  }

  const doneCount = linkedTasks.filter(t => t.status === 'done').length;
  const rate = Math.round((doneCount / linkedTasks.length) * 100);

  // ステータス自動判定
  let status: ActionItemStatus = actionItem.status;
  if (rate === 100) {
    status = 'done';
  } else if (rate > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }

  return {
    ...actionItem,
    progressRate: rate,
    status,
    updatedAt: new Date().toISOString(),
  };
}
```

### 6.2 Action Map の progressRate 計算（ロールアップ）

```typescript
function recomputeActionMapProgress(actionMap: ActionMap, actionItems: ActionItem[]): ActionMap {
  const items = actionItems.filter(item => item.actionMapId === actionMap.id);

  if (items.length === 0) {
    return { ...actionMap, progressRate: 0 };
  }

  const totalProgress = items.reduce((sum, item) => sum + (item.progressRate || 0), 0);
  const rate = Math.round(totalProgress / items.length);

  return {
    ...actionMap,
    progressRate: rate,
    updatedAt: new Date().toISOString(),
  };
}
```

### 6.3 ステータス自動判定ルール

| 条件 | ステータス |
|------|-----------|
| progressRate === 100 | `done` |
| progressRate > 0 | `in_progress` |
| dueDate 過ぎた && progressRate === 0 | `blocked` |
| それ以外 | `not_started` |

---

## 7. 容量見積もり

### 7.1 Phase 11 追加分

| データ種別 | 件数目安 | サイズ/件 | 合計 |
|-----------|---------|----------|------|
| ActionMap | 50件 | 400 bytes | 20 KB |
| ActionItem | 200件 | 300 bytes | 60 KB |
| **合計** | - | - | **80 KB** |

### 7.2 現状分析（実測値ベース）

- **Phase 10 完了時点 P95**: 751 bytes
- **Phase 11 追加後**: 751 bytes + 80 KB = **約81 KB**
- **250KB制限内**: ✅ 十分余裕あり

### 7.3 データ最適化（上限値）

| データ種別 | フィールド | 上限値 |
|-----------|-----------|--------|
| ActionItem | linkedTaskIds | 20件 |
| ActionItem | description | 500文字 |
| ActionMap | title | 100文字 |
| ActionMap | description | 1000文字 |

---

## 8. パフォーマンス目標

| 操作 | 目標 |
|------|------|
| Action Map タブ初回表示 | P95 < 1.5秒 |
| Action Item 進捗計算 | P95 < 100ms |
| TODO連携操作（生成/紐付け） | P95 < 800ms |
| ツリー表示（Action Item 200件） | P95 < 1.0秒 |
| カンバンボード切り替え | P95 < 300ms |

---

## 9. E2Eテストスコープ

> **注記**: E2Eテストは Phase 11, 12 完了後にまとめて実施

### 9.1 必須テストケース

1. **Action Map CRUD**
2. **Action Item CRUD**
3. **Action Item ツリー構造（親子）**
4. **TODO連携（生成/紐付け）**
5. **進捗同期（TODO → ActionItem → ActionMap）**
6. **権限チェック（OWNER / ADMIN / MEMBER）**
7. **アーカイブ機能**
8. **カンバンボードビュー操作**
9. **フォーカスモード操作**
10. **残日数の視覚的警告表示**
11. **既存機能回帰（Phase 10 TODO機能）**

---

## 10. リスク・懸念事項

| リスク | 対策 | 状態 |
|--------|------|------|
| 容量超過リスク | 実測値ベースで問題なし（81KB / 250KB） | ✅ 解消済み |
| UX課題: 上司/部下の画面分離 | 「マイアクション」ビューで部下は自分のみ表示 | 設計済み |
| Phase 10 との依存 | Task.status フィールド確認済み | ✅ 問題なし |
| パフォーマンス | ツリー表示最適化（仮想化検討） | 実装時対応 |
| 進捗同期の整合性 | イベントドリブン + 即時更新 | 設計済み |

---

## 11. 実装ファイル一覧

### 11.1 新規作成（✅ 実装完了）

| ファイル | 説明 | 状態 |
|---------|------|------|
| `lib/types/action-map.ts` | ActionMap, ActionItem 型定義 | ✅ 完了 |
| `lib/hooks/useActionMapViewModel.ts` | Action Map ViewModel | ✅ 完了 |
| `app/_components/action-map/ActionMapTab.tsx` | Action Map タブ本体（アコーディオン形式） | ✅ 完了 |
| `app/_components/action-map/ActionMapList.tsx` | 左カラム一覧 | ✅ 完了 |
| `app/_components/action-map/ActionMapDetail.tsx` | 右カラム詳細 | ✅ 完了 |
| `app/_components/action-map/ActionMapAccordion.tsx` | アコーディオン形式表示 | ✅ 完了 |
| `app/_components/action-map/ActionItemTree.tsx` | ツリービュー | ✅ 完了 |
| `app/_components/action-map/ActionItemKanban.tsx` | カンバンビュー | ✅ 完了 |
| `app/_components/action-map/ActionMapFormModal.tsx` | Map 作成/編集モーダル | ✅ 完了 |
| `app/_components/action-map/ActionItemFormModal.tsx` | Item 作成/編集モーダル | ✅ 完了 |
| `app/_components/action-map/FocusMode.tsx` | フォーカスモード | ✅ 完了 |

### 11.2 スタイルファイル（✅ 実装完了）

| ファイル | 説明 |
|---------|------|
| `app/_components/action-map/ActionMapTab.module.css` | タブ全体のスタイル |
| `app/_components/action-map/ActionMapList.module.css` | 一覧スタイル |
| `app/_components/action-map/ActionMapDetail.module.css` | 詳細スタイル |
| `app/_components/action-map/ActionMapAccordion.module.css` | アコーディオンスタイル |
| `app/_components/action-map/ActionItemTree.module.css` | ツリースタイル |
| `app/_components/action-map/ActionItemKanban.module.css` | カンバンスタイル |
| `app/_components/action-map/FormModal.module.css` | モーダル共通スタイル |
| `app/_components/action-map/FocusMode.module.css` | フォーカスモードスタイル |

**デザイントークン**（2025-11-29 統一）:
- プライマリカラー: `#00B8C4`（ターコイズ）
- プライマリダーク: `#008A94`
- 背景グラデーション: `linear-gradient(135deg, #f8feff 0%, #f0f9fa 100%)`

### 11.3 更新

| ファイル | 変更内容 |
|---------|----------|
| `lib/types/app-data.ts` | actionMaps, actionItems フィールド追加 |
| `lib/hooks/useTaskViewModel.ts` | Action Item 進捗連携追加 |
| `app/_components/todo/TodoCard.tsx` | AMバッジ表示追加 |
| `app/(app)/dashboard/page.tsx` | Action Map タブ追加（タブベースナビゲーション） |

---

## 12. 承認項目

Phase 11-0 完了条件:

- [ ] 本設計ドキュメントのレビュー完了
- [ ] 容量・パフォーマンス目標の合意
- [ ] 権限マトリクスの合意
- [ ] UI/UXモックの合意
- [ ] Phase 11-1 実装開始の承認

---

**設計ドキュメント作成完了: 2025-11-29**
**次フェーズ: Phase 11-1（core レイヤー拡張）**
