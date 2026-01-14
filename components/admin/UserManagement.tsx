/**
 * components/admin/UserManagement.tsx
 *
 * ユーザー管理コンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, User, Shield, ShieldOff, UserX, Loader2 } from 'lucide-react';
import type { ManagedUser, UserAction } from '@/lib/types/super-admin';

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/super-admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: UserAction) => {
    const actionLabels: Record<UserAction, string> = {
      activate: '有効化',
      deactivate: '無効化',
      delete: '削除',
      grant_sa: 'SA権限付与',
      revoke_sa: 'SA権限剥奪',
    };

    if (!confirm(`このユーザーを${actionLabels[action]}しますか？`)) return;

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <User size={20} className="text-gray-500" />
          <h3 className="font-medium">ユーザー管理</h3>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="メールアドレスで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            ユーザーがいません
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {user.fullName || user.email}
                      </p>
                      {user.isSuperAdmin && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                          SA
                        </span>
                      )}
                      {!user.isActive && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          無効
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {actionLoading === user.id ? (
                    <Loader2 className="animate-spin text-gray-400" size={16} />
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(
                          user.id,
                          user.isSuperAdmin ? 'revoke_sa' : 'grant_sa'
                        )}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                        title={user.isSuperAdmin ? 'SA権限を剥奪' : 'SAに昇格'}
                      >
                        {user.isSuperAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      <button
                        onClick={() => handleAction(
                          user.id,
                          user.isActive ? 'deactivate' : 'activate'
                        )}
                        className="p-1.5 text-gray-400 hover:text-orange-600 rounded"
                        title={user.isActive ? '無効化' : '有効化'}
                      >
                        <UserX size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                WS: {user.workspaceCount} | 作成: {new Date(user.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
