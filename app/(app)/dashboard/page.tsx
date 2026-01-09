'use client';

/**
 * app/(app)/dashboard/page.tsx
 *
 * ダッシュボードページ
 * - Google Calendar / Tasks ウィジェット表示
 */

import { LayoutDashboard } from 'lucide-react';
import { TodayEventsWidget } from '@/components/dashboard/TodayEventsWidget';
import { GoogleTasksWidget } from '@/components/dashboard/GoogleTasksWidget';

export default function DashboardPage() {
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
            <span style={{ fontSize: '24px' }}>📋</span>
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
            <span style={{ fontSize: '24px' }}>👥</span>
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
            <span style={{ fontSize: '24px' }}>🏢</span>
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
            <span style={{ fontSize: '24px' }}>🗺️</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Action Map</span>
          </a>
        </div>
      </div>
    </div>
  );
}
