import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskLists } from '@/lib/server/google-tasks';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskLists = await getTaskLists(user.id);
    return NextResponse.json(taskLists);
  } catch (error) {
    console.error('Task lists API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Tasks not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch task lists' },
      { status: 500 }
    );
  }
}
