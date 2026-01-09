'use client';

/**
 * app/(app)/matrix/page.tsx
 *
 * アイゼンハワーマトリクスページ
 */

import { Grid2X2 } from 'lucide-react';
import { EisenhowerMatrix } from '@/components/matrix/EisenhowerMatrix';

export default function MatrixPage() {
  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Grid2X2 size={28} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            マトリクス
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            アイゼンハワーマトリクスでタスクを管理
          </p>
        </div>
      </div>

      {/* 説明 */}
      <div style={{
        background: 'var(--bg-gray)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        タスクをドラッグして象限間を移動できます。カレンダーの予定は「ダッシュボード」から分類してください。
      </div>

      {/* マトリクス */}
      <EisenhowerMatrix />
    </div>
  );
}
