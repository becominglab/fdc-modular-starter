# Phase 2: タスク機能の拡張 ランブック

## 目標

Phase 1 で作成したタスク管理機能を拡張する：
- タスクのフィルタリング（すべて / 未完了 / 完了）
- タスクの並べ替え（作成日 / 更新日）
- タスクの編集機能
- UI/UX の改善

## 前提条件

- [ ] Phase 1 完了（タスク CRUD が動作している）
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる
- [ ] `/tasks` ページでタスクの追加・完了・削除ができる

---

## Step 1: フィルター型の追加

**ファイルパス:** `lib/types/task.ts`

```typescript
/**
 * タスクの型定義
 * Phase 2: フィルター・ソート追加
 */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 新規タスク作成用の入力型
 */
export type CreateTaskInput = Pick<Task, 'title'>;

/**
 * タスク更新用の入力型
 */
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'completed'>>;

/**
 * フィルター種別
 */
export type TaskFilter = 'all' | 'pending' | 'completed';

/**
 * ソート種別
 */
export type TaskSort = 'createdAt' | 'updatedAt';

/**
 * ソート順
 */
export type SortOrder = 'asc' | 'desc';
```

### 確認ポイント

- [ ] `TaskFilter`, `TaskSort`, `SortOrder` 型が追加された
- [ ] TypeScript エラーがない（`npm run type-check`）

---

## Step 2: useTaskReducer にフィルター・ソート機能を追加

**ファイルパス:** `lib/hooks/useTaskReducer.ts`

以下の変更を行う：

### 2.1 型のインポートを更新

```typescript
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSort,
  SortOrder,
} from '@/lib/types/task';
```

### 2.2 状態にフィルター・ソートを追加

```typescript
// 状態型定義
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  filter: TaskFilter;
  sort: TaskSort;
  sortOrder: SortOrder;
}

// 初期状態
const initialState: TaskState = {
  tasks: [],
  isLoading: true,
  filter: 'all',
  sort: 'createdAt',
  sortOrder: 'desc',
};
```

### 2.3 アクション型を追加

```typescript
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: UpdateTaskInput } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: TaskFilter }
  | { type: 'SET_SORT'; payload: { sort: TaskSort; order: SortOrder } };
```

### 2.4 Reducer にケースを追加

```typescript
case 'SET_FILTER':
  return { ...state, filter: action.payload };

case 'SET_SORT':
  return {
    ...state,
    sort: action.payload.sort,
    sortOrder: action.payload.order
  };
```

### 2.5 フィルター・ソート関数を追加

```typescript
// フィルター適用
const getFilteredTasks = useCallback((tasks: Task[], filter: TaskFilter): Task[] => {
  switch (filter) {
    case 'pending':
      return tasks.filter((t) => !t.completed);
    case 'completed':
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}, []);

// ソート適用
const getSortedTasks = useCallback(
  (tasks: Task[], sort: TaskSort, order: SortOrder): Task[] => {
    return [...tasks].sort((a, b) => {
      const aValue = a[sort];
      const bValue = b[sort];
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  },
  []
);

// フィルター設定
const setFilter = useCallback((filter: TaskFilter) => {
  dispatch({ type: 'SET_FILTER', payload: filter });
}, []);

// ソート設定
const setSort = useCallback((sort: TaskSort, order: SortOrder) => {
  dispatch({ type: 'SET_SORT', payload: { sort, order } });
}, []);
```

### 2.6 戻り値を更新

```typescript
// フィルター・ソート済みタスク
const filteredTasks = useMemo(() => {
  const filtered = getFilteredTasks(state.tasks, state.filter);
  return getSortedTasks(filtered, state.sort, state.sortOrder);
}, [state.tasks, state.filter, state.sort, state.sortOrder, getFilteredTasks, getSortedTasks]);

return {
  tasks: filteredTasks,
  allTasks: state.tasks,
  isLoading: state.isLoading,
  filter: state.filter,
  sort: state.sort,
  sortOrder: state.sortOrder,
  stats,
  addTask,
  updateTask,
  deleteTask,
  toggleTask,
  setFilter,
  setSort,
};
```

### 確認ポイント

- [ ] フィルター・ソート機能が追加された
- [ ] TypeScript エラーがない（`npm run type-check`）

---

## Step 3: タスク編集コンポーネントの作成

**ファイルパス:** `components/tasks/TaskItem.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Circle, Pencil, Check, X } from 'lucide-react';
import type { Task } from '@/lib/types/task';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="text-gray-500 hover:text-green-600 flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle size={24} className="text-green-600" />
        ) : (
          <Circle size={24} />
        )}
      </button>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700"
          >
            <Check size={20} />
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 ${
              task.completed ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-blue-600"
          >
            <Pencil size={18} />
          </button>
        </>
      )}

      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-400 hover:text-red-600 flex-shrink-0"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/TaskItem.tsx` ファイルが作成された
- [ ] 編集・保存・キャンセル機能が含まれている

---

## Step 4: フィルター・ソートコンポーネントの作成

**ファイルパス:** `components/tasks/TaskFilters.tsx`

```typescript
'use client';

import { Filter, ArrowUpDown } from 'lucide-react';
import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';

interface TaskFiltersProps {
  filter: TaskFilter;
  sort: TaskSort;
  sortOrder: SortOrder;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort, order: SortOrder) => void;
}

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '未完了' },
  { value: 'completed', label: '完了' },
];

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: 'createdAt', label: '作成日' },
  { value: 'updatedAt', label: '更新日' },
];

export function TaskFilters({
  filter,
  sort,
  sortOrder,
  onFilterChange,
  onSortChange,
}: TaskFiltersProps) {
  const toggleSortOrder = () => {
    onSortChange(sort, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      {/* フィルター */}
      <div className="flex items-center gap-2">
        <Filter size={18} className="text-gray-500" />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ソート */}
      <div className="flex items-center gap-2">
        <ArrowUpDown size={18} className="text-gray-500" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TaskSort, sortOrder)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={toggleSortOrder}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          {sortOrder === 'desc' ? '新しい順' : '古い順'}
        </button>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/TaskFilters.tsx` ファイルが作成された
- [ ] フィルターボタンとソート選択が含まれている

---

## Step 5: タスクページの更新

**ファイルパス:** `app/(app)/tasks/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskReducer } from '@/lib/hooks/useTaskReducer';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskFilters } from '@/components/tasks/TaskFilters';

export default function TasksPage() {
  const {
    tasks,
    isLoading,
    stats,
    filter,
    sort,
    sortOrder,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setFilter,
    setSort,
  } = useTaskReducer();
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim() });
    setNewTitle('');
  };

  const handleUpdate = (id: string, title: string) => {
    updateTask(id, { title });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">タスク管理</h1>

      {/* 統計表示 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-600">全タスク</p>
        </div>
        <div className="bg-green-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">完了</p>
        </div>
        <div className="bg-yellow-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          <p className="text-sm text-yellow-600">未完了</p>
        </div>
      </div>

      {/* タスク追加フォーム */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="新しいタスクを入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={20} />
            追加
          </button>
        </div>
      </form>

      {/* フィルター・ソート */}
      <TaskFilters
        filter={filter}
        sort={sort}
        sortOrder={sortOrder}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      {/* タスク一覧 */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {filter === 'all'
              ? 'タスクがありません。新しいタスクを追加してください。'
              : filter === 'pending'
              ? '未完了のタスクはありません。'
              : '完了したタスクはありません。'}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] タスクページが更新された
- [ ] `TaskItem` と `TaskFilters` コンポーネントがインポートされている

---

## Step 6: 動作確認

### 6.1 フィルター機能テスト

1. いくつかタスクを追加（3個以上）
2. 一部を完了状態にする
3. フィルターボタンをクリック:

- [ ] 「すべて」- すべてのタスクが表示される
- [ ] 「未完了」- 未完了タスクのみ表示される
- [ ] 「完了」- 完了タスクのみ表示される

### 6.2 ソート機能テスト

1. 異なる時間にタスクを追加
2. ソートを切り替え:

- [ ] 「作成日」+「新しい順」- 新しいタスクが上
- [ ] 「作成日」+「古い順」- 古いタスクが上
- [ ] 「更新日」- タスクを完了/編集すると順序が変わる

### 6.3 編集機能テスト

1. タスクの鉛筆アイコンをクリック
- [ ] 編集モードに切り替わる
2. タイトルを変更して Enter または チェックアイコンをクリック
- [ ] タイトルが更新される
3. Escape または X アイコンをクリック
- [ ] 編集がキャンセルされる

---

## Step 7: 型チェックとビルド確認

```bash
# 型チェック
npm run type-check

# ビルド確認
npm run build
```

### 確認ポイント

- [ ] `npm run type-check` がエラーなしで完了
- [ ] `npm run build` がエラーなしで完了

---

## 完了チェックリスト

### ファイル作成

- [ ] `components/tasks/TaskItem.tsx` - タスクアイテムコンポーネント
- [ ] `components/tasks/TaskFilters.tsx` - フィルター・ソートコンポーネント

### ファイル修正

- [ ] `lib/types/task.ts` - フィルター・ソート型を追加
- [ ] `lib/hooks/useTaskReducer.ts` - フィルター・ソート機能を追加
- [ ] `app/(app)/tasks/page.tsx` - 新コンポーネントを使用するよう更新

### 機能確認

- [ ] フィルター（すべて / 未完了 / 完了）が動作する
- [ ] ソート（作成日 / 更新日）が動作する
- [ ] ソート順（新しい順 / 古い順）が動作する
- [ ] タスクの編集ができる
- [ ] ページリロード後も設定が保持される

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし
- [ ] ESLint エラーなし（`npm run lint`）

---

## 次のステップ

Phase 2 が完了したら、Phase 3 に進みます：
- Supabase Auth によるGoogle OAuth認証
- Cookie ベースのセッション管理
- middleware.ts の認証強化

---

## トラブルシューティング

### フィルターが動作しない

- `useTaskReducer` の戻り値に `filter`, `setFilter` が含まれているか確認
- `TaskFilters` コンポーネントに正しい props が渡されているか確認

### 編集が保存されない

- `updateTask` 関数が正しく呼ばれているか確認
- `UPDATE_TASK` アクションの reducer が正しく実装されているか確認

### コンポーネントが見つからない

```bash
# ディレクトリ構成を確認
ls -la components/tasks/
```

コンポーネントディレクトリが存在しない場合は作成：

```bash
mkdir -p components/tasks
```
