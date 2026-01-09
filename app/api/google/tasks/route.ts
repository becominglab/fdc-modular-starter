import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPendingTasks, getTasks } from '@/lib/server/google-tasks';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const listId = searchParams.get('listId');
    const showCompleted = searchParams.get('showCompleted') === 'true';

    let tasks;

    if (listId) {
      tasks = await getTasks(user.id, listId, { showCompleted });
    } else {
      tasks = await getPendingTasks(user.id);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Google Tasks API error:', error);

    if (error instanceof Error && error.message.includes('token not available')) {
      return NextResponse.json(
        { error: 'Google Tasks not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
