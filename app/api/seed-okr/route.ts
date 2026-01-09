import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: OKR 例データ作成
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 1. Objective 作成
    const { data: objective, error: objError } = await supabase
      .from('objectives')
      .insert({
        user_id: user.id,
        title: '売上を2倍にする',
        description: '今期の最重要目標 - FDC 3層アーキテクチャで管理',
        period: 'Q1 2026',
      })
      .select()
      .single();

    if (objError) {
      console.error('Objective creation error:', objError);
      return NextResponse.json({ error: 'Objective作成失敗' }, { status: 500 });
    }

    // 2. Key Results 作成
    const keyResultsData = [
      { title: 'MRR 100万円達成', target_value: 100, current_value: 50, unit: '万円', sort_order: 1 },
      { title: '新規顧客 50社獲得', target_value: 50, current_value: 20, unit: '社', sort_order: 2 },
      { title: 'チャーンレート 5%以下', target_value: 5, current_value: 3, unit: '%', sort_order: 3 },
    ];

    const { data: keyResults, error: krError } = await supabase
      .from('key_results')
      .insert(
        keyResultsData.map(kr => ({
          ...kr,
          objective_id: objective.id,
          user_id: user.id,
        }))
      )
      .select()
      .order('sort_order', { ascending: true });

    if (krError) {
      console.error('Key Results creation error:', krError);
      return NextResponse.json({ error: 'Key Results作成失敗' }, { status: 500 });
    }

    // 3. ActionMap を作成して Key Result に紐付け
    const { data: actionMap, error: mapError } = await supabase
      .from('action_maps')
      .insert({
        user_id: user.id,
        title: '新規顧客獲得キャンペーン',
        description: 'MRR達成のための施策',
        key_result_id: keyResults[0].id, // MRR 100万円達成に紐付け
      })
      .select()
      .single();

    if (mapError) {
      console.error('ActionMap creation error:', mapError);
      return NextResponse.json({ error: 'ActionMap作成失敗' }, { status: 500 });
    }

    // 4. ActionItems 作成
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

    // 5. Tasks 作成
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
      message: 'OKR 例データ作成完了',
      objective: objective.title,
      keyResults: keyResults.map(kr => `${kr.title} (${kr.current_value}/${kr.target_value}${kr.unit})`),
      actionMap: actionMap.title,
      actionItems: actionItems.map(i => i.title),
      tasksCount: tasksData.length,
    });
  } catch (error) {
    console.error('Seed OKR error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
