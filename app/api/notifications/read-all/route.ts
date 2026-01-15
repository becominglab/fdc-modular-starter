/**
 * app/api/notifications/read-all/route.ts
 *
 * PATCH /api/notifications/read-all - 全通知を既読にする
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications read-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
