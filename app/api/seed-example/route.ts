import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: 例データ作成
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 1. ActionMap作成
    const { data: actionMap, error: mapError } = await supabase
      .from('action_maps')
      .insert({
        user_id: user.id,
        title: '新規顧客獲得キャンペーン',
        description: '売上20%増加を達成するための施策',
      })
      .select()
      .single();

    if (mapError) {
      console.error('ActionMap creation error:', mapError);
      return NextResponse.json({ error: 'ActionMap作成失敗' }, { status: 500 });
    }

    // 2. ActionItems作成
    const itemsData = [
      { title: 'LP制作', sort_order: 1, priority: 'high' },
      { title: '広告運用', sort_order: 2, priority: 'high' },
      { title: 'メール配信', sort_order: 3, priority: 'medium' },
    ];

    const { data: actionItems, error: itemsError } = await supabase
      .from('action_items')
      .insert(
        itemsData.map(item => ({
          ...item,
          user_id: user.id,
          action_map_id: actionMap.id,
        }))
      )
      .select()
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('ActionItems creation error:', itemsError);
      return NextResponse.json({ error: 'ActionItems作成失敗' }, { status: 500 });
    }

    // 3. Tasks作成
    const tasksData = [
      // LP制作のタスク（3/3 done = 100%）
      { title: 'デザイン作成', status: 'done', suit: 'spade', action_item_id: actionItems[0].id },
      { title: 'コーディング', status: 'done', suit: 'spade', action_item_id: actionItems[0].id },
      { title: 'テスト', status: 'done', suit: 'spade', action_item_id: actionItems[0].id },
      // 広告運用のタスク（1/2 done = 50%）
      { title: '広告文作成', status: 'done', suit: 'diamond', action_item_id: actionItems[1].id },
      { title: '入稿作業', status: 'not_started', suit: 'diamond', action_item_id: actionItems[1].id },
      // メール配信はタスクなし（0%）
    ];

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(
        tasksData.map(task => ({
          ...task,
          user_id: user.id,
        }))
      );

    if (tasksError) {
      console.error('Tasks creation error:', tasksError);
      return NextResponse.json({ error: 'Tasks作成失敗' }, { status: 500 });
    }

    return NextResponse.json({
      message: '例データ作成完了',
      actionMap: actionMap.title,
      actionItems: actionItems.map(i => i.title),
      tasksCount: tasksData.length,
    });
  } catch (error) {
    console.error('Seed example error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
