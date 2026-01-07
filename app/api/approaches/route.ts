/**
 * app/api/approaches/route.ts
 *
 * GET /api/approaches - アプローチ一覧取得
 * POST /api/approaches - アプローチ作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApproachSchema } from '@/lib/validations/approach';

// GET: アプローチ一覧取得
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
    const prospectId = searchParams.get('prospect_id');

    let query = supabase
      .from('approaches')
      .select('*')
      .eq('user_id', user.id)
      .order('approached_at', { ascending: false });

    // prospect_id でフィルタ
    if (prospectId) {
      query = query.eq('prospect_id', prospectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Approaches fetch error:', error);
      return NextResponse.json(
        { error: 'アプローチの取得に失敗しました' },
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

// POST: アプローチ作成
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
    const result = createApproachSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { prospect_id, type, content, result: approachResult, result_status, approached_at } = result.data;

    // prospect が存在し、自分のものか確認
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospect_id)
      .eq('user_id', user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('approaches')
      .insert({
        prospect_id,
        user_id: user.id,
        type,
        content,
        result: approachResult,
        result_status: result_status || null,
        approached_at: approached_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Approach create error:', error);
      return NextResponse.json(
        { error: 'アプローチの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
