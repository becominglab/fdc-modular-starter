/**
 * app/api/import/clients/route.ts
 *
 * POST /api/import/clients - クライアントCSVインポート
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
    const clearExisting = formData.get('clearExisting') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    const content = await file.text();
    const result = parseAndValidate(content, 'clients');

    // プレビューモード
    if (mode === 'preview') {
      return NextResponse.json({
        preview: true,
        headers: result.headers,
        rows: result.rows.slice(0, 10),
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
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Clients delete error:', deleteError);
        return NextResponse.json({
          success: false,
          message: '既存データの削除に失敗しました',
          error: deleteError.message,
        }, { status: 500 });
      }
    }

    // データを挿入
    const clientsToInsert = result.rows.map((row) => ({
      user_id: user.id,
      name: row.name as string,
      company: (row.company as string) || '',
      email: row.email || null,
      phone: row.phone || null,
      contract_date: row.contract_date || new Date().toISOString().split('T')[0],
      notes: row.notes || null,
    }));

    const { data: inserted, error } = await supabase
      .from('clients')
      .insert(clientsToInsert)
      .select();

    if (error) {
      console.error('Clients import error:', error);
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
      resourceType: 'client',
      details: { action: 'import', count: inserted?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      message: `${inserted?.length || 0}件のクライアントをインポートしました`,
      imported: inserted?.length || 0,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Clients import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
