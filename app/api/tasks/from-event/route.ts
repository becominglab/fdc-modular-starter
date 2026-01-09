/**
 * app/api/tasks/from-event/route.ts
 *
 * POST /api/tasks/from-event - カレンダーイベントからタスク作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createFromEventSchema = z.object({
  eventId: z.string().min(1),
  eventSummary: z.string().min(1),
  eventDescription: z.string().optional(),
  eventStart: z.string().optional(),
  suit: z.enum(['spade', 'heart', 'diamond', 'club']),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = createFromEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { eventId, eventSummary, eventDescription, eventStart, suit } = result.data;

    // 既に同じイベントからタスクが作成されていないか確認
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('google_event_id', eventId)
      .single();

    if (existingTask) {
      return NextResponse.json(
        { error: 'Task already exists for this event', taskId: existingTask.id },
        { status: 409 }
      );
    }

    // タスク作成
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        title: eventSummary,
        description: eventDescription || null,
        status: 'not_started',
        suit,
        scheduled_date: eventStart ? eventStart.split('T')[0] : null,
        google_event_id: eventId,
        user_id: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Task creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task from event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
