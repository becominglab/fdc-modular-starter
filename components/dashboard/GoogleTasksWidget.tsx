'use client';

import { CheckSquare, Square } from 'lucide-react';
import { useGoogleTasks } from '@/lib/hooks/useGoogleTasks';

function formatDueDate(due: string | undefined): string | null {
  if (!due) return null;

  const dueDate = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  if (dueDateOnly.getTime() === today.getTime()) {
    return '今日';
  }
  if (dueDateOnly.getTime() === tomorrow.getTime()) {
    return '明日';
  }
  if (dueDateOnly < today) {
    return '期限切れ';
  }

  return dueDate.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

export function GoogleTasksWidget() {
  const { tasks, isLoading, error, isConnected } = useGoogleTasks();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Google Tasks が連携されていません</p>
          <p className="text-xs mt-1">再ログインして連携を許可してください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <div className="text-center py-8 text-red-500">
          <p className="text-sm">読み込みエラー</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-green-500" />
          <h3 className="font-bold text-gray-900">Google Tasks</h3>
        </div>
        <span className="text-xs text-gray-400">
          {tasks.length} 件
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CheckSquare size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">未完了のタスクはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const dueLabel = formatDueDate(task.due);
            const isOverdue = dueLabel === '期限切れ';

            return (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {task.status === 'completed' ? (
                      <CheckSquare size={18} className="text-green-500" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${
                      task.status === 'completed'
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h4>
                    {task.notes && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.notes}
                      </p>
                    )}
                    {dueLabel && (
                      <span className={`text-xs mt-1 inline-block ${
                        isOverdue ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
