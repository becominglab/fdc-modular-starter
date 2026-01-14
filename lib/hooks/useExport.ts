/**
 * lib/hooks/useExport.ts
 *
 * データエクスポートフック
 */

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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exporting,
    error,
    clearError,
    exportTasks: () => exportData('tasks'),
    exportProspects: () => exportData('prospects'),
    exportClients: () => exportData('clients'),
  };
}
