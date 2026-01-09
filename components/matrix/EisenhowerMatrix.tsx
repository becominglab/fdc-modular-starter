'use client';

/**
 * components/matrix/EisenhowerMatrix.tsx
 *
 * アイゼンハワーマトリクス（4象限表示）
 */

import { useMatrixTasks } from '@/lib/hooks/useMatrixTasks';
import { SUIT_CONFIG, type Task, type Suit } from '@/lib/types/task';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface QuadrantProps {
  suit: Suit;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onSuitChange?: (taskId: string, newSuit: Suit) => void;
}

const QUADRANT_INFO: Record<Suit, { quadrant: string; bgColor: string; borderColor: string }> = {
  spade: { quadrant: 'Q1: Do Now', bgColor: '#f0f0f0', borderColor: '#1a1a1a' },
  heart: { quadrant: 'Q2: Schedule', bgColor: '#fef2f2', borderColor: '#dc2626' },
  diamond: { quadrant: 'Q3: Delegate', bgColor: '#fefce8', borderColor: '#ca8a04' },
  club: { quadrant: 'Q4: Create Future', bgColor: '#eff6ff', borderColor: '#2563eb' },
};

function Quadrant({ suit, tasks, onTaskClick, onSuitChange }: QuadrantProps) {
  const config = SUIT_CONFIG[suit];
  const info = QUADRANT_INFO[suit];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.opacity = '0.8';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.opacity = '1';
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onSuitChange) {
      onSuitChange(taskId, suit);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: info.bgColor,
        borderRadius: '12px',
        padding: '16px',
        minHeight: '200px',
        border: `2px solid ${info.borderColor}20`,
        transition: 'all 0.2s',
      }}
    >
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${info.borderColor}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{config.emoji}</span>
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: info.borderColor,
              margin: 0,
            }}>
              {config.label}
            </h3>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}>
              {info.quadrant}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: info.borderColor,
          background: `${info.borderColor}20`,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {tasks.length}
        </span>
      </div>

      {/* タスク一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.length === 0 ? (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px 0',
          }}>
            タスクなし
          </p>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              color={info.borderColor}
              onClick={() => onTaskClick?.(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  color: string;
  onClick?: () => void;
}

function TaskCard({ task, color, onClick }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const statusIcon = {
    not_started: <Circle size={14} />,
    in_progress: <Clock size={14} />,
    done: <CheckCircle2 size={14} />,
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: 'grab',
        border: '1px solid var(--border-light)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ color: color, marginTop: '2px' }}>
          {statusIcon[task.status]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-dark)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.title}
          </p>
          {task.scheduled_date && (
            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: '4px 0 0 0',
            }}>
              {new Date(task.scheduled_date).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EisenhowerMatrix() {
  const { tasks, counts, isLoading, error, updateTaskSuit } = useMatrixTasks();

  const handleSuitChange = async (taskId: string, newSuit: Suit) => {
    try {
      await updateTaskSuit(taskId, newSuit);
    } catch (err) {
      console.error('Failed to update task suit:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--error)' }}>
        エラー: {error}
      </div>
    );
  }

  return (
    <div>
      {/* 統計 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {(['spade', 'heart', 'diamond', 'club'] as Suit[]).map(suit => {
          const config = SUIT_CONFIG[suit];
          const info = QUADRANT_INFO[suit];
          return (
            <div
              key={suit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: info.bgColor,
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <span>{config.emoji}</span>
              <span style={{ fontWeight: 500, color: info.borderColor }}>
                {counts[suit]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2x2 マトリクス */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}>
        {/* 上段: 重要 */}
        <Quadrant
          suit="spade"
          tasks={tasks.spade}
          onSuitChange={handleSuitChange}
        />
        <Quadrant
          suit="heart"
          tasks={tasks.heart}
          onSuitChange={handleSuitChange}
        />

        {/* 下段: 重要でない */}
        <Quadrant
          suit="diamond"
          tasks={tasks.diamond}
          onSuitChange={handleSuitChange}
        />
        <Quadrant
          suit="club"
          tasks={tasks.club}
          onSuitChange={handleSuitChange}
        />
      </div>

      {/* 未分類タスク */}
      {tasks.unassigned.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}>
            未分類のタスク ({tasks.unassigned.length})
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {tasks.unassigned.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                style={{
                  background: 'var(--bg-gray)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'grab',
                }}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
