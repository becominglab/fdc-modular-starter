/**
 * app/api/super-admin/security-events/route.ts
 *
 * GET /api/super-admin/security-events - セキュリティイベント一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';

interface SecurityEventRow {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { isSuperAdmin, error } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceClient = createServiceClient() as any;

    let query = serviceClient
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: events, error: fetchError } = await query;

    if (fetchError) {
      console.error('Security events fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // ユーザー情報を付加
    const enrichedEvents = await Promise.all(
      ((events || []) as SecurityEventRow[]).map(async (event) => {
        if (event.user_id) {
          const { data: profile } = await serviceClient
            .from('profiles')
            .select('email')
            .eq('id', event.user_id)
            .single();
          return { ...event, userEmail: profile?.email };
        }
        return event;
      })
    );

    return NextResponse.json({ events: enrichedEvents });
  } catch (error) {
    console.error('Super admin security events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
