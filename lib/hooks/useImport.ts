/**
 * lib/hooks/useImport.ts
 *
 * CSV インポートフック
 */

'use client';

import { useState, useCallback } from 'react';
import type { ParsedRow, ValidationError } from '@/lib/utils/import';

export type ImportType = 'tasks' | 'prospects' | 'clients';

export interface PreviewData {
  headers: string[];
  rows: ParsedRow[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: ValidationError[];
}

export function useImport() {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentType, setCurrentType] = useState<ImportType | null>(null);

  const uploadForPreview = useCallback(async (file: File, type: ImportType) => {
    setImporting(true);
    setError(null);
    setResult(null);
    setCurrentFile(file);
    setCurrentType(type);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'preview');

      const res = await fetch(`/api/import/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'プレビューに失敗しました');
      }

      const data = await res.json();
      setPreview({
        headers: data.headers,
        rows: data.rows,
        errors: data.errors,
        totalRows: data.totalRows,
        validRows: data.validRows,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPreview(null);
    } finally {
      setImporting(false);
    }
  }, []);

  const confirmImport = useCallback(async (clearExisting: boolean = false) => {
    if (!currentFile || !currentType) {
      setError('ファイルが選択されていません');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('mode', 'import');
      if (clearExisting) {
        formData.append('clearExisting', 'true');
      }

      const res = await fetch(`/api/import/${currentType}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'インポートに失敗しました');
      }

      setResult({
        success: data.success,
        message: data.message,
        imported: data.imported,
        errors: data.errors || [],
      });
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setImporting(false);
    }
  }, [currentFile, currentType]);

  const reset = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError(null);
    setCurrentFile(null);
    setCurrentType(null);
  }, []);

  return {
    importing,
    preview,
    result,
    error,
    uploadForPreview,
    confirmImport,
    reset,
  };
}
