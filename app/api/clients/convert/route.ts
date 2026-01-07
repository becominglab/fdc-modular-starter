import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { convertToClientSchema } from '@/lib/validations/client';

/**
 * POST /api/clients/convert
 * リードをクライアントに変換（Won時）
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
    const validation = convertToClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { prospect_id, contract_date, notes } = validation.data;

    // リードを取得
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospect_id)
      .eq('user_id', user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    // 既にクライアントに変換済みかチェック
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('prospect_id', prospect_id)
      .single();

    if (existingClient) {
      return NextResponse.json(
        { error: 'このリードは既にクライアントに変換されています' },
        { status: 400 }
      );
    }

    // クライアントを作成
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: prospect.name,
        company: prospect.company,
        email: prospect.email,
        phone: prospect.phone,
        contract_date: contract_date || new Date().toISOString().split('T')[0],
        notes: notes || prospect.notes,
        prospect_id: prospect_id,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return NextResponse.json(
        { error: 'クライアントの作成に失敗しました' },
        { status: 500 }
      );
    }

    // リードのステータスを Won に更新
    const { error: updateError } = await supabase
      .from('prospects')
      .update({ status: 'won' })
      .eq('id', prospect_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating prospect status:', updateError);
      // クライアント作成は成功しているのでエラーはログのみ
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
