'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Circle, Pencil, Check, X } from 'lucide-react';
import type { Task } from '@/lib/types/task';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="text-gray-500 hover:text-green-600 flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle size={24} className="text-green-600" />
        ) : (
          <Circle size={24} />
        )}
      </button>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700"
          >
            <Check size={20} />
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 ${
              task.completed ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-blue-600"
          >
            <Pencil size={18} />
          </button>
        </>
      )}

      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-400 hover:text-red-600 flex-shrink-0"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
