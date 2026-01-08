'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, UpdateTaskInput, Suit, TaskStatus } from '@/lib/types/task';
import { SUIT_CONFIG, SUITS, STATUS_CONFIG } from '@/lib/types/task';
import type { ActionMap, ActionItem } from '@/lib/types/action-map';

interface EditTaskFormProps {
  task: Task | null;
  onSave: (id: string, input: UpdateTaskInput) => Promise<unknown>;
  onClose: () => void;
}

export function EditTaskForm({ task, onSave, onClose }: EditTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suit, setSuit] = useState<Suit | ''>('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [actionItemId, setActionItemId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ActionMaps と ActionItems
  const [actionMaps, setActionMaps] = useState<ActionMap[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');

  // タスクが変更されたらフォームを初期化
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setSuit(task.suit || '');
      setStatus(task.status);
      setActionItemId(task.action_item_id || '');
    }
  }, [task]);

  // ActionMaps を取得
  useEffect(() => {
    if (!task) return;

    fetch('/api/action-maps', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setActionMaps(data || []);
        // 既存のactionItemIdからMapIdを逆引き
        if (task.action_item_id && data) {
          for (const map of data) {
            fetch(`/api/action-maps/${map.id}/items`, { credentials: 'include' })
              .then(res => res.json())
              .then(items => {
                const found = items?.find((item: ActionItem) => item.id === task.action_item_id);
                if (found) {
                  setSelectedMapId(map.id);
                  setActionItems(items);
                }
              });
          }
        }
      })
      .catch(err => console.error('Failed to fetch action maps:', err));
  }, [task]);

  // 選択されたMapのActionItemsを取得
  useEffect(() => {
    if (!selectedMapId) {
      setActionItems([]);
      return;
    }

    fetch(`/api/action-maps/${selectedMapId}/items`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActionItems(data || []))
      .catch(err => console.error('Failed to fetch action items:', err));
  }, [selectedMapId]);

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        suit: suit || null,
        status,
        action_item_id: actionItemId || null,
      });
      onClose();
    } catch (error) {
      console.error('Update task error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">タスクを編集</h2>
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

          {/* ステータス */}
          <div className="relative z-10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('not_started')}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                className={`flex-1 px-3 py-2 rounded-md border text-sm ${
                  status === 'not_started'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                未着手
              </button>
              <button
                type="button"
                onClick={() => setStatus('in_progress')}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                className={`flex-1 px-3 py-2 rounded-md border text-sm ${
                  status === 'in_progress'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                進行中
              </button>
              <button
                type="button"
                onClick={() => setStatus('done')}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                className={`flex-1 px-3 py-2 rounded-md border text-sm ${
                  status === 'done'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                完了
              </button>
            </div>
          </div>

          {/* Suit選択 */}
          <div className="relative z-10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              象限
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUITS.map(s => {
                const config = SUIT_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSuit(suit === s ? '' : s)}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
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
                未選択の場合はJoker（未分類）になります
              </p>
            )}
          </div>

          {/* ActionItem 紐付け */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ActionItem に紐付け（任意）
            </label>
            <div className="space-y-2">
              {/* ActionMap 選択 */}
              <select
                value={selectedMapId}
                onChange={e => {
                  setSelectedMapId(e.target.value);
                  setActionItemId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">-- ActionMap を選択 --</option>
                {actionMaps.map(map => (
                  <option key={map.id} value={map.id}>
                    {map.title}
                  </option>
                ))}
              </select>

              {/* ActionItem 選択 */}
              {selectedMapId && (
                <select
                  value={actionItemId}
                  onChange={e => setActionItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">-- ActionItem を選択 --</option>
                  {actionItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              紐付けると進捗計算に反映されます
            </p>
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
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
