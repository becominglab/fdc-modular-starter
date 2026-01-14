/**
 * components/super-admin/UsersTable.tsx
 *
 * ユーザー一覧テーブル
 */

'use client';

import { useState } from 'react';
import { Search, Users, Shield, UserX, UserCheck, Trash2 } from 'lucide-react';
import type { ManagedUser, UserAction } from '@/lib/types/super-admin';

interface UsersTableProps {
  users: ManagedUser[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onUserAction: (userId: string, action: UserAction) => Promise<{ success: boolean; error?: string }>;
}

export function UsersTable({ users, loading, search, onSearchChange, onUserAction }: UsersTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (userId: string, action: UserAction) => {
    const confirmMessages: Record<UserAction, string> = {
      activate: 'このユーザーを有効化しますか？',
      deactivate: 'このユーザーを無効化しますか？',
      delete: 'このユーザーを削除しますか？この操作は取り消せません。',
      grant_sa: 'このユーザーにSuper Admin権限を付与しますか？',
      revoke_sa: 'このユーザーのSuper Admin権限を剥奪しますか？',
    };

    if (!confirm(confirmMessages[action])) return;

    setActionLoading(`${userId}-${action}`);
    const result = await onUserAction(userId, action);
    setActionLoading(null);

    if (!result.success) {
      alert(`エラー: ${result.error}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <h2 className="sa-section-title">
          <Users size={20} />
          ユーザー一覧
        </h2>
        <div className="sa-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="メールまたは名前で検索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="sa-search-input"
          />
        </div>
      </div>

      <div className="sa-table-wrapper">
        <table className="sa-table">
          <thead>
            <tr>
              <th>メール</th>
              <th>名前</th>
              <th>状態</th>
              <th>ワークスペース</th>
              <th>作成日</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="sa-table-loading">読み込み中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="sa-table-empty">ユーザーがいません</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'sa-row-inactive' : ''}>
                  <td>
                    <span className="sa-user-email">
                      {user.email}
                      {user.isSuperAdmin && (
                        <span className="sa-badge sa-badge--admin" title="Super Admin">
                          <Shield size={12} />
                          SA
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{user.fullName || '-'}</td>
                  <td>
                    <span className={`sa-status ${user.isActive ? 'sa-status--active' : 'sa-status--inactive'}`}>
                      {user.isActive ? 'アクティブ' : '無効'}
                    </span>
                  </td>
                  <td>{user.workspaceCount}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="sa-actions">
                      {user.isActive ? (
                        <button
                          className="sa-action-btn sa-action-btn--warning"
                          onClick={() => handleAction(user.id, 'deactivate')}
                          disabled={actionLoading !== null}
                          title="無効化"
                        >
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button
                          className="sa-action-btn sa-action-btn--success"
                          onClick={() => handleAction(user.id, 'activate')}
                          disabled={actionLoading !== null}
                          title="有効化"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}

                      {user.isSuperAdmin ? (
                        <button
                          className="sa-action-btn sa-action-btn--danger"
                          onClick={() => handleAction(user.id, 'revoke_sa')}
                          disabled={actionLoading !== null}
                          title="SA権限剥奪"
                        >
                          <Shield size={16} />
                        </button>
                      ) : (
                        <button
                          className="sa-action-btn"
                          onClick={() => handleAction(user.id, 'grant_sa')}
                          disabled={actionLoading !== null}
                          title="SA権限付与"
                        >
                          <Shield size={16} />
                        </button>
                      )}

                      <button
                        className="sa-action-btn sa-action-btn--danger"
                        onClick={() => handleAction(user.id, 'delete')}
                        disabled={actionLoading !== null}
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
