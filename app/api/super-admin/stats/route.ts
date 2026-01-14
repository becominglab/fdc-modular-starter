/**
 * app/api/super-admin/stats/route.ts
 *
 * GET /api/super-admin/stats - システム統計取得
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { SystemStats } from '@/lib/types/super-admin';

export async function GET() {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceClient = createServiceClient() as any;

    // 総ユーザー数
    const { count: totalUsers } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 総ワークスペース数
    const { count: totalWorkspaces } = await serviceClient
      .from('workspaces')
      .select('*', { count: 'exact', head: true });

    // 保留中の招待数
    const { count: pendingInvitations } = await serviceClient
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    // 今日のセキュリティイベント数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: securityEventsToday } = await serviceClient
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 今日アクティブなユーザー数（簡易: 今日ログインしたユーザー）
    const { count: activeUsersToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', today.toISOString());

    const stats: SystemStats = {
      totalUsers: totalUsers || 0,
      activeUsersToday: activeUsersToday || 0,
      totalWorkspaces: totalWorkspaces || 0,
      pendingInvitations: pendingInvitations || 0,
      securityEventsToday: securityEventsToday || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
