'use client';

/**
 * app/(app)/admin/page.tsx
 *
 * ワークスペース管理者ページ
 * メンバー管理、招待管理、監査ログ
 */

import { useEffect, useState } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  useWorkspaceMembers,
  useInvitations,
  useAuditLogs,
} from '@/lib/hooks/useWorkspaceAdmin';
import {
  MembersSection,
  InvitationsSection,
  AuditLogsSection,
} from '@/components/admin';
import type { WorkspaceRole } from '@/lib/types/admin';

export default function AdminPage() {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<WorkspaceRole>('member');
  const [loading, setLoading] = useState(true);
  const [noWorkspace, setNoWorkspace] = useState(false);

  // デモモード or Supabaseモードでワークスペースを取得
  useEffect(() => {
    // Supabaseユーザーの場合
    if (user?.id) {
      // 実際のワークスペースを取得（簡易実装: デフォルトワークスペース）
      const fetchWorkspace = async () => {
        try {
          const res = await fetch('/api/workspaces');
          if (res.ok) {
            const data = await res.json();
            if (data.workspaces && data.workspaces.length > 0) {
              setWorkspaceId(data.workspaces[0].id);
              setCurrentUserRole(data.workspaces[0].role || 'owner');
            } else {
              // ワークスペースが存在しない
              setNoWorkspace(true);
            }
          }
        } catch {
          // エラー無視
        } finally {
          setLoading(false);
        }
      };
      fetchWorkspace();
    } else {
      // デモモードの場合
      const session = localStorage.getItem('fdc_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setWorkspaceId(parsed.workspaceId || 'demo-workspace');
          setCurrentUserRole('owner'); // デモでは owner として扱う
        } catch {
          setWorkspaceId('demo-workspace');
          setCurrentUserRole('owner');
        }
      }
      setLoading(false);
    }
  }, [user]);

  // Hooks
  const {
    members,
    loading: membersLoading,
    changeRole,
    removeMember,
  } = useWorkspaceMembers(workspaceId);

  const {
    invitations,
    loading: invitationsLoading,
    sendInvitation,
    revokeInvitation,
  } = useInvitations(workspaceId);

  const {
    logs,
    loading: logsLoading,
    hasMore,
    loadMore,
  } = useAuditLogs(workspaceId);

  // 権限チェック
  const canAccessAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  // ローディング中
  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <p>ワークスペースを読み込み中...</p>
        </div>
      </div>
    );
  }

  // ワークスペースが存在しない場合
  if (noWorkspace || !workspaceId) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <Settings size={24} />
          <h1>ワークスペース管理</h1>
        </div>
        <div className="admin-content">
          <div className="admin-section">
            <div className="empty-message">
              <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '8px' }}>ワークスペースがありません</h3>
              <p>ワークスペースを作成するか、既存のワークスペースへの招待を受け取ってください。</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <AlertCircle size={48} />
          <h2>アクセス権限がありません</h2>
          <p>管理者ページへのアクセスには管理者権限が必要です。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <Settings size={24} />
        <h1>ワークスペース管理</h1>
      </div>

      <div className="admin-content">
        {/* メンバー管理 */}
        <MembersSection
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={user?.id || 'demo-user'}
          loading={membersLoading}
          onChangeRole={changeRole}
          onRemoveMember={removeMember}
        />

        {/* 招待管理 */}
        <InvitationsSection
          invitations={invitations}
          currentUserRole={currentUserRole}
          loading={invitationsLoading}
          onSendInvitation={sendInvitation}
          onRevokeInvitation={revokeInvitation}
        />

        {/* 監査ログ */}
        <AuditLogsSection
          logs={logs}
          loading={logsLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
