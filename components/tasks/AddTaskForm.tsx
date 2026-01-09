'use client';

import { useState, useEffect } from 'react';
import { X, FileText, AlignLeft, Link2, FolderOpen } from 'lucide-react';
import type { CreateTaskInput, Suit } from '@/lib/types/task';
import { SUIT_CONFIG, SUITS } from '@/lib/types/task';
import type { ActionMap, ActionItem } from '@/lib/types/action-map';

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
  const [actionItemId, setActionItemId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ActionMaps と ActionItems
  const [actionMaps, setActionMaps] = useState<ActionMap[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');

  // ActionMaps を取得
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/action-maps', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActionMaps(data || []))
      .catch(err => console.error('Failed to fetch action maps:', err));
  }, [isOpen]);

  // 選択されたMapのActionItemsを取得
  useEffect(() => {
    if (!selectedMapId) {
      setActionItems([]);
      setActionItemId('');
      return;
    }

    fetch(`/api/action-maps/${selectedMapId}/items`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActionItems(data || []))
      .catch(err => console.error('Failed to fetch action items:', err));
  }, [selectedMapId]);

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
        action_item_id: actionItemId || undefined,
      });
      setTitle('');
      setDescription('');
      setSuit(defaultSuit || '');
      setSelectedMapId('');
      setActionItemId('');
      onClose();
    } catch (error) {
      console.error('Add task error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">タスクを追加</h2>
            <p className="text-xs text-gray-500 mt-0.5">新しいタスクを作成します</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* タイトル */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="text-blue-500" />
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 企画書を作成する"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              required
              autoFocus
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <AlignLeft size={16} className="text-gray-400" />
              説明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="タスクの詳細を入力（任意）"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Suit選択 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              象限を選択
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SUITS.map(s => {
                const config = SUIT_CONFIG[s];
                const isSelected = suit === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSuit(suit === s ? '' : s)}
                    className={`p-4 rounded-xl border-2 text-left transition-all transform hover:scale-[1.02] ${
                      isSelected
                        ? `${config.color} border-current shadow-md`
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{config.emoji}</span>
                      <div>
                        <span className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!suit && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                未選択の場合は Joker（未分類）として追加
              </p>
            )}
          </div>

          {/* ActionItem 紐付け */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Link2 size={16} className="text-indigo-500" />
              ActionItem に紐付け（任意）
            </label>
            <div className="space-y-3">
              {/* ActionMap 選択 */}
              <div className="relative">
                <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedMapId}
                  onChange={e => setSelectedMapId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none cursor-pointer"
                >
                  <option value="">ActionMap を選択</option>
                  {actionMaps.map(map => (
                    <option key={map.id} value={map.id}>
                      {map.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* ActionItem 選択 */}
              {selectedMapId && (
                <select
                  value={actionItemId}
                  onChange={e => setActionItemId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="">ActionItem を選択</option>
                  {actionItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
            >
              {isSubmitting ? '追加中...' : 'タスクを追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
