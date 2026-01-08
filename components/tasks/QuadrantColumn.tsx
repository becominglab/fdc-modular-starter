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

  // 象限ごとのスタイル
  const quadrantStyles: Record<Suit, { bg: string; headerBg: string }> = {
    spade: { bg: '#f8fafc', headerBg: 'linear-gradient(135deg, #cbd5e1, #e2e8f0)' },
    heart: { bg: '#fef2f2', headerBg: 'linear-gradient(135deg, #fecaca, #fee2e2)' },
    diamond: { bg: '#eff6ff', headerBg: 'linear-gradient(135deg, #bfdbfe, #dbeafe)' },
    club: { bg: '#f0fdf4', headerBg: 'linear-gradient(135deg, #bbf7d0, #dcfce7)' },
  };

  const styles = quadrantStyles[suit];

  return (
    <div style={{
      height: '100%',
      backgroundColor: styles.bg,
      boxShadow: isOver ? 'inset 0 0 0 4px #3b82f6' : 'none'
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '10px 12px',
        background: styles.headerBg,
        borderBottom: '2px solid #d1d5db'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            margin: 0
          }}>
            <span style={{ fontSize: '24px' }}>{config.emoji}</span>
            {config.label}
          </h3>
          <span style={{
            padding: '4px 10px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: 'white',
            borderRadius: '20px',
            color: '#1f2937',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            {tasks.length}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px', margin: '4px 0 0 0' }}>
          {config.description}
        </p>
      </div>

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        style={{ padding: '8px', minHeight: '150px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
        {tasks.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 8px',
            color: '#9ca3af',
            fontSize: '14px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            margin: '8px'
          }}>
            ここにドロップ
          </div>
        )}
      </div>
    </div>
  );
}
