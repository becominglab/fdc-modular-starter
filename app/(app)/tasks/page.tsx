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
