'use client';

import { useState } from 'react';
import { Plus, Archive, MoreVertical, Trash2, Edit } from 'lucide-react';
import type { ActionMap } from '@/lib/types/action-map';

interface ActionMapListProps {
  actionMaps: ActionMap[];
  onSelect: (map: ActionMap) => void;
  onCreate: () => void;
  onEdit: (map: ActionMap) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
}

export function ActionMapList({
  actionMaps,
  onSelect,
  onCreate,
  onEdit,
  onArchive,
  onDelete,
  selectedId,
}: ActionMapListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 新規作成ボタン */}
      <button
        onClick={onCreate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        <Plus size={18} />
        新規ActionMap
      </button>

      {/* ActionMap リスト */}
      {actionMaps.map(map => (
        <div
          key={map.id}
          onClick={() => onSelect(map)}
          style={{
            padding: '12px 16px',
            backgroundColor: selectedId === map.id ? '#eff6ff' : 'white',
            border: selectedId === map.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                {map.title}
              </h4>
              {map.description && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {map.description}
                </p>
              )}
            </div>

            {/* 進捗バー */}
            <div style={{ width: '60px', textAlign: 'right' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>
                {map.progress_rate || 0}%
              </span>
              <div style={{
                marginTop: '4px',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${map.progress_rate || 0}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* メニューボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === map.id ? null : map.id);
              }}
              style={{
                marginLeft: '8px',
                padding: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {/* ドロップダウンメニュー */}
            {openMenuId === map.id && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '40px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  minWidth: '120px',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(map);
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <Edit size={14} />
                  編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(map.id);
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <Archive size={14} />
                  アーカイブ
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('削除しますか？')) {
                      onDelete(map.id);
                    }
                    setOpenMenuId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#ef4444',
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {actionMaps.length === 0 && (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}>
          ActionMapがありません
        </div>
      )}
    </div>
  );
}
