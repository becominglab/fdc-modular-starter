/**
 * app/api/workspaces/[workspaceId]/activity/route.ts
 *
 * GET /api/workspaces/:workspaceId/activity - アクティビティログ取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const userId = searchParams.get('user_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (serviceClient as any)
      .from('audit_logs')
      .select(`
        id,
        workspace_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    // Filters
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59`);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Activity fetch error:', error);
      // テーブルが存在しない場合やエラーの場合は空のレスポンスを返す
      return NextResponse.json({
        logs: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    const typedLogs = logs as AuditLog[];
    const hasMore = typedLogs.length > limit;
    const results = hasMore ? typedLogs.slice(0, limit) : typedLogs;
    const nextCursor = hasMore ? results[results.length - 1].created_at : null;

    // Get user info for each log
    const userIds = [...new Set(results.map((log) => log.user_id))];

    if (userIds.length === 0) {
      return NextResponse.json({
        logs: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (serviceClient as any)
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const typedProfiles = (profiles || []) as Profile[];
    const profileMap = new Map(
      typedProfiles.map((p) => [
        p.id,
        { email: p.email, name: p.full_name }
      ])
    );

    const logsWithUser = results.map((log) => ({
      ...log,
      user_email: profileMap.get(log.user_id)?.email,
      user_name: profileMap.get(log.user_id)?.name,
    }));

    return NextResponse.json({
      logs: logsWithUser,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
