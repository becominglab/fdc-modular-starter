import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logActivityForUser } from '@/lib/utils/audit-log';

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  period: z.string().min(1, '期間は必須です'),
});

// GET: Objective 一覧取得（進捗率計算付き）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabase
      .from('objectives')
      .select(`
        *,
        key_results (
          id,
          target_value,
          current_value
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Objectives fetch error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    // 各Objectiveの進捗率を計算（子KRの平均）
    const objectivesWithProgress = (data || []).map((obj) => {
      const krs = obj.key_results || [];
      const krCount = krs.length;

      if (krCount === 0) {
        return {
          ...obj,
          progress_rate: 0,
          key_result_count: 0,
          key_results: undefined,
        };
      }

      // 各KRの進捗率を計算
      const krProgressRates = krs.map((kr: { target_value: number; current_value: number }) => {
        if (kr.target_value === 0) return 0;
        return Math.min((kr.current_value / kr.target_value) * 100, 100);
      });

      // KRの平均進捗率
      const avgProgress = Math.round(
        krProgressRates.reduce((sum: number, rate: number) => sum + rate, 0) / krCount
      );

      return {
        ...obj,
        progress_rate: avgProgress,
        key_result_count: krCount,
        key_results: undefined,
      };
    });

    return NextResponse.json(objectivesWithProgress);
  } catch (error) {
    console.error('Objectives GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: Objective 作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('objectives')
      .insert({
        ...result.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Objective create error:', error);
      return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'create',
      resourceType: 'objective',
      resourceId: data.id,
      details: { title: data.title, period: data.period },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Objectives POST error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
