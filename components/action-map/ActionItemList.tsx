'use client';

import { Plus, CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import type { ActionItem } from '@/lib/types/action-map';
import { ACTION_ITEM_STATUS_CONFIG, ACTION_ITEM_PRIORITY_CONFIG } from '@/lib/types/action-map';

interface ActionItemListProps {
  items: ActionItem[];
  onAdd: () => void;
  onStatusChange: (id: string, status: ActionItem['status']) => void;
  onSelect: (item: ActionItem) => void;
}

const StatusIcon = ({ status }: { status: ActionItem['status'] }) => {
  switch (status) {
    case 'done':
      return <CheckCircle size={18} color="#22c55e" />;
    case 'in_progress':
      return <Clock size={18} color="#3b82f6" />;
    case 'blocked':
      return <AlertCircle size={18} color="#ef4444" />;
    default:
      return <Circle size={18} color="#9ca3af" />;
  }
};

export function ActionItemList({ items, onAdd, onStatusChange, onSelect }: ActionItemListProps) {
  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          ActionItems ({items.length})
        </h3>
        <button
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Plus size={14} />
          追加
        </button>
      </div>

      {/* アイテムリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => {
          const statusConfig = ACTION_ITEM_STATUS_CONFIG[item.status];
          const priorityConfig = ACTION_ITEM_PRIORITY_CONFIG[item.priority];

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* ステータスアイコン */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus = item.status === 'done' ? 'not_started' : 'done';
                    onStatusChange(item.id, nextStatus);
                  }}
                  style={{
                    padding: '2px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <StatusIcon status={item.status} />
                </button>

                {/* 内容 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: item.status === 'done' ? '#9ca3af' : '#1f2937',
                    textDecoration: item.status === 'done' ? 'line-through' : 'none',
                  }}>
                    {item.title}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    flexWrap: 'wrap',
                  }}>
                    {/* ステータスバッジ */}
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}>
                      {statusConfig.label}
                    </span>

                    {/* 優先度バッジ */}
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: priorityConfig.bgColor,
                      color: priorityConfig.color,
                    }}>
                      {priorityConfig.label}
                    </span>

                    {/* タスク数 */}
                    {(item.linked_task_count ?? 0) > 0 && (
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280',
                      }}>
                        {item.completed_task_count}/{item.linked_task_count} Tasks
                      </span>
                    )}
                  </div>
                </div>

                {/* 進捗率 */}
                <div style={{ textAlign: 'right', minWidth: '50px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#3b82f6',
                  }}>
                    {item.progress_rate || 0}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '14px',
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
          }}>
            ActionItemがありません
          </div>
        )}
      </div>
    </div>
  );
}
