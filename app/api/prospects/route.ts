import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProspectSchema } from '@/lib/validations/prospect';
import type { ProspectStatus } from '@/lib/types/prospect';

const VALID_STATUSES: ProspectStatus[] = ['new', 'approaching', 'negotiating', 'proposing', 'won', 'lost'];

function isValidStatus(status: string): status is ProspectStatus {
  return VALID_STATUSES.includes(status as ProspectStatus);
}

/**
 * GET /api/prospects
 * リード一覧を取得（自分のリードのみ）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');

    // クエリビルダー
    let query = supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // ステータスフィルター（有効なステータスのみ）
    if (statusParam && statusParam !== 'all' && isValidStatus(statusParam)) {
      query = query.eq('status', statusParam);
    }

    // 検索フィルター（名前・会社名）
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data: prospects, error } = await query;

    if (error) {
      console.error('Error fetching prospects:', error);
      return NextResponse.json(
        { error: 'リードの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(prospects);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospects
 * 新規リードを作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createProspectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, company, email, phone, status, notes } = validation.data;

    const { data: prospect, error } = await supabase
      .from('prospects')
      .insert({
        user_id: user.id,
        name,
        company,
        email: email || null,
        phone: phone || null,
        status: status || 'new',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prospect:', error);
      return NextResponse.json(
        { error: 'リードの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(prospect, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
