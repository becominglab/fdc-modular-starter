'use client';

/**
 * components/admin/InvitationsSection.tsx
 *
 * 招待管理セクション
 */

import { useState } from 'react';
import { Mail, Plus, X, Copy, Clock, Loader2 } from 'lucide-react';
import type { Invitation, WorkspaceRole } from '@/lib/types/admin';
import { RoleBadge } from './RoleBadge';

interface InvitationsSectionProps {
  invitations: Invitation[];
  currentUserRole: WorkspaceRole;
  loading: boolean;
  onSendInvitation: (email: string, role: 'admin' | 'member') => Promise<Invitation | null>;
  onRevokeInvitation: (invitationId: string) => Promise<boolean>;
  onUpdateInvitationRole: (invitationId: string, role: 'admin' | 'member') => Promise<Invitation | null>;
}

export function InvitationsSection({
  invitations,
  currentUserRole,
  loading,
  onSendInvitation,
  onRevokeInvitation,
  onUpdateInvitationRole,
}: InvitationsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    const result = await onSendInvitation(email.trim(), role);
    setSending(false);

    if (result) {
      setEmail('');
      setRole('member');
      setShowForm(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('この招待を取り消しますか？')) return;
    setRevoking(invitationId);
    await onRevokeInvitation(invitationId);
    setRevoking(null);
  };

  const copyInviteLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/invite/${invitation.token}`;
    navigator.clipboard.writeText(link);
    setCopied(invitation.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRoleChange = async (invitationId: string, newRole: 'admin' | 'member') => {
    setUpdatingRole(invitationId);
    await onUpdateInvitationRole(invitationId, newRole);
    setUpdatingRole(null);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="admin-section">
      <div className="section-header">
        <Mail size={20} />
        <h2>招待</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary btn-small"
        >
          <Plus size={14} />
          新規招待
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSend} className="invite-form">
          <div className="form-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="form-input"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="form-select"
              disabled={currentUserRole !== 'owner'}
            >
              <option value="member">メンバー</option>
              {currentUserRole === 'owner' && (
                <option value="admin">管理者</option>
              )}
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !email.trim()}
            >
              {sending ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
              送信
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="section-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : invitations.length === 0 ? (
        <div className="empty-message">
          <p>保留中の招待はありません</p>
        </div>
      ) : (
        <div className="invitations-list">
          {invitations.map(invitation => (
            <div
              key={invitation.id}
              className={`invitation-item ${isExpired(invitation.expires_at) ? 'expired' : ''}`}
            >
              <div className="invitation-info">
                <span className="invitation-email">{invitation.email}</span>
                <div className="invitation-meta">
                  {currentUserRole === 'owner' ? (
                    <select
                      value={invitation.role}
                      onChange={(e) => handleRoleChange(invitation.id, e.target.value as 'admin' | 'member')}
                      className="role-select"
                      disabled={updatingRole === invitation.id || isExpired(invitation.expires_at)}
                    >
                      <option value="member">メンバー</option>
                      <option value="admin">管理者</option>
                    </select>
                  ) : (
                    <RoleBadge role={invitation.role} size="sm" />
                  )}
                  <span className="invitation-date">
                    <Clock size={12} />
                    {isExpired(invitation.expires_at)
                      ? '期限切れ'
                      : `${new Date(invitation.expires_at).toLocaleDateString('ja-JP')} まで`
                    }
                  </span>
                </div>
              </div>
              <div className="invitation-actions">
                <button
                  onClick={() => copyInviteLink(invitation)}
                  className="btn-icon"
                  title="リンクをコピー"
                >
                  {copied === invitation.id ? '✓' : <Copy size={14} />}
                </button>
                <button
                  onClick={() => handleRevoke(invitation.id)}
                  className="btn-icon btn-danger"
                  title="取り消し"
                  disabled={revoking === invitation.id}
                >
                  {revoking === invitation.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
