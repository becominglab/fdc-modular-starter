'use client';

import { DndContext, DragEndEvent, DragOverlay, closestCenter, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import type { Task, Suit, TaskStatus } from '@/lib/types/task';
import { SUITS } from '@/lib/types/task';
import { QuadrantColumn } from './QuadrantColumn';
import { JokerZone } from './JokerZone';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasksBySuit: Record<Suit | 'joker', Task[]>;
  onSuitChange: (taskId: string, suit: Suit | null) => Promise<void>;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskBoard({
  tasksBySuit,
  onSuitChange,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // ドロップ先のsuitを取得
    let newSuit: Suit | null = null;
    if (overId.startsWith('quadrant-')) {
      const suitStr = overId.replace('quadrant-', '');
      if (suitStr === 'joker') {
        newSuit = null;
      } else {
        newSuit = suitStr as Suit;
      }
    }

    // 現在のタスクを探す
    const allTasks = [...tasksBySuit.spade, ...tasksBySuit.heart, ...tasksBySuit.diamond, ...tasksBySuit.club, ...tasksBySuit.joker];
    const task = allTasks.find(t => t.id === taskId);

    if (task && task.suit !== newSuit) {
      await onSuitChange(taskId, newSuit);
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Jokerゾーン */}
      {tasksBySuit.joker.length > 0 && (
        <div className="mb-6">
          <JokerZone
            tasks={tasksBySuit.joker}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        </div>
      )}

      {/* 4象限グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUITS.map(suit => (
          <QuadrantColumn
            key={suit}
            suit={suit}
            tasks={tasksBySuit[suit]}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* ドラッグ中のオーバーレイ */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-80">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
