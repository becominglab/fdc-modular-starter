/**
 * app/api/tasks/by-suit/route.ts
 *
 * GET /api/tasks/by-suit - 象限別にタスクを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // タスク取得
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeCompleted) {
      query = query.neq('status', 'done');
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Tasks fetch error:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // 象限別に分類
    const grouped = {
      spade: tasks?.filter(t => t.suit === 'spade') || [],
      heart: tasks?.filter(t => t.suit === 'heart') || [],
      diamond: tasks?.filter(t => t.suit === 'diamond') || [],
      club: tasks?.filter(t => t.suit === 'club') || [],
      unassigned: tasks?.filter(t => !t.suit) || [],
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Get tasks by suit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
