'use client';

import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import type { ProspectStatus } from '@/lib/types/prospect';
import { ALL_STATUSES, PROSPECT_STATUS_CONFIG } from '@/lib/types/prospect';
import type { ViewMode } from '@/lib/hooks/useProspects';

interface ProspectFiltersProps {
  statusFilter: ProspectStatus | 'all';
  searchQuery: string;
  viewMode: ViewMode;
  onStatusFilterChange: (status: ProspectStatus | 'all') => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAddClick: () => void;
}

export function ProspectFilters({
  statusFilter,
  searchQuery,
  viewMode,
  onStatusFilterChange,
  onSearchChange,
  onViewModeChange,
  onAddClick,
}: ProspectFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        {/* 検索 */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="名前・会社名で検索..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>

        {/* ステータスフィルター */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ProspectStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">すべてのステータス</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROSPECT_STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        {/* ビュー切り替え */}
        <div className="flex items-center border border-gray-300 rounded-md">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`p-2 ${
              viewMode === 'kanban'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
            title="カンバンビュー"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 ${
              viewMode === 'list'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
            title="リストビュー"
          >
            <List size={20} />
          </button>
        </div>

        {/* 追加ボタン */}
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">新規リード</span>
        </button>
      </div>
    </div>
  );
}
