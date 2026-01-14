/**
 * app/(app)/super-admin/page.tsx
 *
 * Super Admin ダッシュボード
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/super-admin/StatCard';
import { TenantsTable } from '@/components/super-admin/TenantsTable';
import { UsersTable } from '@/components/super-admin/UsersTable';
import { SecurityMonitor } from '@/components/super-admin/SecurityMonitor';
import {
  useSystemStats,
  useTenants,
  useUsers,
  useSecurityEvents,
} from '@/lib/hooks/useSuperAdmin';

type TabType = 'overview' | 'tenants' | 'users' | 'security';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const { stats, loading: statsLoading, refetch: refetchStats } = useSystemStats();
  const { tenants, loading: tenantsLoading, search: tenantSearch, setSearch: setTenantSearch } = useTenants();
  const { users, loading: usersLoading, search: userSearch, setSearch: setUserSearch, executeUserAction } = useUsers();
  const { events, loading: eventsLoading, severity, setSeverity } = useSecurityEvents();

  // 権限チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/super-admin/stats');
        if (res.ok) {
          setAuthorized(true);
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      }
    };
    checkAuth();
  }, [router]);

  if (authorized === null) {
    return (
      <div className="sa-loading-page">
        <div className="sa-loading-spinner">権限を確認中...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="sa-forbidden-page">
        <Shield size={48} />
        <h1>アクセス拒否</h1>
        <p>Super Admin 権限が必要です。</p>
        <button onClick={() => router.push('/dashboard')} className="sa-back-btn">
          ダッシュボードに戻る
        </button>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: '概要' },
    { id: 'tenants', label: 'テナント' },
    { id: 'users', label: 'ユーザー' },
    { id: 'security', label: 'セキュリティ' },
  ];

  return (
    <div className="sa-dashboard">
      <header className="sa-header">
        <div className="sa-header-title">
          <Shield size={28} />
          <h1>Super Admin</h1>
        </div>
        <button onClick={() => refetchStats()} className="sa-refresh-btn" title="更新">
          <RefreshCw size={18} />
        </button>
      </header>

      <nav className="sa-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sa-tab ${activeTab === tab.id ? 'sa-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="sa-main">
        {activeTab === 'overview' && (
          <div className="sa-overview">
            <StatCard stats={stats} loading={statsLoading} />

            <div className="sa-overview-grid">
              <div className="sa-overview-section">
                <h3>最近のテナント</h3>
                <TenantsTable
                  tenants={tenants.slice(0, 5)}
                  loading={tenantsLoading}
                  search=""
                  onSearchChange={() => {}}
                />
              </div>

              <div className="sa-overview-section">
                <h3>最近のセキュリティイベント</h3>
                <SecurityMonitor
                  events={events.slice(0, 5)}
                  loading={eventsLoading}
                  onSeverityChange={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <TenantsTable
            tenants={tenants}
            loading={tenantsLoading}
            search={tenantSearch}
            onSearchChange={setTenantSearch}
          />
        )}

        {activeTab === 'users' && (
          <UsersTable
            users={users}
            loading={usersLoading}
            search={userSearch}
            onSearchChange={setUserSearch}
            onUserAction={executeUserAction}
          />
        )}

        {activeTab === 'security' && (
          <SecurityMonitor
            events={events}
            loading={eventsLoading}
            severity={severity}
            onSeverityChange={setSeverity}
          />
        )}
      </main>
    </div>
  );
}
