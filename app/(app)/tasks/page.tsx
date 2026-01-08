'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTasks } from '@/lib/hooks/useTasks';
import { TaskBoard, AddTaskForm } from '@/components/tasks';
import type { Task, TaskStatus } from '@/lib/types/task';

export default function TasksPage() {
  const {
    tasksBySuit,
    stats,
    isLoading,
    error,
    addTask,
    updateSuit,
    updateStatus,
    deleteTask,
  } = useTasks();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('このタスクを削除しますか？')) {
      await deleteTask(id);
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateStatus(id, status);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラー: {error.message}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タスクボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            アイゼンハワーマトリクスでタスクを管理
          </p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          タスクを追加
        </button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">合計</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-700">{stats.bySuit.spade}</p>
          <p className="text-xs text-gray-500">♠ スペード</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.bySuit.heart}</p>
          <p className="text-xs text-gray-500">♥ ハート</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.bySuit.diamond}</p>
          <p className="text-xs text-gray-500">♦ ダイヤ</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.bySuit.club}</p>
          <p className="text-xs text-gray-500">♣ クラブ</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.bySuit.joker}</p>
          <p className="text-xs text-gray-500">? Joker</p>
        </div>
      </div>

      {/* タスクボード */}
      <TaskBoard
        tasksBySuit={tasksBySuit}
        onSuitChange={updateSuit}
        onEdit={setEditingTask}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* タスク追加フォーム */}
      <AddTaskForm
        isOpen={isAddFormOpen}
        onAdd={addTask}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
