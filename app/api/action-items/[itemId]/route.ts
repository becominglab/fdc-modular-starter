import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'done']).optional(),
  sort_order: z.number().optional(),
});

type RouteParams = { params: Promise<{ itemId: string }> };

// GET: ActionItem 詳細（紐付くTask一覧付き）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: item, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('action_item_id', itemId)
      .order('created_at', { ascending: false });

    const totalTasks = tasks?.length || 0;
    const doneTasks = tasks?.filter((t) => t.status === 'done').length || 0;
    const progressRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      ...item,
      progress_rate: progressRate,
      linked_task_count: totalTasks,
      completed_task_count: doneTasks,
      tasks: tasks || [],
    });
  } catch (error) {
    console.error('ActionItem GET error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PATCH: ActionItem 更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '入力データが不正です', issues: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('action_items')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('ActionItem update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('ActionItem PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: ActionItem 削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 紐付くタスクの action_item_id を解除
    await supabase
      .from('tasks')
      .update({ action_item_id: null })
      .eq('action_item_id', itemId);

    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) {
      console.error('ActionItem delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ActionItem DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
