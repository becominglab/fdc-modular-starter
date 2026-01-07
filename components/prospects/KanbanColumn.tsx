'use client';

import { ProspectCard } from './ProspectCard';
import type { Prospect, ProspectStatus } from '@/lib/types/prospect';
import { PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface KanbanColumnProps {
  status: ProspectStatus;
  prospects: Prospect[];
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
  onDrop: (prospectId: string, newStatus: ProspectStatus) => void;
}

export function KanbanColumn({
  status,
  prospects,
  onEdit,
  onDelete,
  onDrop,
}: KanbanColumnProps) {
  const config = PROSPECT_STATUS_CONFIG[status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-gray-100');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-gray-100');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-100');
    const prospectId = e.dataTransfer.getData('prospectId');
    if (prospectId) {
      onDrop(prospectId, status);
    }
  };

  const handleDragStart = (e: React.DragEvent, prospectId: string) => {
    e.dataTransfer.setData('prospectId', prospectId);
  };

  return (
    <div className={`flex-1 min-w-[280px] max-w-[350px] rounded-lg border-2 ${config.kanbanColor}`}>
      <div className="p-3 border-b bg-white/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">{config.label}</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600">
            {prospects.length}
          </span>
        </div>
      </div>
      <div
        className="p-2 min-h-[400px] space-y-2 transition-colors"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {prospects.map((prospect) => (
          <div
            key={prospect.id}
            draggable
            onDragStart={(e) => handleDragStart(e, prospect.id)}
            className="cursor-grab active:cursor-grabbing"
          >
            <ProspectCard
              prospect={prospect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
        {prospects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            リードをドラッグしてここにドロップ
          </div>
        )}
      </div>
    </div>
  );
}
