# Phase 23: データエクスポート（CSV出力）

## 概要

各種データをCSV形式でエクスポートする機能を実装。
タスク、リード、クライアント、OKRなどのデータをダウンロード可能に。

## 機能

- タスク一覧のCSVエクスポート
- リード一覧のCSVエクスポート
- クライアント一覧のCSVエクスポート
- OKR（目標・成果指標）のCSVエクスポート
- 汎用エクスポートユーティリティ

## 実装ステップ

### Step 1: エクスポートユーティリティ作成

```typescript
// lib/utils/export.ts

/**
 * データをCSV形式に変換
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return '';

  // ヘッダー行
  const header = columns.map(col => `"${col.label}"`).join(',');

  // データ行
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'string') {
        // ダブルクォートをエスケープ
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      return `"${String(value)}"`;
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * CSVファイルをダウンロード
 */
export function downloadCSV(csv: string, filename: string): void {
  // BOM付きUTF-8でExcelでの文字化けを防止
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 日付をフォーマット
 */
export function formatDateForExport(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
```

### Step 2: エクスポート API 作成

```typescript
// app/api/export/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tasks, error } = await (serviceClient as any)
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export tasks error:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ data: tasks || [] });
  } catch (error) {
    console.error('Export tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

```typescript
// app/api/export/prospects/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prospects, error } = await (serviceClient as any)
      .from('prospects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export prospects error:', error);
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 });
    }

    return NextResponse.json({ data: prospects || [] });
  } catch (error) {
    console.error('Export prospects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

```typescript
// app/api/export/clients/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clients, error } = await (serviceClient as any)
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export clients error:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({ data: clients || [] });
  } catch (error) {
    console.error('Export clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3: エクスポートフック作成

```typescript
// lib/hooks/useExport.ts

'use client';

import { useState, useCallback } from 'react';
import { convertToCSV, downloadCSV, formatDateForExport } from '@/lib/utils/export';

type ExportType = 'tasks' | 'prospects' | 'clients';

interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

// タスクのカラム定義
const taskColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'title', label: 'タイトル' },
  { key: 'description', label: '説明' },
  { key: 'status', label: 'ステータス' },
  { key: 'priority', label: '優先度' },
  { key: 'due_date', label: '期限' },
  { key: 'created_at', label: '作成日' },
];

// リードのカラム定義
const prospectColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'company_name', label: '会社名' },
  { key: 'contact_name', label: '担当者名' },
  { key: 'email', label: 'メールアドレス' },
  { key: 'phone', label: '電話番号' },
  { key: 'status', label: 'ステータス' },
  { key: 'source', label: '流入元' },
  { key: 'created_at', label: '作成日' },
];

// クライアントのカラム定義
const clientColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: 'company_name', label: '会社名' },
  { key: 'contact_name', label: '担当者名' },
  { key: 'email', label: 'メールアドレス' },
  { key: 'phone', label: '電話番号' },
  { key: 'contract_value', label: '契約金額' },
  { key: 'contract_start', label: '契約開始日' },
  { key: 'created_at', label: '作成日' },
];

const columnsMap: Record<ExportType, ExportColumn<Record<string, unknown>>[]> = {
  tasks: taskColumns,
  prospects: prospectColumns,
  clients: clientColumns,
};

const fileNameMap: Record<ExportType, string> = {
  tasks: 'タスク一覧',
  prospects: 'リード一覧',
  clients: 'クライアント一覧',
};

export function useExport(workspaceId: string | null) {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async (type: ExportType) => {
    if (!workspaceId) {
      setError('ワークスペースが選択されていません');
      return;
    }

    setExporting(type);
    setError(null);

    try {
      const res = await fetch(`/api/export/${type}?workspace_id=${workspaceId}`);

      if (!res.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const { data } = await res.json();

      if (!data || data.length === 0) {
        setError('エクスポートするデータがありません');
        return;
      }

      // 日付フィールドをフォーマット
      const formattedData = data.map((item: Record<string, unknown>) => ({
        ...item,
        created_at: formatDateForExport(item.created_at as string | null),
        due_date: item.due_date ? formatDateForExport(item.due_date as string | null) : '',
        contract_start: item.contract_start ? formatDateForExport(item.contract_start as string | null) : '',
      }));

      const csv = convertToCSV(formattedData, columnsMap[type]);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `${fileNameMap[type]}_${timestamp}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(null);
    }
  }, [workspaceId]);

  return {
    exporting,
    error,
    exportTasks: () => exportData('tasks'),
    exportProspects: () => exportData('prospects'),
    exportClients: () => exportData('clients'),
  };
}
```

### Step 4: エクスポートボタンコンポーネント作成

```typescript
// components/export/ExportButton.tsx

'use client';

import { Download, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
  loading: boolean;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({
  onClick,
  loading,
  label = 'CSVエクスポート',
  disabled = false,
}: ExportButtonProps) {
  return (
    <button
      className="btn btn-secondary btn-small"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}
      {label}
    </button>
  );
}
```

### Step 5: 各ページにエクスポートボタンを追加

タスクページの例:

```typescript
// app/(app)/tasks/page.tsx に追加

import { ExportButton } from '@/components/export/ExportButton';
import { useExport } from '@/lib/hooks/useExport';

// コンポーネント内で
const { exporting, exportTasks } = useExport(workspaceId);

// ヘッダー部分に追加
<ExportButton
  onClick={exportTasks}
  loading={exporting === 'tasks'}
  label="CSVエクスポート"
/>
```

### Step 6: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### Step 7: 動作確認

1. タスクページでCSVエクスポートボタンをクリック
2. CSVファイルがダウンロードされる
3. Excelで開いて文字化けしないことを確認

### Step 8: Git プッシュ

```bash
git add -A
git commit -m "Phase 23: データエクスポート（CSV出力）を実装"
git push origin main
```

## チェックリスト

- [ ] Step 1: エクスポートユーティリティ作成
- [ ] Step 2: エクスポート API 作成
- [ ] Step 3: エクスポートフック作成
- [ ] Step 4: エクスポートボタンコンポーネント作成
- [ ] Step 5: 各ページにエクスポートボタンを追加
- [ ] Step 6: 型チェック & ビルド
- [ ] Step 7: 動作確認
- [ ] Step 8: Git プッシュ

## 補足

- CSVはBOM付きUTF-8で出力（Excel文字化け対策）
- 日付は `YYYY/MM/DD` 形式でフォーマット
- 空データの場合はエラーメッセージを表示
