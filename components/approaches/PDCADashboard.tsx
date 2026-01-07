'use client';

import { useState } from 'react';
import {
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  CalendarDays,
  Settings,
} from 'lucide-react';
import type { ApproachStats, GoalPeriod, CreateGoalInput } from '@/lib/types/approach';

interface PDCADashboardProps {
  stats: ApproachStats;
  onSetGoal: (input: CreateGoalInput) => Promise<unknown>;
}

export function PDCADashboard({ stats, onSetGoal }: PDCADashboardProps) {
  const [isSettingGoal, setIsSettingGoal] = useState(false);
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>('weekly');
  const [goalTarget, setGoalTarget] = useState('10');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    try {
      await onSetGoal({
        period: goalPeriod,
        target_count: parseInt(goalTarget, 10),
      });
      setIsSettingGoal(false);
    } catch (err) {
      console.error('Goal save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 達成率に応じた色を取得
  const getAchievementColor = (rate: number | null) => {
    if (rate === null) return 'text-gray-400';
    if (rate >= 100) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (rate: number | null) => {
    if (rate === null) return 'bg-gray-200';
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Target size={16} />
          PDCA分析
        </h3>
        <button
          onClick={() => setIsSettingGoal(!isSettingGoal)}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
          title="目標設定"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* 目標設定フォーム */}
      {isSettingGoal && (
        <div className="p-3 bg-blue-50 rounded-lg space-y-3">
          <p className="text-sm font-medium text-blue-700">目標を設定</p>
          <div className="flex gap-2">
            <select
              value={goalPeriod}
              onChange={(e) => setGoalPeriod(e.target.value as GoalPeriod)}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">今週</option>
              <option value="monthly">今月</option>
            </select>
            <input
              type="number"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              min="1"
              max="1000"
              className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-sm text-gray-600">件</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSettingGoal(false)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveGoal}
              disabled={isSaving}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '設定'}
            </button>
          </div>
        </div>
      )}

      {/* 達成率 */}
      <div className="space-y-4">
        {/* 週間目標 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <CalendarDays size={14} />
              <span>今週</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">{stats.thisWeek}</span>
              {stats.weeklyGoal && (
                <span className="text-sm text-gray-500"> / {stats.weeklyGoal}</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressBarColor(stats.weeklyAchievementRate)}`}
              style={{ width: `${Math.min(stats.weeklyAchievementRate ?? 0, 100)}%` }}
            />
          </div>
          {stats.weeklyAchievementRate !== null && (
            <p className={`text-xs mt-1 ${getAchievementColor(stats.weeklyAchievementRate)}`}>
              達成率: {stats.weeklyAchievementRate}%
            </p>
          )}
          {stats.weeklyGoal === null && (
            <p className="text-xs text-gray-400 mt-1">目標未設定</p>
          )}
        </div>

        {/* 月間目標 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar size={14} />
              <span>今月</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">{stats.thisMonth}</span>
              {stats.monthlyGoal && (
                <span className="text-sm text-gray-500"> / {stats.monthlyGoal}</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressBarColor(stats.monthlyAchievementRate)}`}
              style={{ width: `${Math.min(stats.monthlyAchievementRate ?? 0, 100)}%` }}
            />
          </div>
          {stats.monthlyAchievementRate !== null && (
            <p className={`text-xs mt-1 ${getAchievementColor(stats.monthlyAchievementRate)}`}>
              達成率: {stats.monthlyAchievementRate}%
            </p>
          )}
          {stats.monthlyGoal === null && (
            <p className="text-xs text-gray-400 mt-1">目標未設定</p>
          )}
        </div>
      </div>

      {/* 成功率 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600 flex items-center gap-1.5">
            <TrendingUp size={14} />
            成功率
          </span>
          <span className="text-2xl font-bold text-gray-900">{stats.successRate}%</span>
        </div>

        {/* 結果ステータス内訳 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-green-50 rounded">
            <CheckCircle size={16} className="mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-700">{stats.byResultStatus.success}</p>
            <p className="text-xs text-gray-500">成功</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <Clock size={16} className="mx-auto text-yellow-600 mb-1" />
            <p className="text-lg font-bold text-yellow-700">{stats.byResultStatus.pending}</p>
            <p className="text-xs text-gray-500">保留</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <XCircle size={16} className="mx-auto text-red-600 mb-1" />
            <p className="text-lg font-bold text-red-700">{stats.byResultStatus.failed}</p>
            <p className="text-xs text-gray-500">失敗</p>
          </div>
        </div>
      </div>
    </div>
  );
}
