'use client';

/**
 * app/(app)/dashboard/page.tsx
 *
 * ダッシュボードページ
 * - 統計カード表示
 * - Google Calendar / Tasks ウィジェット表示
 * - グラフ表示
 * - 未分類イベントの4象限分類
 */

import { useEffect, useState } from 'react';
import { LayoutDashboard, CheckSquare, Target, Users, Loader2 } from 'lucide-react';
import { TodayEventsWidget } from '@/components/dashboard/TodayEventsWidget';
import { GoogleTasksWidget } from '@/components/dashboard/GoogleTasksWidget';
import { UnclassifiedEvents } from '@/components/calendar/UnclassifiedEvents';
import { StatCard } from '@/components/dashboard/StatCard';
import { TaskCompletionChart } from '@/components/dashboard/TaskCompletionChart';
import { LeadPipelineChart } from '@/components/dashboard/LeadPipelineChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
    thisWeek: number;
    overdue: number;
  };
  leads: {
    total: number;
    byStatus: {
      new: number;
      approaching: number;
      negotiating: number;
      proposing: number;
      won: number;
      lost: number;
    };
    thisMonthConversions: number;
  };
  clients: {
    total: number;
    thisMonth: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string;
    created_at: string;
    details: Record<string, unknown> | null;
  }>;
  taskCompletionTrend: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <LayoutDashboard size={28} color="var(--primary)" />
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
          border: 'none',
          padding: 0,
        }}>
          ダッシュボード
        </h2>
      </div>

      {/* 統計カード */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="タスク完了率"
              value={`${stats.tasks.completionRate}%`}
              subValue={`${stats.tasks.completed} / ${stats.tasks.total} 完了`}
              icon={CheckSquare}
              color="success"
            />
            <StatCard
              title="今週のタスク"
              value={stats.tasks.thisWeek}
              subValue={stats.tasks.overdue > 0 ? `${stats.tasks.overdue}件が期限超過` : undefined}
              icon={CheckSquare}
              color={stats.tasks.overdue > 0 ? 'primary' : 'secondary'}
            />
            <StatCard
              title="リード総数"
              value={stats.leads.total}
              subValue={`今月 ${stats.leads.thisMonthConversions} 件成約`}
              icon={Target}
              color="accent"
            />
            <StatCard
              title="クライアント"
              value={stats.clients.total}
              subValue={`今月 +${stats.clients.thisMonth} 件`}
              icon={Users}
              color="secondary"
            />
          </div>

          {/* グラフエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <TaskCompletionChart data={stats.taskCompletionTrend} />
            <LeadPipelineChart data={stats.leads.byStatus} />
          </div>

          {/* アクティビティ */}
          <div className="mb-6">
            <RecentActivity activities={stats.recentActivity} />
          </div>
        </>
      ) : null}

      {/* Google ウィジェット */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <TodayEventsWidget />
        <GoogleTasksWidget />
      </div>

      {/* 未分類イベント */}
      <div style={{ marginBottom: '24px' }}>
        <UnclassifiedEvents />
      </div>

      {/* クイックリンク */}
      <div className="card">
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-dark)',
          marginBottom: '16px',
        }}>
          クイックアクセス
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          <a
            href="/tasks"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textDecoration: 'none',
            }}
          >
            <CheckSquare size={24} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>タスク</span>
          </a>
          <a
            href="/leads"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textDecoration: 'none',
            }}
          >
            <Target size={24} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>リード</span>
          </a>
          <a
            href="/clients"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textDecoration: 'none',
            }}
          >
            <Users size={24} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>クライアント</span>
          </a>
          <a
            href="/action-maps"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textDecoration: 'none',
            }}
          >
            <LayoutDashboard size={24} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Action Map</span>
          </a>
        </div>
      </div>
    </div>
  );
}
