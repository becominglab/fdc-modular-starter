import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inviteMemberSchema } from '@/lib/validations/workspace';

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/members
 * ワークスペースメンバー一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // メンバーシップを確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'ワークスペースが見つかりません' },
        { status: 404 }
      );
    }

    // メンバー一覧を取得（ユーザー情報付き）
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        user_id,
        role,
        created_at,
        updated_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json(
        { error: 'メンバーの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * メンバーを招待（追加）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER/ADMIN のみ）
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = inviteMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, role } = validation.data;

    // メールアドレスからユーザーを検索
    // Note: この実装ではauth.usersテーブルへの直接アクセスが必要
    // 実際の実装では招待メール機能などを使用することが多い
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 既にメンバーか確認
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: '既にメンバーです' },
        { status: 400 }
      );
    }

    // メンバーを追加
    const { data: newMember, error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: invitedUser.id,
        role,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding member:', insertError);
      return NextResponse.json(
        { error: 'メンバーの追加に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
