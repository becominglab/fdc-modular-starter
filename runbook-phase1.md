# Phase 1: localStorage タスク管理 ランブック

## 目標

基本的なタスク管理機能を localStorage で実装する：
- シンプルな Task 型定義
- useReducer による状態管理
- localStorage への保存・読み込み
- タスクの CRUD 操作

## 前提条件

- [ ] Phase 0 完了（スターター起動済み）
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる

---

## Step 1: Task 型定義の作成

**ファイルパス:** `lib/types/task.ts`

```typescript
/**
 * タスクの型定義
 * Phase 1: localStorage 版
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
```

### 確認ポイント

- [ ] `lib/types/task.ts` ファイルが作成された
- [ ] TypeScript エラーがない（`npm run type-check`）

---

## Step 2: useTaskReducer フックの作成

**ファイルパス:** `lib/hooks/useTaskReducer.ts`

```typescript
'use client';

import { useReducer, useEffect, useCallback } from 'react';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types/task';

// ローカルストレージのキー
const STORAGE_KEY = 'fdc-tasks';

// アクション型定義
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: UpdateTaskInput } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string };

// 状態型定義
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
}

// 初期状態
const initialState: TaskState = {
  tasks: [],
  isLoading: true,
};

// Reducer 関数
function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, isLoading: false };

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };

    case 'UPDATE_TASK': {
      const { id, updates } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, ...updates, updatedAt: Date.now() }
            : task
        ),
      };
    }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload
            ? { ...task, completed: !task.completed, updatedAt: Date.now() }
            : task
        ),
      };

    default:
      return state;
  }
}

// localStorage から読み込み
function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('Failed to load tasks from localStorage');
    return [];
  }
}

// localStorage に保存
function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.error('Failed to save tasks to localStorage');
  }
}

// UUID 生成
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * タスク管理用カスタムフック
 */
export function useTaskReducer() {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // 初期読み込み
  useEffect(() => {
    const tasks = loadTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);

  // 変更時に保存
  useEffect(() => {
    if (!state.isLoading) {
      saveTasks(state.tasks);
    }
  }, [state.tasks, state.isLoading]);

  // タスク追加
  const addTask = useCallback((input: CreateTaskInput) => {
    const now = Date.now();
    const newTask: Task = {
      id: generateId(),
      title: input.title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  // タスク更新
  const updateTask = useCallback((id: string, updates: UpdateTaskInput) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
  }, []);

  // タスク削除
  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

  // タスク完了切り替え
  const toggleTask = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TASK', payload: id });
  }, []);

  // 統計情報
  const stats = {
    total: state.tasks.length,
    completed: state.tasks.filter((t) => t.completed).length,
    pending: state.tasks.filter((t) => !t.completed).length,
  };

  return {
    tasks: state.tasks,
    isLoading: state.isLoading,
    stats,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useTaskReducer.ts` ファイルが作成された
- [ ] TypeScript エラーがない（`npm run type-check`）

---

## Step 3: タスク一覧ページの作成

**ファイルパス:** `app/(app)/tasks/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { useTaskReducer } from '@/lib/hooks/useTaskReducer';

export default function TasksPage() {
  const { tasks, isLoading, stats, addTask, deleteTask, toggleTask } =
    useTaskReducer();
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim() });
    setNewTitle('');
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

      {/* タスク一覧 */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            タスクがありません。新しいタスクを追加してください。
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="text-gray-500 hover:text-green-600"
              >
                {task.completed ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <Circle size={24} />
                )}
              </button>
              <span
                className={`flex-1 ${
                  task.completed ? 'line-through text-gray-400' : ''
                }`}
              >
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/tasks/page.tsx` ファイルが作成された
- [ ] http://localhost:3000/tasks でページが表示される
- [ ] TypeScript エラーがない（`npm run type-check`）

---

## Step 4: ナビゲーションにタスクリンクを追加

**ファイルパス:** `app/(app)/layout.tsx`

### 変更内容

1. `lucide-react` から `CheckSquare` をインポート
2. `NAV_ITEMS` 配列にタスクリンクを追加

```typescript
// インポートに追加
import { CheckSquare } from 'lucide-react';

// NAV_ITEMS 配列に追加（既存の配列を探して追加）
const NAV_ITEMS = [
  // ... 既存のアイテム
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
];
```

### 確認ポイント

- [ ] サイドナビゲーションに「タスク」リンクが表示される
- [ ] クリックして `/tasks` ページに遷移できる

---

## Step 5: 動作確認

### 5.1 基本機能テスト

1. http://localhost:3000/tasks にアクセス
2. 以下を確認：

- [ ] 統計表示（全タスク: 0、完了: 0、未完了: 0）が表示される
- [ ] 「タスクがありません」メッセージが表示される

### 5.2 CRUD 操作テスト

1. **タスク追加**
   - [ ] 入力欄に「テストタスク1」と入力して「追加」ボタンをクリック
   - [ ] タスクがリストに追加される
   - [ ] 統計が更新される（全タスク: 1、未完了: 1）

2. **タスク完了**
   - [ ] タスク左のサークルアイコンをクリック
   - [ ] タスクに打ち消し線が表示される
   - [ ] 統計が更新される（完了: 1、未完了: 0）

3. **タスク削除**
   - [ ] タスク右のゴミ箱アイコンをクリック
   - [ ] タスクがリストから削除される
   - [ ] 統計が更新される

### 5.3 永続化テスト

1. いくつかタスクを追加
2. ブラウザをリロード（F5 または Cmd+R）
3. [ ] タスクが保持されている

---

## Step 6: 型チェックとビルド確認

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

- [ ] `lib/types/task.ts` - Task 型定義
- [ ] `lib/hooks/useTaskReducer.ts` - useReducer + localStorage フック
- [ ] `app/(app)/tasks/page.tsx` - タスク一覧ページ

### ファイル修正

- [ ] `app/(app)/layout.tsx` - NAV_ITEMS にタスクリンク追加

### 機能確認

- [ ] タスクの追加ができる
- [ ] タスクの完了/未完了切り替えができる
- [ ] タスクの削除ができる
- [ ] 統計（全タスク数、完了数、未完了数）が正しく表示される
- [ ] ページリロード後もタスクが保持される（localStorage）

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし
- [ ] ESLint エラーなし（`npm run lint`）

---

## 次のステップ

Phase 1 が完了したら、Phase 2 に進みます：
- タスクのフィルタリング機能
- タスクの並べ替え機能
- より詳細な UI 改善

---

## トラブルシューティング

### localStorage が動作しない

```typescript
// ブラウザの開発者ツールで確認
localStorage.getItem('fdc-tasks');
```

### 型エラーが発生する

```bash
# node_modules を再インストール
rm -rf node_modules
npm install
```

### ページが 404 になる

- `app/(app)/tasks/page.tsx` のパスが正しいか確認
- 開発サーバーを再起動: `npm run dev`
