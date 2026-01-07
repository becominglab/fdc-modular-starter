/**
 * app/api/approaches/[approachId]/route.ts
 *
 * GET /api/approaches/:id - アプローチ詳細取得
 * PATCH /api/approaches/:id - アプローチ更新
 * DELETE /api/approaches/:id - アプローチ削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateApproachSchema } from '@/lib/validations/approach';

type Params = Promise<{ approachId: string }>;

// GET: アプローチ詳細取得
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('approaches')
      .select('*')
      .eq('id', approachId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'アプローチが見つかりません' },
        { status: 404 }
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

// PATCH: アプローチ更新
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateApproachSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('approaches')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approachId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'アプローチの更新に失敗しました' },
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

// DELETE: アプローチ削除
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { approachId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('approaches')
      .delete()
      .eq('id', approachId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'アプローチの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
