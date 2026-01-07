'use client';

import { useState } from 'react';
import { Plus, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { ApproachType, ApproachResultStatus, CreateApproachInput } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS, RESULT_STATUS_LABELS } from '@/lib/types/approach';

interface AddApproachFormProps {
  prospectId: string;
  isOpen: boolean;
  onAdd: (input: CreateApproachInput) => Promise<unknown>;
  onClose: () => void;
}

const APPROACH_TYPES: ApproachType[] = ['call', 'email', 'meeting', 'visit', 'other'];
const RESULT_STATUSES: ApproachResultStatus[] = ['success', 'pending', 'failed'];

const STATUS_ICONS: Record<ApproachResultStatus, typeof CheckCircle> = {
  success: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

const STATUS_COLORS: Record<ApproachResultStatus, string> = {
  success: 'bg-green-600 border-green-600',
  pending: 'bg-yellow-500 border-yellow-500',
  failed: 'bg-red-600 border-red-600',
};

export function AddApproachForm({ prospectId, isOpen, onAdd, onClose }: AddApproachFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'call' as ApproachType,
    content: '',
    result: '',
    result_status: undefined as ApproachResultStatus | undefined,
    approached_at: new Date().toISOString().slice(0, 16),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onAdd({
        prospect_id: prospectId,
        type: formData.type,
        content: formData.content,
        result: formData.result || undefined,
        result_status: formData.result_status,
        approached_at: formData.approached_at,
      });
      setFormData({
        type: 'call',
        content: '',
        result: '',
        result_status: undefined,
        approached_at: new Date().toISOString().slice(0, 16),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">アプローチを記録</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイプ <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {APPROACH_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.type === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {APPROACH_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日時 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.approached_at}
              onChange={(e) => setFormData({ ...formData, approached_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              placeholder="アプローチの内容を入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結果ステータス（任意）
            </label>
            <div className="flex gap-2">
              {RESULT_STATUSES.map((status) => {
                const Icon = STATUS_ICONS[status];
                const isSelected = formData.result_status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      result_status: isSelected ? undefined : status,
                    })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors ${
                      isSelected
                        ? `${STATUS_COLORS[status]} text-white`
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon size={16} />
                    {RESULT_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結果メモ（任意）
            </label>
            <textarea
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              rows={2}
              placeholder="反応や結果を記録..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {isSubmitting ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
