# Phase 10-E: タスク×Google連携 設計書

## 概要

FDCのタスクとGoogle Calendar/Tasks を連携し、15分単位のタイムブロックを実現する。

---

## 1. 梅習慣×15分タスク連携

### コンセプト

**習慣タブ = 5分梅習慣のマスタ管理**
**15分タスク = 梅習慣を3つまで組み合わせた時間ブロック**

```
習慣タブ（梅習慣マスタ）
├── 読書（5分）
├── 散歩（5分）
├── ストレッチ（5分）
├── 瞑想（5分）
├── コーディング（5分）
└── ...（ユーザーが自由に追加）

       ↓ 選択して組み合わせ

15分タスク（時間ブロック）
├── 読書（5分）← 習慣から選択
├── 散歩（5分）← 習慣から選択
└── ストレッチ（5分）← 習慣から選択
```

### 型定義の変更

```typescript
// lib/types/todo.ts

/**
 * 梅習慣（5分単位のマスタ）
 * - 習慣タブで管理
 * - 15分タスクに紐付けて使用
 */
export interface UmeHabit {
  id: string;
  title: string;              // "読書", "散歩", "ストレッチ" など
  description?: string;
  suit: 'heart' | 'club';     // ♥ or ♣ のみ
  durationMinutes: 5;         // 固定5分

  // ストリーク
  streakCount: number;
  longestStreak: number;
  lastCompletedAt?: string;

  // メタデータ
  createdAt: number;
  updatedAt: number;
}

/**
 * 15分タスクに紐付けた梅習慣
 */
export interface LinkedUmeHabit {
  habitId: string;            // UmeHabit.id
  title: string;              // スナップショット
  completed: boolean;
  completedAt?: string;
}

/**
 * Task 型の拡張
 */
export interface Task {
  // ... 既存フィールド ...

  // 梅習慣の紐付け（最大3つ = 15分）
  linkedUmeHabits?: LinkedUmeHabit[];
}

/**
 * AppData に梅習慣マスタを追加
 */
export interface AppData {
  // ... 既存フィールド ...
  umeHabits: UmeHabit[];      // 梅習慣マスタ
}
```

### フロー

1. **習慣タブで梅習慣を管理**
   - デフォルトで読書/運動/瞑想などを用意
   - ユーザーが自由に追加可能
   - 各習慣のストリークを表示

2. **15分タスク作成時**
   - 習慣タブから最大3つの梅を選択
   - または普通のタスク（梅なし）も作成可能

3. **タスク実行時**
   - 各梅を個別にチェック可能
   - 1つでも完了 → その習慣のストリーク更新
   - 3つ全部完了 → 15分タスク完了

4. **Google Calendar連携**
   - 15分ブロックとして予定登録
   - 中身の梅習慣は説明欄に記載

### UI動作

**習慣タブの変更：**
- 現在の松竹梅選択 → 梅習慣マスタ管理画面に
- 「梅を今日のタスクに追加」ボタン

**タスク作成モーダルの変更：**
- 「梅習慣を追加」ボタン
- 習慣一覧からチェックボックスで選択（最大3つ）

**タスクカード表示：**
```
┌─────────────────────────────────────┐
│ ☐ 朝のルーティン                    │
│    ●●○  2/3 完了                    │
│    🕐 07:00 (15分)      ♥           │
├─────────────────────────────────────┤
│ ├─ ☑ 読書（5分）     🔥3日          │
│ ├─ ☑ 散歩（5分）     🔥7日          │
│ └─ ☐ ストレッチ（5分）🔥1日         │
└─────────────────────────────────────┘
```

---

## 2. Google Calendar 連携（タスク→予定）

### 必要なスコープ変更

```typescript
// 現在
export const DEFAULT_SCOPES = [
  GOOGLE_SCOPES.TASKS,
  GOOGLE_SCOPES.CALENDAR_READONLY,  // 読み取りのみ
];

// 変更後
export const DEFAULT_SCOPES = [
  GOOGLE_SCOPES.TASKS,
  GOOGLE_SCOPES.CALENDAR_READONLY,
  GOOGLE_SCOPES.CALENDAR_EVENTS,    // 書き込み追加
];
```

### 連携フロー

```
[FDC タスク作成]
      ↓
[時間ブロック設定] （例: 09:00, 15分）
      ↓
[Google Calendar に予定作成]
      ↓
[googleCalendarEventId を保存]
```

### APIエンドポイント

```typescript
// POST /api/google/calendars/events
// 既に実装済み、拡張が必要

interface CreateEventRequest {
  calendarId: string;
  taskId: string;           // 紐付けるFDCタスクID
  summary: string;          // "[♥] タスク名" 形式
  startTime: string;        // ISO 8601
  durationMinutes: number;  // 15, 30, 45, 60 など
  colorId?: string;         // Suitに対応した色
}

interface CreateEventResponse {
  eventId: string;
  htmlLink: string;
}
```

### 色の対応（Google Calendar ColorId）

| Suit    | FDC色    | GCal ColorId | GCal色名    |
|---------|----------|--------------|-------------|
| spade   | #1a1a2e  | 8            | Graphite    |
| heart   | #E53935  | 11           | Tomato      |
| diamond | #FDD835  | 5            | Banana      |
| club    | #1976D2  | 7            | Peacock     |

---

## 3. Google Calendar → FDC 同期（予定表示）

### 取得する予定の範囲
- 今日の予定（カットオフ3時〜翌日3時）
- 選択したカレンダーのみ

### 表示方法
- TODO画面の上部または右側に「今日のスケジュール」エリア
- FDCタスクと外部予定を区別表示
- FDCタスクはタップで編集可能

### データ構造

```typescript
interface CalendarEvent {
  id: string;
  summary: string;
  start: string;        // ISO 8601
  end: string;
  colorId?: string;

  // FDC連携
  isFdcTask: boolean;   // FDCから作成したか
  fdcTaskId?: string;   // 紐付いたタスクID
}
```

---

## 4. Google Tasks 双方向同期

### 同期ルール

| 操作 | FDC → Google Tasks | Google Tasks → FDC |
|------|--------------------|--------------------|
| 作成 | 自動同期           | 手動インポート     |
| 完了 | 自動同期           | 次回同期時に反映   |
| 編集 | 自動同期           | 次回同期時に反映   |
| 削除 | 自動同期           | 次回同期時に反映   |

### 同期タイミング
- タスク操作時（リアルタイム）
- ページロード時（差分チェック）
- 手動同期ボタン押下時

### 競合解決
- `updatedAt` タイムスタンプで新しい方を優先
- 競合時はモーダルで選択させる

---

## 5. 実装順序

### Phase 10-E-1: 梅タスク構造
1. `UmeSubTask` 型を追加
2. `Task` 型に `umeSubTasks` を追加
3. タスク作成フォームに梅タスク設定を追加
4. `TodoCard` で梅の進捗表示
5. 梅個別の完了切り替え

### Phase 10-E-2: Google Calendar 書き込み
1. スコープを `calendar.events` に拡張
2. 再認証フロー（スコープ変更時）
3. タスク作成時にCalendarイベント作成
4. タスク編集/削除時にイベント更新/削除
5. 色の同期

### Phase 10-E-3: Calendar表示
1. `/api/google/calendars/events` GET エンドポイント
2. 今日の予定取得
3. TODO画面にスケジュール表示
4. FDCタスクとの紐付け表示

### Phase 10-E-4: Google Tasks 同期
1. 同期ボタンをTODO画面に追加
2. タスク操作時の自動同期
3. 競合検出と解決モーダル
4. 同期ステータス表示

---

## 6. UI/UXモックアップ

### タスクカード（梅タスク付き）

```
┌─────────────────────────────────────┐
│ ☐ プロジェクト資料作成              │
│    ●●○  2/3 完了                    │
│    🕐 09:00 (15分)      ♥           │
├─────────────────────────────────────┤
│ ├─ ☑ 梅1: アウトライン作成          │
│ ├─ ☑ 梅2: 本文ドラフト              │
│ └─ ☐ 梅3: 図表追加                  │
└─────────────────────────────────────┘
```

### TODO画面レイアウト

```
┌─────────────────────────────────────────────────────┐
│ 11月28日（木）                    [同期] [4象限/習慣] │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌───────────────────────────┐   │
│ │ 今日のスケジュール│ │ 時間有効活用ダッシュボード │   │
│ │ 09:00-09:15 ♥   │ │ ████████░░░░░░ 53%        │   │
│ │ 10:00-10:30 📅  │ └───────────────────────────┘   │
│ │ 14:00-14:15 ♠   │                                 │
│ └─────────────────┘                                 │
│                                                     │
│ ┌──────────────┐ ┌──────────────┐                   │
│ │ ♠ 緊急×重要   │ │ ♥ 重要       │                   │
│ │              │ │              │                   │
│ └──────────────┘ └──────────────┘                   │
│ ┌──────────────┐ ┌──────────────┐                   │
│ │ ♦ 緊急だけ   │ │ ♣ 未来創造   │                   │
│ │              │ │              │                   │
│ └──────────────┘ └──────────────┘                   │
└─────────────────────────────────────────────────────┘
```

---

## 7. 注意事項

### セキュリティ
- Google API トークンは暗号化して保存（既に実装済み）
- スコープ拡張時は再認証が必要

### パフォーマンス
- Calendar API呼び出しは適切にキャッシュ
- 同期は非同期で行い、UIをブロックしない

### エラーハンドリング
- Google API エラー時はローカルデータで動作継続
- オフライン時は同期をスキップ、次回接続時に同期
