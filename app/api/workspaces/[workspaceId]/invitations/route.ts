/**
 * app/api/workspaces/[workspaceId]/invitations/route.ts
 *
 * GET /api/workspaces/:workspaceId/invitations - 招待一覧取得
 * POST /api/workspaces/:workspaceId/invitations - 招待作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const createInvitationSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

// GET: 招待一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
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

    // 招待一覧取得（未承諾のみ）
    const { data: invitations, error } = await serviceClient
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Invitations fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 招待作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
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

    const body = await request.json();
    const result = createInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    // ADMIN は admin ロールの招待不可
    if (membership.role === 'admin' && result.data.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot invite admins' }, { status: 403 });
    }

    // 既存の未承諾招待確認
    const { data: existingInvitation } = await serviceClient
      .from('invitations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', result.data.email)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 409 }
      );
    }

    // トークン生成
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

    // 招待作成
    const { data: invitation, error: createError } = await serviceClient
      .from('invitations')
      .insert({
        workspace_id: workspaceId,
        email: result.data.email,
        role: result.data.role,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Invitation create error:', createError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // 監査ログ記録
    await serviceClient.from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'invite_sent',
      target_type: 'invitation',
      target_id: invitation.id,
      details: {
        email: result.data.email,
        role: result.data.role,
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
