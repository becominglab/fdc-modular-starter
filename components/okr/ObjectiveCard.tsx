'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Trash2, Target } from 'lucide-react';
import type { Objective } from '@/lib/types/okr';

interface ObjectiveCardProps {
  objective: Objective;
  onDelete: (id: string) => Promise<void>;
}

export function ObjectiveCard({ objective, onDelete }: ObjectiveCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この Objective を削除しますか？関連する Key Results も削除されます。')) return;
    setIsDeleting(true);
    try {
      await onDelete(objective.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const progressColor = (objective.progress_rate || 0) >= 70
    ? 'bg-green-500'
    : (objective.progress_rate || 0) >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Target size={18} className="text-blue-600" />
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {objective.period}
              </span>
            </div>
            <Link href={`/okr/${objective.id}`} className="group">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 flex items-center gap-1">
                {objective.title}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
            </Link>
            {objective.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {objective.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {objective.progress_rate || 0}%
              </p>
              <p className="text-xs text-gray-500">
                {objective.key_result_count || 0} KRs
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-500 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-4">
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className={`${progressColor} rounded-full h-2 transition-all`}
              style={{ width: `${objective.progress_rate || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
