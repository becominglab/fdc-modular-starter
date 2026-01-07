# Phase 4: Supabase Database 連携 ランブック

## 目標

タスクデータを localStorage からクラウドに移行する：
- Supabase Database にタスクテーブルを作成
- Row Level Security (RLS) でユーザーごとのデータ分離
- リアルタイム同期の準備
- localStorage からの移行サポート

## 前提条件

- [ ] Phase 3 完了（Supabase Auth が動作している）
- [ ] Supabase プロジェクトが作成済み
- [ ] `.env.local` に Supabase の設定が完了している

---

## Step 1: データベーステーブルの作成

### 1.1 Supabase ダッシュボードで SQL を実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. 以下の SQL を実行:

```sql
-- タスクテーブルの作成
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のタスクのみ参照可能
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- ポリシー: ユーザーは自分のタスクのみ作成可能
CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ポリシー: ユーザーは自分のタスクのみ更新可能
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- ポリシー: ユーザーは自分のタスクのみ削除可能
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 確認ポイント

- [ ] `tasks` テーブルが作成された
- [ ] RLS ポリシーが有効化された
- [ ] インデックスが作成された

---

## Step 2: データベース型定義の生成

### 2.1 Supabase CLI で型を生成

```bash
# プロジェクトにリンク
supabase link --project-ref scxftlglgylcepwucmoj

# 型定義を生成
supabase gen types typescript --linked > lib/types/database.ts
```

### 2.2 手動で型定義を作成（CLI が使えない場合）

**ファイルパス:** `lib/types/database.ts`

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
```

### 確認ポイント

- [ ] `lib/types/database.ts` が作成された
- [ ] Task 型がエクスポートされている

---

## Step 3: Supabase クライアントに型を追加

**ファイルパス:** `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**ファイルパス:** `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は無視
          }
        },
      },
    }
  );
}
```

### 確認ポイント

- [ ] クライアントに Database 型が追加された

---

## Step 4: タスク API の作成

**ファイルパス:** `lib/api/tasks.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskInsert, TaskUpdate } from '@/lib/types/database';

const supabase = createClient();

export async function fetchTasks(): Promise<Task[]> {
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

export async function createTask(title: string, userId: string): Promise<Task> {
  const newTask: TaskInsert = {
    title,
    user_id: userId,
    completed: false,
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
  updates: TaskUpdate
): Promise<Task> {
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
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<Task> {
  return updateTask(id, { completed });
}
```

### 確認ポイント

- [ ] `lib/api/tasks.ts` が作成された
- [ ] CRUD 操作がすべて実装されている

---

## Step 5: useSupabaseTasks フックの作成

**ファイルパス:** `lib/hooks/useSupabaseTasks.ts`

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from '@/lib/api/tasks';
import type { Task } from '@/lib/types/database';
import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';

export function useSupabaseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // タスク取得
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 初期読み込み
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク追加
  const addTask = useCallback(
    async (title: string) => {
      if (!user) return;

      try {
        const newTask = await createTask(title, user.id);
        setTasks((prev) => [newTask, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create task'));
        throw err;
      }
    },
    [user]
  );

  // タスク更新
  const handleUpdateTask = useCallback(
    async (id: string, updates: { title?: string; completed?: boolean }) => {
      try {
        const updatedTask = await updateTask(id, updates);
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    []
  );

  // タスク削除
  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete task'));
      throw err;
    }
  }, []);

  // タスク完了切り替え
  const handleToggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      const updatedTask = await toggleTask(id, !task.completed);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? updatedTask : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle task'));
      throw err;
    }
  }, [tasks]);

  // ソート設定
  const handleSetSort = useCallback((newSort: TaskSort, newOrder: SortOrder) => {
    setSort(newSort);
    setSortOrder(newOrder);
  }, []);

  // フィルター・ソート済みタスク
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // フィルター適用
    if (filter === 'pending') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // ソート適用
    result.sort((a, b) => {
      const aValue = sort === 'createdAt'
        ? new Date(a.created_at).getTime()
        : new Date(a.updated_at).getTime();
      const bValue = sort === 'createdAt'
        ? new Date(b.created_at).getTime()
        : new Date(b.updated_at).getTime();
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return result;
  }, [tasks, filter, sort, sortOrder]);

  // 統計情報
  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
    }),
    [tasks]
  );

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    isLoading,
    error,
    filter,
    sort,
    sortOrder,
    stats,
    addTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    toggleTask: handleToggleTask,
    setFilter,
    setSort: handleSetSort,
    reload: loadTasks,
  };
}
```

### 確認ポイント

- [ ] `lib/hooks/useSupabaseTasks.ts` が作成された
- [ ] フィルター・ソート機能が含まれている

---

## Step 6: タスクページの更新

**ファイルパス:** `app/(app)/tasks/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSupabaseTasks } from '@/lib/hooks/useSupabaseTasks';
import { useTaskReducer } from '@/lib/hooks/useTaskReducer';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskFilters } from '@/components/tasks/TaskFilters';

export default function TasksPage() {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState('');

  // Supabase 認証ユーザーは Supabase を使用
  // デモユーザーは localStorage を使用
  const supabaseTasks = useSupabaseTasks();
  const localTasks = useTaskReducer();

  // 認証方式に応じてフックを選択
  const isSupabaseUser = !!user;
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
  } = isSupabaseUser ? supabaseTasks : localTasks;

  const error = isSupabaseUser ? supabaseTasks.error : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      if (isSupabaseUser) {
        await addTask(newTitle.trim());
      } else {
        addTask({ title: newTitle.trim() });
      }
      setNewTitle('');
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleUpdate = async (id: string, title: string) => {
    try {
      if (isSupabaseUser) {
        await updateTask(id, { title });
      } else {
        updateTask(id, { title });
      }
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleTask(id);
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
    } catch {
      // エラーはフック内で処理される
    }
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

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={20} />
          <span>{error.message}</span>
        </div>
      )}

      {/* データソース表示 */}
      <div className="mb-4 text-sm text-gray-500">
        {isSupabaseUser ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
            クラウド同期
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
            ローカル保存（デモモード）
          </span>
        )}
      </div>

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
              task={{
                id: task.id,
                title: task.title,
                completed: task.completed,
                createdAt: typeof task.created_at === 'string'
                  ? new Date(task.created_at).getTime()
                  : task.createdAt,
                updatedAt: typeof task.updated_at === 'string'
                  ? new Date(task.updated_at).getTime()
                  : task.updatedAt,
              }}
              onToggle={handleToggle}
              onDelete={handleDelete}
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

- [ ] Supabase 認証時はクラウド保存
- [ ] デモ認証時は localStorage 保存
- [ ] データソースがUIに表示される

---

## Step 7: 動作確認

### 7.1 デモ認証でのテスト（localStorage）

1. http://localhost:3000/login にアクセス
2. パスワード `fdc` でデモログイン
3. タスクページを開く
- [ ] 「ローカル保存（デモモード）」と表示される
4. タスクを追加・完了・削除
- [ ] localStorage に保存される

### 7.2 Google 認証でのテスト（Supabase）

1. Google でログイン
2. タスクページを開く
- [ ] 「クラウド同期」と表示される
3. タスクを追加
- [ ] Supabase Database に保存される
4. ページをリロード
- [ ] タスクが保持されている
5. 別のブラウザ/デバイスでログイン
- [ ] 同じタスクが表示される

### 7.3 RLS テスト

1. ユーザー A でタスクを作成
2. ユーザー B でログイン
- [ ] ユーザー A のタスクは表示されない

---

## Step 8: 型チェックとビルド確認

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

- [ ] `tasks` テーブルが作成された
- [ ] RLS ポリシーが設定された
- [ ] インデックスが作成された

### ファイル作成

- [ ] `lib/types/database.ts` - データベース型定義
- [ ] `lib/api/tasks.ts` - タスク API
- [ ] `lib/hooks/useSupabaseTasks.ts` - Supabase タスクフック

### ファイル修正

- [ ] `lib/supabase/client.ts` - Database 型追加
- [ ] `lib/supabase/server.ts` - Database 型追加
- [ ] `app/(app)/tasks/page.tsx` - 両データソース対応

### 機能確認

- [ ] Google 認証時はクラウドに保存される
- [ ] デモ認証時は localStorage に保存される
- [ ] RLS が正しく機能している
- [ ] フィルター・ソートが動作する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 4 が完了したら、以下の拡張が可能：
- リアルタイム同期（Supabase Realtime）
- オフライン対応
- タスクの優先度・期限機能

---

## トラブルシューティング

### RLS でアクセス拒否される

1. Supabase ダッシュボードで RLS ポリシーを確認
2. `auth.uid()` が正しく取得できているか確認
3. テーブルの RLS が有効か確認

### タスクが保存されない

1. ブラウザの開発者ツールでエラーを確認
2. Supabase ダッシュボードの Logs を確認
3. ネットワークタブで API レスポンスを確認

### 型エラーが発生する

```bash
# 型定義を再生成
supabase gen types typescript --linked > lib/types/database.ts
```

### データベース接続エラー

1. `.env.local` の URL と Key を確認
2. Supabase プロジェクトがアクティブか確認
3. ネットワーク接続を確認
