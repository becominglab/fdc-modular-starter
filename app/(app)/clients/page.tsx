'use client';

import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { useClients } from '@/lib/hooks/useClients';
import {
  ClientList,
  AddClientForm,
  EditClientModal,
} from '@/components/clients';
import type { Client, CreateClientInput, UpdateClientInput } from '@/lib/types/client';

export default function ClientsPage() {
  const {
    clients,
    isLoading,
    error,
    searchQuery,
    stats,
    addClient,
    updateClient,
    deleteClient,
    setSearchQuery,
  } = useClients();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleAdd = async (input: CreateClientInput) => {
    await addClient(input);
  };

  const handleUpdate = async (id: string, input: UpdateClientInput) => {
    await updateClient(id, input);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このクライアントを削除しますか？')) {
      await deleteClient(id);
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Users size={20} />
            <span className="text-sm">総クライアント数</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 mb-1">今月の新規</p>
          <p className="text-2xl font-bold text-green-700">{stats.thisMonth}</p>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前・会社名で検索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus size={18} />
          <span>新規クライアント</span>
        </button>
      </div>

      {/* クライアント一覧 */}
      <div className="bg-white rounded-lg border">
        <ClientList
          clients={clients}
          onEdit={setEditingClient}
          onDelete={handleDelete}
        />
      </div>

      {/* 追加フォーム */}
      <AddClientForm
        isOpen={isAddFormOpen}
        onAdd={handleAdd}
        onClose={() => setIsAddFormOpen(false)}
      />

      {/* 編集モーダル */}
      <EditClientModal
        client={editingClient}
        onUpdate={handleUpdate}
        onClose={() => setEditingClient(null)}
      />
    </div>
  );
}
