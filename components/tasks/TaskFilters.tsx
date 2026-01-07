'use client';

import { Filter, ArrowUpDown } from 'lucide-react';
import type { TaskFilter, TaskSort, SortOrder } from '@/lib/types/task';

interface TaskFiltersProps {
  filter: TaskFilter;
  sort: TaskSort;
  sortOrder: SortOrder;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort, order: SortOrder) => void;
}

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '未完了' },
  { value: 'completed', label: '完了' },
];

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: 'createdAt', label: '作成日' },
  { value: 'updatedAt', label: '更新日' },
];

export function TaskFilters({
  filter,
  sort,
  sortOrder,
  onFilterChange,
  onSortChange,
}: TaskFiltersProps) {
  const toggleSortOrder = () => {
    onSortChange(sort, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      {/* フィルター */}
      <div className="flex items-center gap-2">
        <Filter size={18} className="text-gray-500" />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ソート */}
      <div className="flex items-center gap-2">
        <ArrowUpDown size={18} className="text-gray-500" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TaskSort, sortOrder)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={toggleSortOrder}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          {sortOrder === 'desc' ? '新しい順' : '古い順'}
        </button>
      </div>
    </div>
  );
}
