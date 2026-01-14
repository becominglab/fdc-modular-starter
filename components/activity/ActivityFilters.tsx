/**
 * components/activity/ActivityFilters.tsx
 *
 * アクティビティフィルターコンポーネント
 */

'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import type { ActivityFilters, ActivityAction, ActivityResource } from '@/lib/types/activity';

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onApply: (filters: ActivityFilters) => void;
}

const actions: { value: ActivityAction; label: string }[] = [
  { value: 'create', label: '作成' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '削除' },
  { value: 'invite', label: '招待' },
  { value: 'accept', label: '承認' },
];

const resources: { value: ActivityResource; label: string }[] = [
  { value: 'task', label: 'タスク' },
  { value: 'prospect', label: 'リード' },
  { value: 'client', label: 'クライアント' },
  { value: 'objective', label: '目標' },
  { value: 'invitation', label: '招待' },
];

export function ActivityFiltersComponent({ filters, onApply }: ActivityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ActivityFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onApply({});
    setIsOpen(false);
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="activity-filters">
      <button
        className={`btn btn-secondary btn-small ${hasFilters ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter size={16} />
        フィルター
        {hasFilters && <span className="filter-badge" />}
      </button>

      {isOpen && (
        <div className="activity-filters-dropdown">
          <div className="filter-group">
            <label>アクション</label>
            <select
              value={localFilters.action || ''}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                action: e.target.value as ActivityAction || undefined
              }))}
              className="input"
            >
              <option value="">すべて</option>
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>リソース</label>
            <select
              value={localFilters.resource_type || ''}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                resource_type: e.target.value as ActivityResource || undefined
              }))}
              className="input"
            >
              <option value="">すべて</option>
              {resources.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>期間</label>
            <div className="date-range">
              <input
                type="date"
                value={localFilters.from_date || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  from_date: e.target.value || undefined
                }))}
                className="input"
              />
              <span>〜</span>
              <input
                type="date"
                value={localFilters.to_date || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  to_date: e.target.value || undefined
                }))}
                className="input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary btn-small" onClick={handleClear}>
              <X size={14} />
              クリア
            </button>
            <button className="btn btn-primary btn-small" onClick={handleApply}>
              適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
