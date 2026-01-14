import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateClientSchema } from '@/lib/validations/client';
import { logActivityForUser } from '@/lib/utils/audit-log';

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/clients/[clientId]
 * クライアント詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (error || !client) {
      return NextResponse.json(
        { error: 'クライアントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[clientId]
 * クライアントを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // 空文字を null に変換
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value === '') {
        updateData[key] = null;
      } else if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'クライアントの更新に失敗しました' },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: 'クライアントが見つかりません' },
        { status: 404 }
      );
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'update',
      resourceType: 'client',
      resourceId: clientId,
      details: { name: client.name, company: client.company, changes: updateData },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[clientId]
 * クライアントを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 削除前にクライアント情報を取得（ログ用）
    const { data: existingClient } = await supabase
      .from('clients')
      .select('name, company')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json(
        { error: 'クライアントの削除に失敗しました' },
        { status: 500 }
      );
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'delete',
      resourceType: 'client',
      resourceId: clientId,
      details: { name: existingClient?.name, company: existingClient?.company },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
