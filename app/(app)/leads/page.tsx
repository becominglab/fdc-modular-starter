'use client';

import { useState } from 'react';
import { useProspects } from '@/lib/hooks/useProspects';
import {
  ProspectFilters,
  KanbanView,
  ListView,
  AddProspectForm,
  EditProspectModal,
} from '@/components/prospects';
import type { Prospect, CreateProspectInput, UpdateProspectInput } from '@/lib/types/prospect';

export default function LeadsPage() {
  const {
    prospects,
    prospectsByStatus,
    isLoading,
    error,
    statusFilter,
    searchQuery,
    viewMode,
    stats,
    addProspect,
    updateProspect,
    updateStatus,
    deleteProspect,
    setStatusFilter,
    setSearchQuery,
    setViewMode,
  } = useProspects();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const handleAdd = async (input: CreateProspectInput) => {
    await addProspect(input);
  };

  const handleUpdate = async (id: string, input: UpdateProspectInput) => {
    await updateProspect(id, input);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このリードを削除しますか？')) {
      await deleteProspect(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラー: {error.message}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* 統計情報 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">合計</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">新規</p>
          <p className="text-2xl font-bold text-gray-700">{stats.new}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">アプローチ中</p>
          <p className="text-2xl font-bold text-blue-700">{stats.approaching}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">商談中</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.negotiating}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600">提案中</p>
          <p className="text-2xl font-bold text-purple-700">{stats.proposing}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">成約</p>
          <p className="text-2xl font-bold text-green-700">{stats.won}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">失注</p>
          <p className="text-2xl font-bold text-red-700">{stats.lost}</p>
        </div>
      </div>

      {/* フィルター・検索・ビュー切り替え */}
      <ProspectFilters
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        viewMode={viewMode}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onAddClick={() => setIsAddFormOpen(true)}
      />

      {/* ビュー */}
      {viewMode === 'kanban' ? (
        <KanbanView
          prospectsByStatus={prospectsByStatus}
          onEdit={setEditingProspect}
          onDelete={handleDelete}
          onStatusChange={updateStatus}
        />
      ) : (
        <ListView
          prospects={prospects}
          onEdit={setEditingProspect}
          onDelete={handleDelete}
        />
      )}

      {/* 追加フォーム */}
      <AddProspectForm
        isOpen={isAddFormOpen}
        onAdd={handleAdd}
        onClose={() => setIsAddFormOpen(false)}
      />

      {/* 編集モーダル */}
      <EditProspectModal
        prospect={editingProspect}
        onUpdate={handleUpdate}
        onClose={() => setEditingProspect(null)}
      />
    </div>
  );
}
