'use client';

import { Building2, Mail, Phone, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Prospect } from '@/lib/types/prospect';
import { PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';

interface ProspectCardProps {
  prospect: Prospect;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
  showStatus?: boolean;
}

export function ProspectCard({
  prospect,
  onEdit,
  onDelete,
  showStatus = false,
}: ProspectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusConfig = PROSPECT_STATUS_CONFIG[prospect.status];

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{prospect.name}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
            <Building2 size={14} />
            <span className="truncate">{prospect.company}</span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded-md shadow-lg z-10">
              <button
                onClick={() => {
                  onEdit(prospect);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={14} />
                編集
              </button>
              <button
                onClick={() => {
                  onDelete(prospect.id);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {prospect.email && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Mail size={14} />
            <span className="truncate">{prospect.email}</span>
          </div>
        )}
        {prospect.phone && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Phone size={14} />
            <span>{prospect.phone}</span>
          </div>
        )}
      </div>

      {showStatus && (
        <div className="mt-3">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      )}

      {prospect.notes && (
        <p className="mt-3 text-xs text-gray-500 line-clamp-2">{prospect.notes}</p>
      )}
    </div>
  );
}
