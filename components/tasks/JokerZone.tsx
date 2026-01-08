'use client';

import { useDroppable } from '@dnd-kit/core';
import { HelpCircle } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types/task';
import { TaskCard } from './TaskCard';

interface JokerZoneProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function JokerZone({ tasks, onEdit, onDelete, onStatusChange }: JokerZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'quadrant-joker',
    data: { suit: null },
  });

  return (
    <div className={`rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 ${
      isOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
    }`}>
      {/* ヘッダー */}
      <div className="p-3 border-b border-dashed border-gray-300">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-600 flex items-center gap-2">
            <HelpCircle size={18} />
            Joker（未分類）
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          象限が決まっていないタスク。ドラッグして振り分けてください
        </p>
      </div>

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="p-2 min-h-[100px] space-y-2"
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            未分類タスクはありません
          </div>
        )}
      </div>
    </div>
  );
}
