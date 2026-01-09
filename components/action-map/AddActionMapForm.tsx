'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Objective, KeyResult } from '@/lib/types/okr';

interface KeyResultWithObjective extends KeyResult {
  objectiveTitle?: string;
}

interface AddActionMapFormProps {
  isOpen: boolean;
  onAdd: (input: { title: string; description?: string; key_result_id?: string }) => Promise<unknown>;
  onClose: () => void;
}

export function AddActionMapForm({ isOpen, onAdd, onClose }: AddActionMapFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keyResultId, setKeyResultId] = useState('');
  const [keyResults, setKeyResults] = useState<KeyResultWithObjective[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingKRs, setIsLoadingKRs] = useState(false);

  // Key Results を取得
  useEffect(() => {
    if (!isOpen) return;

    const loadKeyResults = async () => {
      setIsLoadingKRs(true);
      try {
        const objRes = await fetch('/api/objectives', { credentials: 'include' });
        if (!objRes.ok) return;
        const objectives: Objective[] = await objRes.json();

        const allKrs: KeyResultWithObjective[] = [];
        for (const obj of objectives) {
          const krRes = await fetch(`/api/objectives/${obj.id}/key-results`, { credentials: 'include' });
          if (krRes.ok) {
            const krs: KeyResult[] = await krRes.json();
            allKrs.push(...krs.map(kr => ({
              ...kr,
              objectiveTitle: obj.title,
            })));
          }
        }
        setKeyResults(allKrs);
      } catch (error) {
        console.error('Failed to load key results:', error);
      } finally {
        setIsLoadingKRs(false);
      }
    };

    loadKeyResults();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        key_result_id: keyResultId || undefined,
      });
      setTitle('');
      setDescription('');
      setKeyResultId('');
      onClose();
    } catch (error) {
      console.error('Add action map error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">ActionMap を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 新規顧客獲得キャンペーン"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ActionMapの詳細説明（任意）"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Result に紐付け（任意）
            </label>
            <select
              value={keyResultId}
              onChange={e => setKeyResultId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingKRs}
            >
              <option value="">-- 紐付けなし --</option>
              {keyResults.map(kr => (
                <option key={kr.id} value={kr.id}>
                  [{kr.objectiveTitle}] {kr.title}
                </option>
              ))}
            </select>
            {isLoadingKRs && (
              <p className="text-xs text-gray-500 mt-1">読み込み中...</p>
            )}
            {!isLoadingKRs && keyResults.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                OKR ページで Key Result を作成すると選択できます
              </p>
            )}
          </div>

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
