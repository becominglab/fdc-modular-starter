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
