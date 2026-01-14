'use client';

/**
 * components/admin/MembersSection.tsx
 *
 * メンバー一覧セクション
 */

import { useState } from 'react';
import { Users, MoreVertical, UserMinus, Shield, User, Loader2 } from 'lucide-react';
import type { WorkspaceMember, WorkspaceRole } from '@/lib/types/admin';
import { canManageRole } from '@/lib/types/admin';
import { RoleBadge } from './RoleBadge';

interface MembersSectionProps {
  members: WorkspaceMember[];
  currentUserRole: WorkspaceRole;
  currentUserId: string;
  loading: boolean;
  onChangeRole: (memberId: string, newRole: WorkspaceRole) => Promise<boolean>;
  onRemoveMember: (memberId: string) => Promise<boolean>;
}

export function MembersSection({
  members,
  currentUserRole,
  currentUserId,
  loading,
  onChangeRole,
  onRemoveMember,
}: MembersSectionProps) {
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleChangeRole = async (memberId: string, newRole: WorkspaceRole) => {
    setProcessing(memberId);
    setActionMenu(null);
    await onChangeRole(memberId, newRole);
    setProcessing(null);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    setProcessing(memberId);
    setActionMenu(null);
    await onRemoveMember(memberId);
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="admin-section">
        <div className="section-header">
          <Users size={20} />
          <h2>メンバー</h2>
        </div>
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <Users size={20} />
        <h2>メンバー</h2>
        <span className="member-count">{members.length}人</span>
      </div>

      <div className="members-list">
        {members.map(member => {
          const isCurrentUser = member.user_id === currentUserId;
          const canManage = !isCurrentUser && canManageRole(currentUserRole, member.role);

          return (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <div className="member-avatar">
                  {member.user?.full_name?.[0] || member.user?.email?.[0] || '?'}
                </div>
                <div className="member-details">
                  <span className="member-name">
                    {member.user?.full_name || member.user?.email || member.user_id.slice(0, 8)}
                    {isCurrentUser && <span className="you-badge">あなた</span>}
                  </span>
                  <span className="member-email">{member.user?.email || member.user_id}</span>
                </div>
              </div>

              <div className="member-actions">
                <RoleBadge role={member.role} />

                {canManage && (
                  <div className="action-menu-wrapper">
                    <button
                      onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                      className="btn-icon"
                      disabled={processing === member.id}
                    >
                      {processing === member.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <MoreVertical size={16} />
                      )}
                    </button>

                    {actionMenu === member.id && (
                      <div className="action-menu">
                        {member.role === 'member' && currentUserRole === 'owner' && (
                          <button onClick={() => handleChangeRole(member.id, 'admin')}>
                            <Shield size={14} />
                            管理者に昇格
                          </button>
                        )}
                        {member.role === 'admin' && currentUserRole === 'owner' && (
                          <button onClick={() => handleChangeRole(member.id, 'member')}>
                            <User size={14} />
                            メンバーに降格
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="danger"
                        >
                          <UserMinus size={14} />
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
