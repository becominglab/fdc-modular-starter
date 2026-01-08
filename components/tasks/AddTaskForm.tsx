'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateTaskInput, Suit } from '@/lib/types/task';
import { SUIT_CONFIG, SUITS } from '@/lib/types/task';

interface AddTaskFormProps {
  isOpen: boolean;
  onAdd: (input: CreateTaskInput) => Promise<unknown>;
  onClose: () => void;
  defaultSuit?: Suit;
}

export function AddTaskForm({ isOpen, onAdd, onClose, defaultSuit }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suit, setSuit] = useState<Suit | ''>(defaultSuit || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        suit: suit || undefined,
      });
      setTitle('');
      setDescription('');
      setSuit(defaultSuit || '');
      onClose();
    } catch (error) {
      console.error('Add task error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">タスクを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タスクのタイトル"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="タスクの説明（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Suit選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              象限（後で変更可能）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUITS.map(s => {
                const config = SUIT_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSuit(suit === s ? '' : s)}
                    className={`p-2 rounded-md border text-left transition-all ${
                      suit === s
                        ? `${config.color} border-2`
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{config.emoji}</span>
                    <span className="ml-1 text-sm">{config.label}</span>
                  </button>
                );
              })}
            </div>
            {!suit && (
              <p className="text-xs text-gray-500 mt-1">
                未選択の場合はJoker（未分類）として追加されます
              </p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
