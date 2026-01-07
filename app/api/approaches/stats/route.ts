/**
 * app/api/approaches/stats/route.ts
 *
 * GET /api/approaches/stats - アプローチ統計取得
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApproachStats, ApproachType } from '@/lib/types/approach';

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
      .select('type, approached_at')
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
    };

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
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
