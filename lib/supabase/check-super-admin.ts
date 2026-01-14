/**
 * lib/supabase/check-super-admin.ts
 *
 * Super Admin 権限チェック
 */

import { createClient, createServiceClient } from './server';

interface ProfileRow {
  id: string;
  is_super_admin?: boolean;
}

export async function checkSuperAdmin(): Promise<{
  isSuperAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isSuperAdmin: false, userId: null, error: 'Unauthorized' };
    }

    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (serviceClient as any)
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single() as { data: ProfileRow | null };

    if (!profile?.is_super_admin) {
      return { isSuperAdmin: false, userId: user.id, error: 'Forbidden: Super Admin only' };
    }

    return { isSuperAdmin: true, userId: user.id, error: null };
  } catch {
    return { isSuperAdmin: false, userId: null, error: 'Internal error' };
  }
}
