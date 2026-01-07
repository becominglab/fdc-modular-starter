/**
 * app/api/approaches/goals/route.ts
 *
 * GET /api/approaches/goals - 目標一覧取得
 * POST /api/approaches/goals - 目標作成/更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGoalSchema } from '@/lib/validations/approach';

// 週番号を取得するヘルパー関数
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// GET: 目標一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const year = searchParams.get('year');
    const weekOrMonth = searchParams.get('week_or_month');

    let query = supabase
      .from('approach_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('week_or_month', { ascending: false });

    if (period) {
      query = query.eq('period', period);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (weekOrMonth) {
      query = query.eq('week_or_month', parseInt(weekOrMonth));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Goals fetch error:', error);
      return NextResponse.json(
        { error: '目標の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST: 目標作成/更新（upsert）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createGoalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { period, target_count, year: inputYear, week_or_month: inputWeekOrMonth } = result.data;

    // デフォルト値: 現在の年/週/月
    const now = new Date();
    const year = inputYear ?? now.getFullYear();
    const week_or_month = inputWeekOrMonth ?? (period === 'weekly' ? getWeekNumber(now) : now.getMonth() + 1);

    // 既存の目標をチェック
    const { data: existing } = await supabase
      .from('approach_goals')
      .select('id')
      .eq('user_id', user.id)
      .eq('period', period)
      .eq('year', year)
      .eq('week_or_month', week_or_month)
      .single();

    let data;
    let error;

    if (existing) {
      // 更新
      const updateResult = await supabase
        .from('approach_goals')
        .update({
          target_count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // 新規作成
      const insertResult = await supabase
        .from('approach_goals')
        .insert({
          user_id: user.id,
          period,
          target_count,
          year,
          week_or_month,
        })
        .select()
        .single();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Goal save error:', error);
      return NextResponse.json(
        { error: '目標の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
