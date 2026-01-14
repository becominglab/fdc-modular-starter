import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logActivityForUser } from '@/lib/utils/audit-log';

type Params = Promise<{ taskId: string }>;

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).optional(),
  suit: z.enum(['spade', 'heart', 'diamond', 'club']).nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
});

// GET: タスク取得
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'タスクが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// PATCH: タスク更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    const action = result.data.status ? 'status_change' : 'update';
    await logActivityForUser({
      userId: user.id,
      action,
      resourceType: 'task',
      resourceId: taskId,
      details: { title: data.title, changes: result.data },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Task PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// DELETE: タスク削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 削除前にタスク情報を取得（ログ用）
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'タスクの削除に失敗しました' }, { status: 500 });
    }

    // アクティビティログ記録
    await logActivityForUser({
      userId: user.id,
      action: 'delete',
      resourceType: 'task',
      resourceId: taskId,
      details: { title: task?.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
