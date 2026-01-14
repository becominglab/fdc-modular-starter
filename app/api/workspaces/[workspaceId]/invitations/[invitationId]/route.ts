/**
 * app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts
 *
 * DELETE /api/workspaces/:workspaceId/invitations/:invitationId - 招待取り消し
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 権限確認
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 招待確認
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // 招待削除
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Invitation delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await supabase.from('audit_logs').insert({
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
