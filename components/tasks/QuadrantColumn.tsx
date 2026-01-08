'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Task, Suit, TaskStatus } from '@/lib/types/task';
import { SUIT_CONFIG } from '@/lib/types/task';
import { TaskCard } from './TaskCard';

interface QuadrantColumnProps {
  suit: Suit;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function QuadrantColumn({
  suit,
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: QuadrantColumnProps) {
  const config = SUIT_CONFIG[suit];

  const { setNodeRef, isOver } = useDroppable({
    id: `quadrant-${suit}`,
    data: { suit },
  });

  return (
    <div className={`rounded-lg border-2 ${config.color} ${isOver ? 'ring-2 ring-blue-400' : ''}`}>
      {/* ヘッダー */}
      <div className="p-3 border-b bg-white/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            {config.label}
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
      </div>

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="p-2 min-h-[200px] space-y-2"
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
          <div className="text-center py-8 text-gray-400 text-sm">
            タスクをドラッグしてここにドロップ
          </div>
        )}
      </div>
    </div>
  );
}
