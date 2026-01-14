'use client';

/**
 * app/(app)/admin/page.tsx
 *
 * 管理者ページ
 * - ワークスペース管理（メンバー、招待、監査ログ）
 * - Super Admin（SA権限保持者のみ）
 */

import { useEffect, useState } from 'react';
import { Settings, Shield, AlertCircle, Plus, Loader2, Users, Building2, Target } from 'lucide-react';
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
  SAStatsCard,
  TenantList,
  UserManagement,
  SecurityMonitor,
} from '@/components/admin';
import type { WorkspaceRole } from '@/lib/types/admin';
import type { SystemStats } from '@/lib/types/super-admin';

type TabType = 'workspace' | 'super-admin';

export default function AdminPage() {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<WorkspaceRole>('member');
  const [loading, setLoading] = useState(true);
  const [noWorkspace, setNoWorkspace] = useState(false);
  const [creating, setCreating] = useState(false);

  // Super Admin 関連
  const [activeTab, setActiveTab] = useState<TabType>('workspace');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saStats, setSaStats] = useState<SystemStats | null>(null);
  const [saLoading, setSaLoading] = useState(false);

  // ワークスペース作成
  const handleCreateWorkspace = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'マイワークスペース',
          slug: `workspace-${Date.now()}`,
          description: '自動作成されたワークスペース',
        }),
      });
      if (res.ok) {
        const workspace = await res.json();
        setWorkspaceId(workspace.id);
        setCurrentUserRole('owner');
        setNoWorkspace(false);
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreating(false);
    }
  };

  // SA統計取得
  const fetchSAStats = async () => {
    setSaLoading(true);
    try {
      const res = await fetch('/api/super-admin/stats');
      if (res.ok) {
        const data = await res.json();
        setIsSuperAdmin(true);
        setSaStats(data);
      } else if (res.status === 403) {
        setIsSuperAdmin(false);
      }
    } catch {
      setIsSuperAdmin(false);
    } finally {
      setSaLoading(false);
    }
  };

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
      // SA権限チェック
      fetchSAStats();
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
    updateInvitationRole,
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

  return (
    <div className="admin-page">
      {/* ヘッダーとタブ */}
      <div className="admin-header" style={{ marginBottom: 0 }}>
        <Settings size={24} />
        <h1>管理</h1>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workspace'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 size={16} />
            ワークスペース管理
          </span>
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('super-admin')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'super-admin'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield size={16} />
              Super Admin
            </span>
          </button>
        )}
      </div>

      {/* ワークスペース管理タブ */}
      {activeTab === 'workspace' && (
        <>
          {/* ワークスペースが存在しない場合 */}
          {noWorkspace || !workspaceId ? (
            <div className="admin-content">
              <div className="admin-section">
                <div className="empty-message">
                  <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <h3 style={{ marginBottom: '8px' }}>ワークスペースがありません</h3>
                  <p style={{ marginBottom: '20px' }}>ワークスペースを作成して、メンバー管理を始めましょう。</p>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={creating}
                    className="btn btn-primary"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        作成中...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        ワークスペースを作成
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : !canAccessAdmin ? (
            <div className="admin-error">
              <AlertCircle size={48} />
              <h2>アクセス権限がありません</h2>
              <p>管理者ページへのアクセスには管理者権限が必要です。</p>
            </div>
          ) : (
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
                onUpdateInvitationRole={updateInvitationRole}
              />

              {/* 監査ログ */}
              <AuditLogsSection
                logs={logs}
                loading={logsLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            </div>
          )}
        </>
      )}

      {/* Super Admin タブ */}
      {activeTab === 'super-admin' && isSuperAdmin && (
        <div>
          {/* 統計カード */}
          {saLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : saStats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <SAStatsCard
                  title="総ユーザー"
                  value={saStats.totalUsers}
                  icon={Users}
                />
                <SAStatsCard
                  title="今日のアクティブ"
                  value={saStats.activeUsersToday}
                  icon={Users}
                  description="本日更新"
                />
                <SAStatsCard
                  title="ワークスペース"
                  value={saStats.totalWorkspaces}
                  icon={Building2}
                />
                <SAStatsCard
                  title="保留中の招待"
                  value={saStats.pendingInvitations}
                  icon={Target}
                />
                <SAStatsCard
                  title="今日のセキュリティイベント"
                  value={saStats.securityEventsToday}
                  icon={Shield}
                />
              </div>

              {/* メインコンテンツ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <TenantList />
                <UserManagement />
              </div>

              {/* セキュリティモニター */}
              <SecurityMonitor />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
