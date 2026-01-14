/**
 * app/api/invitations/accept/route.ts
 *
 * POST /api/invitations/accept - 招待を承諾
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = acceptInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // トークンで招待を検索
    const { data: invitation, error: invitationError } = await serviceClient
      .from('invitations')
      .select('*, workspaces(id, name)')
      .eq('token', result.data.token)
      .is('accepted_at', null)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: '招待が見つからないか、既に承諾されています' },
        { status: 404 }
      );
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '招待の有効期限が切れています' },
        { status: 410 }
      );
    }

    // メールアドレスの一致確認（オプション - 厳密なチェック）
    if (invitation.email !== user.email) {
      return NextResponse.json(
        { error: 'この招待は別のメールアドレス宛てです' },
        { status: 403 }
      );
    }

    // 既にメンバーか確認
    const { data: existingMember } = await serviceClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      // 既にメンバーの場合は招待を承諾済みにして成功を返す
      await serviceClient
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: true,
        message: '既にワークスペースのメンバーです',
        workspaceId: invitation.workspace_id,
      });
    }

    // メンバーとして追加
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role as 'owner' | 'admin' | 'member',
      });

    if (memberError) {
      console.error('Failed to add member:', memberError);
      return NextResponse.json(
        { error: 'メンバーの追加に失敗しました' },
        { status: 500 }
      );
    }

    // 招待を承諾済みに更新
    await serviceClient
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // 監査ログ記録
    await serviceClient.from('audit_logs').insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      action: 'invite_accepted',
      target_type: 'invitation',
      target_id: invitation.id,
      details: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    const workspaceName = (invitation.workspaces as { id: string; name: string } | null)?.name || 'ワークスペース';

    return NextResponse.json({
      success: true,
      message: `${workspaceName} に参加しました`,
      workspaceId: invitation.workspace_id,
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
