import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProspectSchema, updateStatusSchema } from '@/lib/validations/prospect';
import { logActivityForUser } from '@/lib/utils/audit-log';

interface RouteParams {
  params: Promise<{ prospectId: string }>;
}

/**
 * GET /api/prospects/[prospectId]
 * 単一リードを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data: prospect, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .single();

    if (error || !prospect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(prospect);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prospects/[prospectId]
 * リードを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 所有権の確認
    const { data: existingProspect } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .single();

    if (!existingProspect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // ステータスのみの更新かどうかで使用するスキーマを切り替え
    const isStatusOnly = Object.keys(body).length === 1 && 'status' in body;
    const validation = isStatusOnly
      ? updateStatusSchema.safeParse(body)
      : updateProspectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // 空文字をnullに変換
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value === '') {
        updateData[key] = null;
      } else if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const { data: prospect, error } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prospect:', error);
      return NextResponse.json(
        { error: 'リードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // アクティビティログ記録
    const action = isStatusOnly ? 'status_change' : 'update';
    await logActivityForUser({
      userId: user.id,
      action,
      resourceType: 'prospect',
      resourceId: prospectId,
      details: { name: prospect.name, company: prospect.company, changes: updateData },
    });

    return NextResponse.json(prospect);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prospects/[prospectId]
 * リードを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 削除前にリード情報を取得（ログ用）
    const { data: existingProspect } = await supabase
      .from('prospects')
      .select('id, name, company')
      .eq('id', prospectId)
      .eq('user_id', user.id)
      .single();

    if (!existingProspect) {
      return NextResponse.json(
        { error: 'リードが見つかりません' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospectId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting prospect:', error);
      return NextResponse.json(
        { error: 'リードの削除に失敗しました' },
        { status: 500 }
      );
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'delete',
      resourceType: 'prospect',
      resourceId: prospectId,
      details: { name: existingProspect.name, company: existingProspect.company },
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
