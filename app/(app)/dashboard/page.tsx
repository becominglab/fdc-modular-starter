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
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard size={28} className="text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
      </div>

      {/* Google ウィジェット */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TodayEventsWidget />
        <GoogleTasksWidget />
      </div>

      {/* クイックリンク */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-4">クイックアクセス</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href="/tasks"
            className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors group"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">タスク</span>
          </a>
          <a
            href="/leads"
            className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors group"
          >
            <span className="text-2xl mb-2 block">👥</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">リード</span>
          </a>
          <a
            href="/clients"
            className="p-4 bg-gray-50 hover:bg-green-50 rounded-lg text-center transition-colors group"
          >
            <span className="text-2xl mb-2 block">🏢</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">クライアント</span>
          </a>
          <a
            href="/action-maps"
            className="p-4 bg-gray-50 hover:bg-purple-50 rounded-lg text-center transition-colors group"
          >
            <span className="text-2xl mb-2 block">🗺️</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">Action Map</span>
          </a>
        </div>
      </div>
    </div>
  );
}
