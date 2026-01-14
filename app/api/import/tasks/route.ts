/**
 * app/api/import/tasks/route.ts
 *
 * POST /api/import/tasks - タスクCSVインポート
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseAndValidate } from '@/lib/utils/import';
import { logActivityForUser } from '@/lib/utils/audit-log';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = formData.get('mode') as string || 'preview';
    const clearExistingValue = formData.get('clearExisting');
    const clearExisting = clearExistingValue === 'true';

    console.log('Import tasks - mode:', mode, 'clearExisting:', clearExistingValue, '->', clearExisting);

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    const content = await file.text();
    const result = parseAndValidate(content, 'tasks');

    // プレビューモード
    if (mode === 'preview') {
      return NextResponse.json({
        preview: true,
        headers: result.headers,
        rows: result.rows.slice(0, 10), // 最初の10件のみ
        errors: result.errors,
        totalRows: result.totalRows,
        validRows: result.validRows,
      });
    }

    // インポートモード
    if (result.validRows === 0) {
      return NextResponse.json({
        success: false,
        message: '有効なデータがありません',
        errors: result.errors,
        imported: 0,
      });
    }

    // 既存データをクリア
    if (clearExisting) {
      // まず既存の件数を確認
      const { count: beforeCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 削除実行
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Tasks delete error:', deleteError);
        return NextResponse.json({
          success: false,
          message: '既存データの削除に失敗しました',
          error: deleteError.message,
        }, { status: 500 });
      }

      // 削除後の件数を確認
      const { count: afterCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      console.log(`Tasks cleared: ${beforeCount} -> ${afterCount}`);
    }

    // データを挿入
    const tasksToInsert = result.rows.map((row) => ({
      user_id: user.id,
      title: row.title,
      description: row.description || null,
      status: row.status || 'not_started',
      suit: row.suit || null,
      scheduled_date: row.scheduled_date || null,
    }));

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (error) {
      console.error('Tasks import error:', error);
      return NextResponse.json({
        success: false,
        message: 'インポートに失敗しました',
        error: error.message,
      }, { status: 500 });
    }

    // アクティビティログ
    await logActivityForUser({
      userId: user.id,
      action: 'create',
      resourceType: 'task',
      details: { action: 'import', count: inserted?.length || 0 },
    });

    const message = clearExisting
      ? `既存データをクリアして${inserted?.length || 0}件のタスクをインポートしました`
      : `${inserted?.length || 0}件のタスクをインポートしました`;

    return NextResponse.json({
      success: true,
      message,
      imported: inserted?.length || 0,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Tasks import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
