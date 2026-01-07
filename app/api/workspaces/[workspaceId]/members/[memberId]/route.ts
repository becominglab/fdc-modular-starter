import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateRoleSchema } from '@/lib/validations/workspace';

interface RouteParams {
  params: Promise<{ workspaceId: string; memberId: string }>;
}

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId]
 * メンバーのロールを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 権限チェック（OWNER/ADMIN のみ）
    const { data: currentUserMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 対象メンバーを取得
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'メンバーが見つかりません' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role: newRole } = validation.data;

    // オーナー権限の移譲チェック
    if (newRole === 'owner') {
      // オーナーのみがオーナー権限を移譲できる
      if (currentUserMembership.role !== 'owner') {
        return NextResponse.json(
          { error: 'オーナー権限の移譲はオーナーのみ可能です' },
          { status: 403 }
        );
      }

      // 現在のオーナーをADMINに降格
      const { error: demoteError } = await supabase
        .from('workspace_members')
        .update({ role: 'admin' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id);

      if (demoteError) {
        console.error('Error demoting owner:', demoteError);
        return NextResponse.json(
          { error: 'ロールの更新に失敗しました' },
          { status: 500 }
        );
      }
    }

    // オーナーのロール変更防止（オーナー移譲以外）
    if (targetMember.role === 'owner' && newRole !== 'owner') {
      return NextResponse.json(
        { error: 'オーナーのロールは変更できません。オーナー権限を移譲してください' },
        { status: 400 }
      );
    }

    // ADMINはADMINやOWNERのロールを変更できない
    if (currentUserMembership.role === 'admin' && ['owner', 'admin'].includes(targetMember.role)) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // ロールを更新
    const { data: updatedMember, error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json(
        { error: 'ロールの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId]
 * メンバーを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 対象メンバーを取得
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: 'メンバーが見つかりません' },
        { status: 404 }
      );
    }

    // 自分自身の退出の場合
    const isSelfRemoval = targetMember.user_id === user.id;

    if (isSelfRemoval) {
      // オーナーは退出できない
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'オーナーは退出できません。先にオーナー権限を移譲してください' },
          { status: 400 }
        );
      }
    } else {
      // 他のメンバーを削除する場合は権限チェック
      const { data: currentUserMembership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
        return NextResponse.json(
          { error: '権限がありません' },
          { status: 403 }
        );
      }

      // オーナーは削除できない
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'オーナーは削除できません' },
          { status: 400 }
        );
      }

      // ADMINはADMINを削除できない
      if (currentUserMembership.role === 'admin' && targetMember.role === 'admin') {
        return NextResponse.json(
          { error: '権限がありません' },
          { status: 403 }
        );
      }
    }

    // メンバーを削除
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error deleting member:', deleteError);
      return NextResponse.json(
        { error: 'メンバーの削除に失敗しました' },
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
