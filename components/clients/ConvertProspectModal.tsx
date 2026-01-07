'use client';

import { useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import type { Prospect } from '@/lib/types/prospect';
import type { ConvertToClientInput } from '@/lib/types/client';

interface ConvertProspectModalProps {
  prospect: Prospect | null;
  onConvert: (input: ConvertToClientInput) => Promise<void>;
  onClose: () => void;
}

export function ConvertProspectModal({ prospect, onConvert, onClose }: ConvertProspectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contract_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onConvert({
        prospect_id: prospect.id,
        contract_date: formData.contract_date,
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prospect) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">クライアントに変換</h2>
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

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">変換するリード:</p>
            <p className="font-medium text-gray-900">{prospect.name}</p>
            <p className="text-sm text-gray-600">{prospect.company}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              契約日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ（任意）
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="契約に関するメモ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <UserCheck size={18} />
              {isSubmitting ? '変換中...' : '成約として登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
