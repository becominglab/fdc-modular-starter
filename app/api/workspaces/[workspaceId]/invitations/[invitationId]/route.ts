/**
 * app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts
 *
 * PATCH /api/workspaces/:workspaceId/invitations/:invitationId - 招待ロール更新
 * DELETE /api/workspaces/:workspaceId/invitations/:invitationId - 招待取り消し
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// PATCH: 招待ロール更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }
) {
  try {
    const { workspaceId, invitationId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // 権限確認（owner のみロール変更可能）
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can change invitation role' }, { status: 403 });
    }

    // 招待確認
    const { data: invitation } = await serviceClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // ロール更新
    const { data: updated, error: updateError } = await serviceClient
      .from('invitations')
      .update({ role })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) {
      console.error('Invitation update error:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await serviceClient.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'invite_role_changed',
      target_type: 'invitation',
      target_id: invitationId,
      details: {
        email: invitation.email,
        old_role: invitation.role,
        new_role: role,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Invitation PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 招待取り消し
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }
) {
  try {
    const { workspaceId, invitationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Service client を使用して RLS をバイパス
    const serviceClient = createServiceClient();

    // 権限確認
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 招待確認
    const { data: invitation } = await serviceClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // 招待削除
    const { error: deleteError } = await serviceClient
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Invitation delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await serviceClient.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'invite_revoked',
      target_type: 'invitation',
      target_id: invitationId,
      details: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invitation DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
