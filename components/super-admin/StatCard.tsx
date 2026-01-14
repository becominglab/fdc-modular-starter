/**
 * components/super-admin/StatCard.tsx
 *
 * システム統計カード
 */

'use client';

import { Users, Building2, Mail, Shield, Activity } from 'lucide-react';
import type { SystemStats } from '@/lib/types/super-admin';

interface StatCardProps {
  stats: SystemStats | null;
  loading: boolean;
}

const statItems = [
  { key: 'totalUsers', label: '総ユーザー数', icon: Users },
  { key: 'activeUsersToday', label: '本日アクティブ', icon: Activity },
  { key: 'totalWorkspaces', label: '総ワークスペース', icon: Building2 },
  { key: 'pendingInvitations', label: '保留中の招待', icon: Mail },
  { key: 'securityEventsToday', label: '本日のセキュリティイベント', icon: Shield },
] as const;

export function StatCard({ stats, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="sa-stats-grid">
        {statItems.map((item) => (
          <div key={item.key} className="sa-stat-card sa-stat-card--loading">
            <div className="sa-stat-icon">
              <item.icon size={24} />
            </div>
            <div className="sa-stat-content">
              <span className="sa-stat-label">{item.label}</span>
              <span className="sa-stat-value">--</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="sa-stats-grid">
      {statItems.map((item) => {
        const value = stats ? stats[item.key] : 0;
        const isWarning = item.key === 'securityEventsToday' && value > 0;

        return (
          <div
            key={item.key}
            className={`sa-stat-card ${isWarning ? 'sa-stat-card--warning' : ''}`}
          >
            <div className="sa-stat-icon">
              <item.icon size={24} />
            </div>
            <div className="sa-stat-content">
              <span className="sa-stat-label">{item.label}</span>
              <span className="sa-stat-value">{value.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
