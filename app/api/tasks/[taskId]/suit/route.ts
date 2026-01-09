/**
 * app/api/tasks/[taskId]/suit/route.ts
 *
 * PATCH /api/tasks/:taskId/suit - タスクの象限を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSuitSchema = z.object({
  suit: z.enum(['spade', 'heart', 'diamond', 'club']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = updateSuitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid suit value', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { suit } = result.data;

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({
        suit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Task suit update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task suit' },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task suit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
