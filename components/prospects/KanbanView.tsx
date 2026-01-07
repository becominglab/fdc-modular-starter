'use client';

import { KanbanColumn } from './KanbanColumn';
import type { Prospect, ProspectStatus } from '@/lib/types/prospect';
import { KANBAN_STATUSES } from '@/lib/types/prospect';

interface KanbanViewProps {
  prospectsByStatus: Record<ProspectStatus, Prospect[]>;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
  onStatusChange: (prospectId: string, newStatus: ProspectStatus) => void;
}

export function KanbanView({
  prospectsByStatus,
  onEdit,
  onDelete,
  onStatusChange,
}: KanbanViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          prospects={prospectsByStatus[status]}
          onEdit={onEdit}
          onDelete={onDelete}
          onDrop={onStatusChange}
        />
      ))}
    </div>
  );
}
