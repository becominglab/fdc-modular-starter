'use client';

import { Phone, Mail, Users, MapPin, MoreHorizontal, Trash2, Edit, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Approach, ApproachType, ApproachResultStatus } from '@/lib/types/approach';
import { APPROACH_TYPE_LABELS, RESULT_STATUS_LABELS } from '@/lib/types/approach';

interface ApproachTimelineProps {
  approaches: Approach[];
  onEdit?: (approach: Approach) => void;
  onDelete?: (id: string) => void;
}

const TYPE_ICONS: Record<ApproachType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  visit: MapPin,
  other: MoreHorizontal,
};

const TYPE_COLORS: Record<ApproachType, string> = {
  call: 'bg-blue-100 text-blue-600',
  email: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  visit: 'bg-orange-100 text-orange-600',
  other: 'bg-gray-100 text-gray-600',
};

const STATUS_ICONS: Record<ApproachResultStatus, typeof CheckCircle> = {
  success: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

const STATUS_COLORS: Record<ApproachResultStatus, string> = {
  success: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  failed: 'text-red-600 bg-red-50',
};

export function ApproachTimeline({ approaches, onEdit, onDelete }: ApproachTimelineProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (approaches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        アプローチ履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approaches.map((approach, index) => {
        const Icon = TYPE_ICONS[approach.type];
        const colorClass = TYPE_COLORS[approach.type];
        const StatusIcon = approach.result_status ? STATUS_ICONS[approach.result_status] : null;
        const statusColorClass = approach.result_status ? STATUS_COLORS[approach.result_status] : '';

        return (
          <div key={approach.id} className="relative pl-8">
            {/* タイムライン線 */}
            {index < approaches.length - 1 && (
              <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* アイコン */}
            <div className={`absolute left-0 p-1.5 rounded-full ${colorClass}`}>
              <Icon size={14} />
            </div>

            {/* コンテンツ */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                      {APPROACH_TYPE_LABELS[approach.type]}
                    </span>
                    {approach.result_status && StatusIcon && (
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColorClass}`}>
                        <StatusIcon size={12} />
                        {RESULT_STATUS_LABELS[approach.result_status]}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(approach.approached_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{approach.content}</p>
                  {approach.result && (
                    <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      結果: {approach.result}
                    </p>
                  )}
                </div>

                {/* アクション */}
                {(onEdit || onDelete) && (
                  <div className="flex gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(approach)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(approach.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
