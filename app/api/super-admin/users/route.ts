/**
 * app/api/super-admin/users/route.ts
 *
 * GET /api/super-admin/users - 全ユーザー一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/supabase/check-super-admin';
import type { ManagedUser } from '@/lib/types/super-admin';

interface ProfileRow {
  id: string;
  email?: string;
  full_name?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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

    // プロフィール取得
    let query = serviceClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      console.error('Profiles fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // 各ユーザーのワークスペース数を取得
    const users: ManagedUser[] = await Promise.all(
      ((profiles || []) as ProfileRow[]).map(async (profile) => {
        const { count: workspaceCount } = await serviceClient
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        return {
          id: profile.id,
          email: profile.email || '',
          fullName: profile.full_name ?? null,
          isSuperAdmin: profile.is_super_admin || false,
          isActive: profile.is_active !== false,
          createdAt: profile.created_at || '',
          lastSignIn: profile.updated_at ?? null,
          workspaceCount: workspaceCount || 0,
        };
      })
    );

    return NextResponse.json({ users, total: users.length });
  } catch (error) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
