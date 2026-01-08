'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus } from '@/lib/types/task';
import { SUIT_CONFIG, STATUS_CONFIG } from '@/lib/types/task';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suitConfig = task.suit ? SUIT_CONFIG[task.suit] : null;

  // デフォルト値を設定
  const defaultStatusConfig = { label: '未設定', color: 'bg-gray-100 text-gray-500' };
  const validStatus = task.status as keyof typeof STATUS_CONFIG;
  const statusConfig = validStatus && STATUS_CONFIG[validStatus]
    ? STATUS_CONFIG[validStatus]
    : defaultStatusConfig;

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange) {
      const newStatus = task.status === 'done' ? 'not_started' : 'done';
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* 完了チェック */}
        <button
          onClick={handleComplete}
          className={`mt-0.5 flex-shrink-0 ${
            task.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
          }`}
        >
          <CheckCircle size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <p className={`text-sm font-medium ${
            task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}>
            {task.title}
          </p>

          {/* メタ情報 */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {suitConfig && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${suitConfig.color}`}>
                {suitConfig.emoji} {suitConfig.label}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig?.color || 'bg-gray-100 text-gray-500'}`}>
              {statusConfig?.label || '未設定'}
            </span>
          </div>
        </div>

        {/* メニュー */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={14} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-28 bg-white border rounded-md shadow-lg z-20">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={12} />
                  編集
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                  削除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
