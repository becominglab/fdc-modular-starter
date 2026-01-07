# Phase 6: タスク優先度・期限機能 ランブック

## 目標

タスクに優先度と期限を追加して、より実用的なタスク管理を実現する：
- 優先度（高/中/低）の設定
- 期限日の設定
- 期限切れ・期限間近の視覚的表示
- 優先度・期限でのソート機能

## 前提条件

- [ ] Phase 5 完了（Realtime 同期が動作している）
- [ ] Supabase で `tasks` テーブルが作成済み
- [ ] `npm run dev` で http://localhost:3000 にアクセスできる

---

## Step 1: データベーススキーマの更新

### 1.1 Supabase ダッシュボードで SQL を実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. 以下の SQL を実行:

```sql
-- 優先度と期限カラムを追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

-- 優先度のインデックスを作成
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);

-- 期限のインデックスを作成
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
```

### 確認ポイント

- [ ] `priority` カラムが追加された
- [ ] `due_date` カラムが追加された
- [ ] インデックスが作成された

---

## Step 2: 型定義の更新

### 2.1 データベース型の更新

**ファイルパス:** `lib/types/database.ts`

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Priority = 'high' | 'medium' | 'low';

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          completed: boolean;
          priority: Priority;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          completed?: boolean;
          priority?: Priority;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          completed?: boolean;
          priority?: Priority;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type DbTask = Database['public']['Tables']['tasks']['Row'];
export type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];
```

### 2.2 localStorage 用タスク型の更新

**ファイルパス:** `lib/types/task.ts`

```typescript
/**
 * 優先度の型定義
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * タスクの型定義
 */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * 新規タスク作成用の入力型
 */
export type CreateTaskInput = Pick<Task, 'title'> & {
  priority?: Priority;
  dueDate?: string | null;
};

/**
 * タスク更新用の入力型
 */
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'completed' | 'priority' | 'dueDate'>>;

/**
 * フィルター型
 */
export type TaskFilter = 'all' | 'pending' | 'completed';

/**
 * ソート型
 */
export type TaskSort = 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';

/**
 * ソート順序
 */
export type SortOrder = 'asc' | 'desc';
```

### 確認ポイント

- [ ] `lib/types/database.ts` が更新された
- [ ] `lib/types/task.ts` が更新された
- [ ] `Priority` 型がエクスポートされている

---

## Step 3: 優先度バッジコンポーネントの作成

**ファイルパス:** `components/tasks/PriorityBadge.tsx`

```typescript
'use client';

import { AlertTriangle, Minus, ArrowDown } from 'lucide-react';
import type { Priority } from '@/lib/types/task';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

const priorityConfig = {
  high: {
    label: '高',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  medium: {
    label: '中',
    icon: Minus,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  low: {
    label: '低',
    icon: ArrowDown,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
};

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border ${config.className} ${sizeClasses}`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {config.label}
    </span>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/PriorityBadge.tsx` が作成された

---

## Step 4: 期限表示コンポーネントの作成

**ファイルパス:** `components/tasks/DueDateBadge.tsx`

```typescript
'use client';

import { Calendar, AlertCircle } from 'lucide-react';

interface DueDateBadgeProps {
  dueDate: string | null;
  completed?: boolean;
}

export function DueDateBadge({ dueDate, completed = false }: DueDateBadgeProps) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatus = () => {
    if (completed) {
      return {
        label: formatDate(due),
        className: 'bg-gray-100 text-gray-500',
        icon: Calendar,
      };
    }
    if (diffDays < 0) {
      return {
        label: `${Math.abs(diffDays)}日超過`,
        className: 'bg-red-100 text-red-700',
        icon: AlertCircle,
      };
    }
    if (diffDays === 0) {
      return {
        label: '今日',
        className: 'bg-orange-100 text-orange-700',
        icon: AlertCircle,
      };
    }
    if (diffDays <= 3) {
      return {
        label: `${diffDays}日後`,
        className: 'bg-yellow-100 text-yellow-700',
        icon: Calendar,
      };
    }
    return {
      label: formatDate(due),
      className: 'bg-gray-100 text-gray-600',
      icon: Calendar,
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${status.className}`}
    >
      <Icon size={12} />
      {status.label}
    </span>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/DueDateBadge.tsx` が作成された
- [ ] 期限切れ、今日、3日以内、通常の表示が分かれている

---

## Step 5: タスク作成/編集モーダルの作成

**ファイルパス:** `components/tasks/TaskFormModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Priority } from '@/lib/types/task';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; priority: Priority; dueDate: string | null }) => void;
  initialData?: {
    title: string;
    priority: Priority;
    dueDate: string | null;
  };
  mode: 'create' | 'edit';
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setPriority(initialData.priority);
      setDueDate(initialData.dueDate || '');
    } else {
      setTitle('');
      setPriority('medium');
      setDueDate('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      priority,
      dueDate: dueDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? 'タスクを追加' : 'タスクを編集'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクを入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* 優先度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              優先度
            </label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : p === 'medium'
                        ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                        : 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                </button>
              ))}
            </div>
          </div>

          {/* 期限 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期限日（任意）
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'create' ? '追加' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/TaskFormModal.tsx` が作成された
- [ ] 作成モードと編集モードがある

---

## Step 6: TaskItem コンポーネントの更新

**ファイルパス:** `components/tasks/TaskItem.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Circle, Pencil } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { DueDateBadge } from './DueDateBadge';
import type { Task, Priority } from '@/lib/types/task';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`${
              task.completed ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} size="sm" />
          <DueDateBadge dueDate={task.dueDate} completed={task.completed} />
        </div>
      </div>

      <button
        onClick={() => onEdit(task.id)}
        className="text-gray-400 hover:text-blue-600 flex-shrink-0"
      >
        <Pencil size={18} />
      </button>

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

- [ ] `components/tasks/TaskItem.tsx` が更新された
- [ ] 優先度バッジと期限バッジが表示される

---

## Step 7: useTaskReducer フックの更新

**ファイルパス:** `lib/hooks/useTaskReducer.ts`

以下の変更を適用：

1. `addTask` 関数で `priority` と `dueDate` を受け取る
2. ソートオプションに `priority` と `dueDate` を追加

```typescript
'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSort,
  SortOrder,
  Priority,
} from '@/lib/types/task';

// ローカルストレージのキー
const STORAGE_KEY = 'fdc-tasks';

// アクション型定義
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: UpdateTaskInput } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: TaskFilter }
  | { type: 'SET_SORT'; payload: { sort: TaskSort; order: SortOrder } };

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

    case 'SET_FILTER':
      return { ...state, filter: action.payload };

    case 'SET_SORT':
      return {
        ...state,
        sort: action.payload.sort,
        sortOrder: action.payload.order,
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
    if (!stored) return [];
    const tasks = JSON.parse(stored);
    // 既存タスクに新しいフィールドがない場合のマイグレーション
    return tasks.map((task: Task) => ({
      ...task,
      priority: task.priority || 'medium',
      dueDate: task.dueDate || null,
    }));
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

// 優先度の数値化（ソート用）
const priorityValue: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

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
      priority: input.priority || 'medium',
      dueDate: input.dueDate || null,
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

  // フィルター設定
  const setFilter = useCallback((filter: TaskFilter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  // ソート設定
  const setSort = useCallback((sort: TaskSort, order: SortOrder) => {
    dispatch({ type: 'SET_SORT', payload: { sort, order } });
  }, []);

  // フィルター適用
  const getFilteredTasks = useCallback(
    (tasks: Task[], filter: TaskFilter): Task[] => {
      switch (filter) {
        case 'pending':
          return tasks.filter((t) => !t.completed);
        case 'completed':
          return tasks.filter((t) => t.completed);
        default:
          return tasks;
      }
    },
    []
  );

  // ソート適用
  const getSortedTasks = useCallback(
    (tasks: Task[], sort: TaskSort, order: SortOrder): Task[] => {
      return [...tasks].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sort) {
          case 'priority':
            aValue = priorityValue[a.priority];
            bValue = priorityValue[b.priority];
            break;
          case 'dueDate':
            // null は最後に
            aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            break;
          case 'updatedAt':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
        }

        return order === 'asc' ? aValue - bValue : bValue - aValue;
      });
    },
    []
  );

  // フィルター・ソート済みタスク
  const filteredTasks = useMemo(() => {
    const filtered = getFilteredTasks(state.tasks, state.filter);
    return getSortedTasks(filtered, state.sort, state.sortOrder);
  }, [
    state.tasks,
    state.filter,
    state.sort,
    state.sortOrder,
    getFilteredTasks,
    getSortedTasks,
  ]);

  // 統計情報
  const stats = {
    total: state.tasks.length,
    completed: state.tasks.filter((t) => t.completed).length,
    pending: state.tasks.filter((t) => !t.completed).length,
  };

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
}
```

### 確認ポイント

- [ ] `lib/hooks/useTaskReducer.ts` が更新された
- [ ] 優先度・期限でソートできる

---

## Step 8: useRealtimeTasks フックの更新

**ファイルパス:** `lib/hooks/useRealtimeTasks.ts`

`addTask` 関数を更新して優先度と期限を受け取れるようにする：

```typescript
// addTask 関数を以下のように変更

// タスク追加（楽観的更新）
const addTask = useCallback(
  async (title: string, priority: Priority = 'medium', dueDate: string | null = null) => {
    if (!user) return;

    // 楽観的更新用の仮タスク
    const tempId = `temp-${Date.now()}`;
    const tempTask: DbTask = {
      id: tempId,
      user_id: user.id,
      title,
      completed: false,
      priority,
      due_date: dueDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // UIを即座に更新
    setTasks((prev) => [tempTask, ...prev]);

    try {
      const newTask = await createTask(title, user.id, priority, dueDate);
      // 仮タスクを実際のタスクに置き換え
      setTasks((prev) =>
        prev.map((task) => (task.id === tempId ? newTask : task))
      );
    } catch (err) {
      // エラー時は仮タスクを削除
      setTasks((prev) => prev.filter((task) => task.id !== tempId));
      setError(err instanceof Error ? err : new Error('Failed to create task'));
      throw err;
    }
  },
  [user]
);
```

### 確認ポイント

- [ ] `useRealtimeTasks` が優先度・期限を扱える

---

## Step 9: タスク API の更新

**ファイルパス:** `lib/api/tasks.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import type { DbTask, DbTaskInsert, DbTaskUpdate, Priority } from '@/lib/types/database';

export async function fetchTasks(): Promise<DbTask[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data || [];
}

export async function createTask(
  title: string,
  userId: string,
  priority: Priority = 'medium',
  dueDate: string | null = null
): Promise<DbTask> {
  const supabase = createClient();
  const newTask: DbTaskInsert = {
    title,
    user_id: userId,
    completed: false,
    priority,
    due_date: dueDate,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data;
}

export async function updateTask(
  id: string,
  updates: DbTaskUpdate
): Promise<DbTask> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<DbTask> {
  return updateTask(id, { completed });
}
```

### 確認ポイント

- [ ] `lib/api/tasks.ts` が更新された
- [ ] `createTask` が優先度・期限を受け取る

---

## Step 10: TaskFilters コンポーネントの更新

**ファイルパス:** `components/tasks/TaskFilters.tsx`

ソートオプションに優先度と期限を追加：

```typescript
'use client';

import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';

interface TaskFiltersProps {
  filter: TaskFilter;
  sort: TaskSort;
  sortOrder: SortOrder;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort, order: SortOrder) => void;
}

const filters: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '未完了' },
  { value: 'completed', label: '完了' },
];

const sorts: { value: TaskSort; label: string }[] = [
  { value: 'createdAt', label: '作成日' },
  { value: 'updatedAt', label: '更新日' },
  { value: 'priority', label: '優先度' },
  { value: 'dueDate', label: '期限' },
];

export function TaskFilters({
  filter,
  sort,
  sortOrder,
  onFilterChange,
  onSortChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {/* フィルター */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">表示:</span>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ソート */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">並び順:</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TaskSort, sortOrder)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            onSortChange(sort, sortOrder === 'asc' ? 'desc' : 'asc')
          }
          className="px-2 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/TaskFilters.tsx` が更新された
- [ ] 優先度・期限でソートできる

---

## Step 11: タスクページの更新

**ファイルパス:** `app/(app)/tasks/page.tsx`

モーダルを使用したタスク作成・編集に対応：

（コードは長いため、主要な変更点のみ）

1. `TaskFormModal` をインポート
2. モーダルの開閉状態を管理
3. 「追加」ボタンでモーダルを開く
4. 編集ボタンでモーダルを開く（既存データをセット）

### 確認ポイント

- [ ] タスク追加でモーダルが開く
- [ ] 優先度と期限を設定できる
- [ ] 編集でモーダルが開く

---

## Step 12: 動作確認

### 12.1 優先度機能テスト

1. タスクを追加（優先度: 高）
   - [ ] 赤いバッジが表示される
2. タスクを追加（優先度: 中）
   - [ ] 黄色いバッジが表示される
3. タスクを追加（優先度: 低）
   - [ ] 青いバッジが表示される
4. 優先度でソート
   - [ ] 高→中→低 または 低→中→高 の順に並ぶ

### 12.2 期限機能テスト

1. 期限を今日に設定
   - [ ] 「今日」と表示される（オレンジ）
2. 期限を3日以内に設定
   - [ ] 「○日後」と表示される（黄色）
3. 期限を過去に設定
   - [ ] 「○日超過」と表示される（赤）
4. 期限でソート
   - [ ] 期限順に並ぶ

### 12.3 編集機能テスト

1. タスクの編集アイコンをクリック
   - [ ] モーダルが開く
   - [ ] 既存の値がセットされている
2. 優先度・期限を変更して保存
   - [ ] 変更が反映される

---

## Step 13: 型チェックとビルド確認

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

### データベース設定

- [ ] `priority` カラムが追加された
- [ ] `due_date` カラムが追加された
- [ ] インデックスが作成された

### ファイル作成

- [ ] `components/tasks/PriorityBadge.tsx` - 優先度バッジ
- [ ] `components/tasks/DueDateBadge.tsx` - 期限バッジ
- [ ] `components/tasks/TaskFormModal.tsx` - 作成/編集モーダル

### ファイル修正

- [ ] `lib/types/database.ts` - Priority 型追加
- [ ] `lib/types/task.ts` - Priority, dueDate 追加
- [ ] `lib/api/tasks.ts` - createTask に優先度・期限追加
- [ ] `lib/hooks/useTaskReducer.ts` - 優先度・期限対応
- [ ] `lib/hooks/useRealtimeTasks.ts` - 優先度・期限対応
- [ ] `components/tasks/TaskItem.tsx` - バッジ表示追加
- [ ] `components/tasks/TaskFilters.tsx` - ソートオプション追加
- [ ] `app/(app)/tasks/page.tsx` - モーダル対応

### 機能確認

- [ ] 優先度の設定・表示ができる
- [ ] 期限の設定・表示ができる
- [ ] 期限切れが視覚的にわかる
- [ ] 優先度・期限でソートできる
- [ ] 編集モーダルが動作する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 6 が完了したら、以下の拡張が可能：
- タスクのカテゴリ・タグ機能
- ドラッグ＆ドロップ並び替え
- 通知機能（期限リマインダー）
- カレンダービュー

---

## トラブルシューティング

### 優先度カラムが見つからない

```sql
-- カラムの存在確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks';
```

### 既存タスクに優先度がない

```sql
-- デフォルト値を設定
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;
```

### 期限のソートがおかしい

- `null` 値の扱いを確認
- タイムゾーンの設定を確認

### モーダルが閉じない

- `onClose` の呼び出しを確認
- 状態管理のリセットを確認
