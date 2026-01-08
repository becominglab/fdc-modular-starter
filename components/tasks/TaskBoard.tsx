'use client';

import { DndContext, DragEndEvent, DragOverlay, closestCenter, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import type { Task, Suit, TaskStatus } from '@/lib/types/task';
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

      {/* 4象限マトリックス */}
      <div style={{ width: '100%' }}>
        {/* 上部軸ラベル（緊急度） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', marginLeft: '56px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: '#ef4444',
              padding: '6px 16px',
              borderRadius: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              緊急
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666',
              backgroundColor: '#e5e7eb',
              padding: '6px 16px',
              borderRadius: '20px'
            }}>
              緊急でない
            </span>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {/* 左側軸ラベル（重要度） */}
          <div style={{ width: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flexShrink: 0, marginRight: '8px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: '#f59e0b',
                padding: '12px 6px',
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                writingMode: 'vertical-rl'
              }}>
                重要
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666',
                backgroundColor: '#e5e7eb',
                padding: '12px 6px',
                borderRadius: '20px',
                writingMode: 'vertical-rl'
              }}>
                重要でない
              </span>
            </div>
          </div>

          {/* 4象限グリッド - 2x2固定 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              backgroundColor: '#1f2937',
              padding: '4px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              {/* 第1象限: スペード（緊急＆重要）- 左上 */}
              <div style={{ borderRadius: '12px 0 0 0', overflow: 'hidden', border: '3px solid #64748b' }}>
                <QuadrantColumn
                  suit="spade"
                  tasks={tasksBySuit.spade}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              </div>

              {/* 第2象限: ハート（重要だが緊急でない）- 右上 */}
              <div style={{ borderRadius: '0 12px 0 0', overflow: 'hidden', border: '3px solid #fca5a5' }}>
                <QuadrantColumn
                  suit="heart"
                  tasks={tasksBySuit.heart}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              </div>

              {/* 第3象限: ダイヤ（緊急だが重要でない）- 左下 */}
              <div style={{ borderRadius: '0 0 0 12px', overflow: 'hidden', border: '3px solid #93c5fd' }}>
                <QuadrantColumn
                  suit="diamond"
                  tasks={tasksBySuit.diamond}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              </div>

              {/* 第4象限: クラブ（緊急でも重要でもない）- 右下 */}
              <div style={{ borderRadius: '0 0 12px 0', overflow: 'hidden', border: '3px solid #86efac' }}>
                <QuadrantColumn
                  suit="club"
                  tasks={tasksBySuit.club}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              </div>
            </div>
          </div>
        </div>
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
