'use client';

import { Building2, Mail, Phone, Calendar, Pencil, Trash2 } from 'lucide-react';
import type { Client } from '@/lib/types/client';

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        クライアントがありません
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
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">契約日</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">連絡先</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">メモ</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{client.name}</span>
                  {client.prospect_id && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      変換
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Building2 size={14} />
                  <span>{client.company}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-green-600">
                  <Calendar size={14} />
                  <span>{formatDate(client.contract_date)}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Phone size={14} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-500 line-clamp-1">
                  {client.notes || '-'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
