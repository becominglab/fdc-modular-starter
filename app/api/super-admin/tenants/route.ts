/**
 * app/api/super-admin/tenants/route.ts
 *
 * GET /api/super-admin/tenants - 全テナント（ワークスペース）一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { TenantSummary } from '@/lib/types/super-admin';

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceClient = createServiceClient() as any;

    // ワークスペース取得
    let query = serviceClient
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: workspaces, error: wsError } = await query;

    if (wsError) {
      console.error('Workspaces fetch error:', wsError);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    // 各ワークスペースの詳細情報を取得
    const tenants: TenantSummary[] = await Promise.all(
      ((workspaces || []) as WorkspaceRow[]).map(async (ws) => {
        // メンバー数
        const { count: memberCount } = await serviceClient
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id);

        // オーナー情報
        const { data: owner } = await serviceClient
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', ws.id)
          .eq('role', 'owner')
          .single();

        let ownerEmail = 'Unknown';
        if (owner) {
          const { data: profile } = await serviceClient
            .from('profiles')
            .select('email')
            .eq('id', owner.user_id)
            .single();
          ownerEmail = profile?.email || 'Unknown';
        }

        // 最終アクティビティ（監査ログから）
        const { data: lastActivity } = await serviceClient
          .from('audit_logs')
          .select('created_at')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          ownerEmail,
          memberCount: memberCount || 0,
          createdAt: ws.created_at,
          lastActivityAt: lastActivity?.created_at || null,
        };
      })
    );

    return NextResponse.json({ tenants, total: tenants.length });
  } catch (error) {
    console.error('Super admin tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
