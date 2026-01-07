'use client';

import { Building2, Mail, Phone, Pencil, Trash2 } from 'lucide-react';
import type { Prospect } from '@/lib/types/prospect';
import { PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface ListViewProps {
  prospects: Prospect[];
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
}

export function ListView({ prospects, onEdit, onDelete }: ListViewProps) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        リードがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">名前</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">会社</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">連絡先</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ステータス</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">メモ</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect) => {
            const statusConfig = PROSPECT_STATUS_CONFIG[prospect.status];
            return (
              <tr key={prospect.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-900">{prospect.name}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Building2 size={14} />
                    <span>{prospect.company}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {prospect.email && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Mail size={14} />
                        <span>{prospect.email}</span>
                      </div>
                    )}
                    {prospect.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone size={14} />
                        <span>{prospect.phone}</span>
                      </div>
                    )}
                    {!prospect.email && !prospect.phone && (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-500 line-clamp-1">
                    {prospect.notes || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(prospect)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(prospect.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
