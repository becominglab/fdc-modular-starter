/**
 * app/api/approaches/stats/route.ts
 *
 * GET /api/approaches/stats - アプローチ統計取得（PDCA対応版）
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApproachStats, ApproachType, ApproachResultStatus } from '@/lib/types/approach';

// 週番号を取得するヘルパー関数
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 全アプローチ取得
    const { data: approaches, error } = await supabase
      .from('approaches')
      .select('type, result_status, approached_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('Stats fetch error:', error);
      return NextResponse.json(
        { error: '統計の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 日付計算
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 現在の年・週・月
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);
    const currentMonth = now.getMonth() + 1;

    // 目標取得
    const { data: goals } = await supabase
      .from('approach_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .in('period', ['weekly', 'monthly']);

    const weeklyGoal = goals?.find(
      (g) => g.period === 'weekly' && g.week_or_month === currentWeek
    );
    const monthlyGoal = goals?.find(
      (g) => g.period === 'monthly' && g.week_or_month === currentMonth
    );

    // 統計計算
    const stats: ApproachStats = {
      total: approaches?.length || 0,
      thisMonth: 0,
      thisWeek: 0,
      byType: {
        call: 0,
        email: 0,
        meeting: 0,
        visit: 0,
        other: 0,
      },
      successRate: 0,
      byResultStatus: {
        success: 0,
        pending: 0,
        failed: 0,
      },
      weeklyGoal: weeklyGoal?.target_count ?? null,
      monthlyGoal: monthlyGoal?.target_count ?? null,
      weeklyAchievementRate: null,
      monthlyAchievementRate: null,
    };

    let withResultStatus = 0;

    approaches?.forEach((approach) => {
      const approachedAt = new Date(approach.approached_at);

      // 今月
      if (approachedAt >= startOfMonth) {
        stats.thisMonth++;
      }

      // 今週
      if (approachedAt >= startOfWeek) {
        stats.thisWeek++;
      }

      // タイプ別
      const type = approach.type as ApproachType;
      if (stats.byType[type] !== undefined) {
        stats.byType[type]++;
      }

      // 結果ステータス別
      if (approach.result_status) {
        const status = approach.result_status as ApproachResultStatus;
        if (stats.byResultStatus[status] !== undefined) {
          stats.byResultStatus[status]++;
          withResultStatus++;
        }
      }
    });

    // 成功率計算（結果ステータスがあるもののうち、成功の割合）
    if (withResultStatus > 0) {
      stats.successRate = Math.round((stats.byResultStatus.success / withResultStatus) * 100);
    }

    // 達成率計算
    if (stats.weeklyGoal && stats.weeklyGoal > 0) {
      stats.weeklyAchievementRate = Math.round((stats.thisWeek / stats.weeklyGoal) * 100);
    }
    if (stats.monthlyGoal && stats.monthlyGoal > 0) {
      stats.monthlyAchievementRate = Math.round((stats.thisMonth / stats.monthlyGoal) * 100);
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
