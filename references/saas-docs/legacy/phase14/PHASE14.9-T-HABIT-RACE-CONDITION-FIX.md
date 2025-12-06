# Phase 14.9-T: Habit Race Condition Fix

**日付**: 2024-12-04
**ステータス**: 完了
**重要度**: Critical

## 問題の概要

### 症状
ユーザーが12月4日に3つの習慣（♥ごきげんでいる、♣書く、♣瞑想する）を追加した際、Umeブロック（タスク）が重複して作成される問題が発生。

### 根本原因
`createUmeBlock`関数内でrace conditionが発生していた：

1. ユーザーが素早く複数回クリック
2. 各クリックが非同期の`createUmeBlock`を呼び出し
3. 複数の並行実行が同じ`tasksRef.current`を読み取り
4. 各実行が同じタスクリストに基づいて新タスクを追加
5. 結果：重複したタスクが作成される

```
Timeline:
Click 1 → read tasksRef (count=0) → create task → async save...
Click 2 → read tasksRef (count=0) → create task → async save...  ← 問題！
Click 3 → read tasksRef (count=0) → create task → async save...  ← 問題！
```

## 修正内容

### ファイル: `lib/hooks/task/useHabitLogic.ts`

**修正前**:
```typescript
const createUmeBlock = useCallback(async (
  habits: ElasticHabit[],
  startTime?: string
) => {
  // ... タスク作成処理 ...

  // 非同期保存（refは更新されない）
  await saveData({ tasks: [...tasksRef.current, newTask], ... });
}, [saveData]);
```

**修正後**:
```typescript
const createUmeBlock = useCallback(async (
  habits: ElasticHabit[],
  startTime?: string
) => {
  // ... タスク作成処理 ...

  // Phase 14.9-T: 同期的にrefを更新してrace conditionを防止
  const updatedTasks = [...tasksRef.current, newTask];
  tasksRef.current = updatedTasks;

  // refを更新した状態で保存
  await saveData({ tasks: updatedTasks, ... });
}, [saveData]);
```

### 修正のポイント

1. **同期的なref更新**: `saveData`を呼ぶ前に`tasksRef.current`を更新
2. **並行実行の順序保証**: 後続のクリックは更新済みのrefを参照
3. **二重送信防止**: `HabitSlot.tsx`の`isSubmitting`フラグと組み合わせ

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/hooks/task/useHabitLogic.ts` | Umeブロック作成ロジック |
| `lib/contexts/WorkspaceDataContext.tsx` | データ保存処理 |
| `app/_components/todo/HabitSlot.tsx` | UI・二重クリック防止 |

## 検証結果

### データベース確認
```sql
-- workspace_data テーブルから確認
-- elasticHabits: 6個（♥3 + ♣3）
-- tasks: 3個（Umeブロック）
-- 重複なし ✓
```

### 保存されたデータ構造
```json
{
  "elasticHabits": [
    { "title": "ごきげんでいる", "suit": "heart", "levels": {...}, "streakCount": 1 },
    { "title": "深呼吸", "suit": "heart", "levels": {...}, "streakCount": 0 },
    { "title": "よく噛んで食べる", "suit": "heart", "levels": {...}, "streakCount": 0 },
    { "title": "書く", "suit": "club", "levels": {...}, "streakCount": 1 },
    { "title": "瞑想する", "suit": "club", "levels": {...}, "streakCount": 1 },
    { "title": "リサーチ", "suit": "club", "levels": {...}, "streakCount": 0 }
  ],
  "tasks": [
    { "id": "...", "title": "♥ごきげんでいる 梅", ... },
    { "id": "...", "title": "♣書く 梅", ... },
    { "id": "...", "title": "♣瞑想する 梅", ... }
  ]
}
```

## デバッグログのクリーンアップ

修正検証後、以下のデバッグログを削除：

- `lib/hooks/task/useHabitLogic.ts`: 5個の`console.warn`
- `lib/contexts/WorkspaceDataContext.tsx`: 5個の`console.warn`
- `app/_components/todo/HabitSlot.tsx`: 3個の`console.warn`

**コミット**: `Remove debug logs from habit logic and save data`

## 教訓

1. **非同期処理でのref更新タイミング**: 並行実行される可能性がある処理では、refの同期的更新が重要
2. **多層防御**: UI層（`isSubmitting`）+ ロジック層（ref同期更新）の組み合わせ
3. **圧縮データの確認**: gzip + base64エンコードされたデータの検証方法を把握しておく

## 関連Issues

- 12月4日の習慣重複問題
- Race condition in createUmeBlock

---

*Generated: 2024-12-04*
