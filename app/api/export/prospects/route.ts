/**
 * app/api/export/prospects/route.ts
 *
 * GET /api/export/prospects - リードデータエクスポート
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prospects, error } = await (serviceClient as any)
      .from('prospects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export prospects error:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: prospects || [] });
  } catch (error) {
    console.error('Export prospects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
