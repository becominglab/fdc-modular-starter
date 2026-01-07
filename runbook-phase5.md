# Phase 5: Supabase Realtime リアルタイム同期 ランブック

## 目標

複数デバイス・タブ間でタスクをリアルタイム同期する：
- Supabase Realtime でデータベース変更を監視
- 他のデバイスでの変更を即座に反映
- 接続状態の表示
- 再接続時の自動同期

## 前提条件

- [ ] Phase 4 完了（Supabase Database が動作している）
- [ ] Supabase で `tasks` テーブルが作成済み
- [ ] RLS ポリシーが設定済み

---

## Step 1: Supabase Realtime の有効化

### 1.1 Supabase ダッシュボードで設定

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Database」→「Replication」を開く
4. `tasks` テーブルの Realtime を有効化（トグルをON）

### 1.2 確認

- [ ] `tasks` テーブルで Realtime が有効になっている

---

## Step 2: 接続状態管理の型定義

**ファイルパス:** `lib/types/realtime.ts`

```typescript
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeState {
  status: ConnectionStatus;
  lastSyncedAt: Date | null;
  error: Error | null;
}
```

### 確認ポイント

- [ ] `lib/types/realtime.ts` が作成された

---

## Step 3: useRealtimeTasks フックの作成

**ファイルパス:** `lib/hooks/useRealtimeTasks.ts`

```typescript
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from '@/lib/api/tasks';
import type { DbTask, DbTaskUpdate } from '@/lib/types/database';
import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';
import type { ConnectionStatus } from '@/lib/types/realtime';

export function useRealtimeTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

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
      setLastSyncedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Realtime サブスクリプション設定
  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    // チャンネル作成
    const channel = supabase
      .channel(`tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTask = payload.new as DbTask;
          setTasks((prev) => {
            // 重複チェック（楽観的更新との競合防止）
            if (prev.some((t) => t.id === newTask.id)) {
              return prev;
            }
            return [newTask, ...prev];
          });
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedTask = payload.new as DbTask;
          setTasks((prev) =>
            prev.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedTask = payload.old as { id: string };
          setTasks((prev) =>
            prev.filter((task) => task.id !== deletedTask.id)
          );
          setLastSyncedAt(new Date());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    // クリーンアップ
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, supabase]);

  // 初期読み込み
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスク追加（楽観的更新）
  const addTask = useCallback(
    async (title: string) => {
      if (!user) return;

      // 楽観的更新用の仮タスク
      const tempId = `temp-${Date.now()}`;
      const tempTask: DbTask = {
        id: tempId,
        user_id: user.id,
        title,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // UIを即座に更新
      setTasks((prev) => [tempTask, ...prev]);

      try {
        const newTask = await createTask(title, user.id);
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

  // タスク更新（楽観的更新）
  const handleUpdateTask = useCallback(
    async (id: string, updates: DbTaskUpdate) => {
      // 元の状態を保存
      const originalTasks = tasks;

      // UIを即座に更新
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, ...updates, updated_at: new Date().toISOString() }
            : task
        )
      );

      try {
        await updateTask(id, updates);
      } catch (err) {
        // エラー時は元に戻す
        setTasks(originalTasks);
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    [tasks]
  );

  // タスク削除（楽観的更新）
  const handleDeleteTask = useCallback(
    async (id: string) => {
      // 元の状態を保存
      const originalTasks = tasks;
      const deletedTask = tasks.find((t) => t.id === id);

      // UIを即座に更新
      setTasks((prev) => prev.filter((task) => task.id !== id));

      try {
        await deleteTask(id);
      } catch (err) {
        // エラー時は元に戻す
        if (deletedTask) {
          setTasks(originalTasks);
        }
        setError(err instanceof Error ? err : new Error('Failed to delete task'));
        throw err;
      }
    },
    [tasks]
  );

  // タスク完了切り替え（楽観的更新）
  const handleToggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // 元の状態を保存
      const originalTasks = tasks;

      // UIを即座に更新
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, completed: !t.completed, updated_at: new Date().toISOString() }
            : t
        )
      );

      try {
        await toggleTask(id, !task.completed);
      } catch (err) {
        // エラー時は元に戻す
        setTasks(originalTasks);
        setError(err instanceof Error ? err : new Error('Failed to toggle task'));
        throw err;
      }
    },
    [tasks]
  );

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
      const aValue =
        sort === 'createdAt'
          ? new Date(a.created_at).getTime()
          : new Date(a.updated_at).getTime();
      const bValue =
        sort === 'createdAt'
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
    connectionStatus,
    lastSyncedAt,
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

- [ ] `lib/hooks/useRealtimeTasks.ts` が作成された
- [ ] 楽観的更新が実装されている
- [ ] 接続状態の管理が含まれている

---

## Step 4: 接続状態インジケーターの作成

**ファイルパス:** `components/tasks/ConnectionStatus.tsx`

```typescript
'use client';

import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '@/lib/types/realtime';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  lastSyncedAt: Date | null;
}

export function ConnectionStatus({ status, lastSyncedAt }: ConnectionStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi size={16} />,
          text: 'リアルタイム接続中',
          className: 'bg-green-100 text-green-700',
        };
      case 'connecting':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          text: '接続中...',
          className: 'bg-yellow-100 text-yellow-700',
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={16} />,
          text: 'オフライン',
          className: 'bg-gray-100 text-gray-700',
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: '接続エラー',
          className: 'bg-red-100 text-red-700',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded ${config.className}`}
      >
        {config.icon}
        {config.text}
      </span>
      {lastSyncedAt && status === 'connected' && (
        <span className="text-gray-500">
          最終同期: {formatTime(lastSyncedAt)}
        </span>
      )}
    </div>
  );
}
```

### 確認ポイント

- [ ] `components/tasks/ConnectionStatus.tsx` が作成された
- [ ] 4つの接続状態が表示される

---

## Step 5: タスクページの更新

**ファイルパス:** `app/(app)/tasks/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRealtimeTasks } from '@/lib/hooks/useRealtimeTasks';
import { useTaskReducer } from '@/lib/hooks/useTaskReducer';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { ConnectionStatus } from '@/components/tasks/ConnectionStatus';

export default function TasksPage() {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState('');

  // Supabase 認証ユーザーは Realtime を使用
  // デモユーザーは localStorage を使用
  const realtimeTasks = useRealtimeTasks();
  const localTasks = useTaskReducer();

  // 認証方式に応じてフックを選択
  const isSupabaseUser = !!user;

  // 共通プロパティを取得
  const tasks = isSupabaseUser ? realtimeTasks.tasks : localTasks.tasks;
  const isLoading = isSupabaseUser ? realtimeTasks.isLoading : localTasks.isLoading;
  const stats = isSupabaseUser ? realtimeTasks.stats : localTasks.stats;
  const filter = isSupabaseUser ? realtimeTasks.filter : localTasks.filter;
  const sort = isSupabaseUser ? realtimeTasks.sort : localTasks.sort;
  const sortOrder = isSupabaseUser ? realtimeTasks.sortOrder : localTasks.sortOrder;
  const error = isSupabaseUser ? realtimeTasks.error : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      if (isSupabaseUser) {
        await realtimeTasks.addTask(newTitle.trim());
      } else {
        localTasks.addTask({ title: newTitle.trim() });
      }
      setNewTitle('');
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleUpdate = async (id: string, title: string) => {
    try {
      if (isSupabaseUser) {
        await realtimeTasks.updateTask(id, { title });
      } else {
        localTasks.updateTask(id, { title });
      }
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleToggle = async (id: string) => {
    try {
      if (isSupabaseUser) {
        await realtimeTasks.toggleTask(id);
      } else {
        localTasks.toggleTask(id);
      }
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (isSupabaseUser) {
        await realtimeTasks.deleteTask(id);
      } else {
        localTasks.deleteTask(id);
      }
    } catch {
      // エラーはフック内で処理される
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'completed') => {
    if (isSupabaseUser) {
      realtimeTasks.setFilter(newFilter);
    } else {
      localTasks.setFilter(newFilter);
    }
  };

  const handleSortChange = (newSort: 'createdAt' | 'updatedAt', newOrder: 'asc' | 'desc') => {
    if (isSupabaseUser) {
      realtimeTasks.setSort(newSort, newOrder);
    } else {
      localTasks.setSort(newSort, newOrder);
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

      {/* 接続状態表示 */}
      <div className="mb-4">
        {isSupabaseUser ? (
          <ConnectionStatus
            status={realtimeTasks.connectionStatus}
            lastSyncedAt={realtimeTasks.lastSyncedAt}
          />
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
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
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
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
                createdAt:
                  'created_at' in task
                    ? new Date(task.created_at).getTime()
                    : task.createdAt,
                updatedAt:
                  'updated_at' in task
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

- [ ] `useRealtimeTasks` に置き換わっている
- [ ] `ConnectionStatus` コンポーネントが表示される

---

## Step 6: 動作確認

### 6.1 リアルタイム同期テスト

1. Google でログイン
2. タスクページを開く
3. **別のタブ** で同じページを開く
4. タブ A でタスクを追加
- [ ] タブ B に即座に反映される
5. タブ B でタスクを完了
- [ ] タブ A に即座に反映される
6. タブ A でタスクを削除
- [ ] タブ B から即座に消える

### 6.2 接続状態テスト

1. ページを開く
- [ ] 「接続中...」→「リアルタイム接続中」と表示される
2. ネットワークを切断（開発者ツール → Network → Offline）
- [ ] 「オフライン」と表示される
3. ネットワークを復帰
- [ ] 「リアルタイム接続中」に戻る

### 6.3 楽観的更新テスト

1. タスクを追加
- [ ] 即座にUIに表示される（サーバー応答を待たない）
2. タスクを完了
- [ ] 即座にチェックが入る

### 6.4 デモモードテスト

1. デモログインでタスクページを開く
- [ ] 「ローカル保存（デモモード）」と表示される
- [ ] localStorage で動作する（Realtime なし）

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

### Supabase 設定

- [ ] `tasks` テーブルで Realtime が有効化された

### ファイル作成

- [ ] `lib/types/realtime.ts` - 接続状態の型定義
- [ ] `lib/hooks/useRealtimeTasks.ts` - Realtime タスクフック
- [ ] `components/tasks/ConnectionStatus.tsx` - 接続状態インジケーター

### ファイル修正

- [ ] `app/(app)/tasks/page.tsx` - Realtime フック使用

### 機能確認

- [ ] 複数タブ間でリアルタイム同期する
- [ ] 接続状態が正しく表示される
- [ ] 楽観的更新が動作する
- [ ] デモモードは従来通り動作する

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 5 が完了したら、以下の拡張が可能：
- オフライン対応（Service Worker）
- タスクの優先度・期限機能
- タスクのカテゴリ・タグ機能
- ドラッグ＆ドロップ並び替え

---

## トラブルシューティング

### Realtime が動作しない

1. Supabase ダッシュボードで Realtime が有効か確認
2. RLS ポリシーが正しく設定されているか確認
3. ブラウザの開発者ツールでWebSocket接続を確認

### 重複してタスクが表示される

1. 楽観的更新と Realtime の競合
2. `useRealtimeTasks` の重複チェックロジックを確認

### 接続が頻繁に切れる

1. ネットワーク状態を確認
2. Supabase プロジェクトのプラン制限を確認

### 楽観的更新後にロールバックされる

1. サーバーエラーが発生している可能性
2. RLS ポリシーで拒否されている可能性
3. ブラウザコンソールでエラーを確認

---

## 技術的な補足

### 楽観的更新（Optimistic Update）とは

ユーザーアクションに対して、サーバー応答を待たずにUIを即座に更新する手法：

1. ユーザーがタスクを追加
2. **即座に** UIにタスクを表示（仮ID使用）
3. バックグラウンドでサーバーに送信
4. 成功時：仮IDを本物のIDに置き換え
5. 失敗時：UIから削除してエラー表示

**メリット:**
- ユーザー体験の向上（遅延を感じない）
- レスポンシブなUI

**デメリット:**
- 実装の複雑さ
- エラー時のロールバック処理が必要

### Supabase Realtime の仕組み

1. WebSocket で Supabase に接続
2. PostgreSQL の変更をリッスン
3. 変更があると即座にクライアントに通知
4. クライアントでローカルステートを更新

**フィルター:** `filter: user_id=eq.${user.id}` で自分のデータのみ受信
