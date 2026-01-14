/**
 * components/export/ExportButton.tsx
 *
 * CSVエクスポートボタンコンポーネント
 */

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
