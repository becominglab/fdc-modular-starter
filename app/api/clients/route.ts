import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClientSchema } from '@/lib/validations/client';
import { logActivityForUser } from '@/lib/utils/audit-log';

/**
 * GET /api/clients
 * クライアント一覧を取得
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('contract_date', { ascending: false });

    // 検索フィルター
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'クライアントの取得に失敗しました' },
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

/**
 * POST /api/clients
 * 新規クライアントを作成
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
    const validation = createClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, company, email, phone, contract_date, notes, prospect_id } = validation.data;

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name,
        company,
        email: email || null,
        phone: phone || null,
        contract_date: contract_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        prospect_id: prospect_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { error: 'クライアントの作成に失敗しました' },
        { status: 500 }
      );
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'create',
      resourceType: 'client',
      resourceId: client.id,
      details: { name: client.name, company: client.company },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
