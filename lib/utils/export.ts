/**
 * lib/utils/export.ts
 *
 * データエクスポートユーティリティ
 */

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
