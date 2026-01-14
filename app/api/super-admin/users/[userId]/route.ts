/**
 * app/api/super-admin/users/[userId]/route.ts
 *
 * PATCH /api/super-admin/users/:userId - ユーザーアクション実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { UserAction } from '@/lib/types/super-admin';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

interface ProfileRow {
  id: string;
  email?: string;
  full_name?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { isSuperAdmin, userId: adminId, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const action = body.action as UserAction;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const validActions: UserAction[] = ['activate', 'deactivate', 'delete', 'grant_sa', 'revoke_sa'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceClient = createServiceClient() as any;

    // 対象ユーザーの存在確認
    const { data: targetUserData, error: userError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const targetUser = targetUserData as ProfileRow | null;

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 自分自身への操作を禁止（SA権限剥奪・削除など）
    if (userId === adminId && ['deactivate', 'delete', 'revoke_sa'].includes(action)) {
      return NextResponse.json({ error: 'Cannot perform this action on yourself' }, { status: 400 });
    }

    let updateData: Record<string, boolean> = {};
    let eventType = '';

    switch (action) {
      case 'activate':
        updateData = { is_active: true };
        eventType = 'user_activated';
        break;
      case 'deactivate':
        updateData = { is_active: false };
        eventType = 'user_deactivated';
        break;
      case 'grant_sa':
        updateData = { is_super_admin: true };
        eventType = 'sa_granted';
        break;
      case 'revoke_sa':
        updateData = { is_super_admin: false };
        eventType = 'sa_revoked';
        break;
      case 'delete':
        // 論理削除（is_active = false + email 匿名化）
        const { error: deleteError } = await serviceClient
          .from('profiles')
          .update({
            is_active: false,
            email: `deleted_${Date.now()}@deleted.local`,
            full_name: 'Deleted User',
          })
          .eq('id', userId);

        if (deleteError) {
          console.error('User delete error:', deleteError);
          return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
        }

        // セキュリティイベント記録
        await serviceClient.from('security_events').insert({
          event_type: 'user_deleted',
          severity: 'high',
          user_id: adminId,
          details: { targetUserId: userId, targetEmail: targetUser.email },
        });

        return NextResponse.json({ success: true, action: 'delete' });
    }

    // 通常の更新処理
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await serviceClient
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('User update error:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      // セキュリティイベント記録
      await serviceClient.from('security_events').insert({
        event_type: eventType,
        severity: action.includes('sa') ? 'high' : 'medium',
        user_id: adminId,
        details: { targetUserId: userId, targetEmail: targetUser.email },
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Super admin user action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
