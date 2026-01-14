'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Users, Download, Upload, Loader2 } from 'lucide-react';
import { useClients } from '@/lib/hooks/useClients';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useExport } from '@/lib/hooks/useExport';
import { ImportModal } from '@/components/import/ImportModal';
import {
  ClientList,
  AddClientForm,
  EditClientModal,
} from '@/components/clients';
import type { Client, CreateClientInput, UpdateClientInput } from '@/lib/types/client';

export default function ClientsPage() {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // ワークスペースID取得
  useEffect(() => {
    if (user?.id) {
      const fetchWorkspace = async () => {
        try {
          const res = await fetch('/api/workspaces');
          if (res.ok) {
            const data = await res.json();
            if (data.workspaces && data.workspaces.length > 0) {
              setWorkspaceId(data.workspaces[0].id);
            }
          }
        } catch {
          // ignore
        }
      };
      fetchWorkspace();
    } else {
      const session = localStorage.getItem('fdc_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setWorkspaceId(parsed.workspaceId || 'demo-workspace');
        } catch {
          setWorkspaceId('demo-workspace');
        }
      }
    }
  }, [user]);

  const { exporting, exportClients } = useExport(workspaceId);

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
  const [isImportOpen, setIsImportOpen] = useState(false);

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
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">クライアント管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            成約済みクライアントを管理
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Upload size={18} />
            CSV取込
          </button>
          <button
            onClick={exportClients}
            disabled={exporting === 'clients'}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting === 'clients' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            CSV出力
          </button>
        </div>
      </div>

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

      {/* インポートモーダル */}
      <ImportModal
        isOpen={isImportOpen}
        type="clients"
        onClose={() => setIsImportOpen(false)}
        onComplete={() => window.location.reload()}
      />
    </div>
  );
}
