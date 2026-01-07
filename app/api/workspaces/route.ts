import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWorkspaceSchema } from '@/lib/validations/workspace';

/**
 * GET /api/workspaces
 * ユーザーが所属するワークスペース一覧を取得
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces (
          id,
          name,
          slug,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json(
        { error: 'ワークスペースの取得に失敗しました' },
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
 * POST /api/workspaces
 * 新規ワークスペースを作成
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
    const validation = createWorkspaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, slug, description } = validation.data;

    // スラッグの重複チェック
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'このスラッグは既に使用されています' },
        { status: 400 }
      );
    }

    // ワークスペースを作成
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({ name, slug, description: description || null })
      .select()
      .single();

    if (createError) {
      console.error('Error creating workspace:', createError);
      return NextResponse.json(
        { error: 'ワークスペースの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 作成者を OWNER として追加
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding owner:', memberError);
      // ワークスペースを削除（ロールバック）
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json(
        { error: 'ワークスペースの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
