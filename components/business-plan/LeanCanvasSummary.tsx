'use client';

/**
 * components/business-plan/LeanCanvasSummary.tsx
 *
 * Lean Canvas 概要表示
 */

import Link from 'next/link';
import { LayoutGrid, Edit, CheckCircle, Circle } from 'lucide-react';
import type { LeanCanvas, LeanCanvasBlock } from '@/lib/types/lean-canvas';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface LeanCanvasSummaryProps {
  canvas: LeanCanvas & { blocks: LeanCanvasBlock[] };
}

export function LeanCanvasSummary({ canvas }: LeanCanvasSummaryProps) {
  const blockTypes = [
    'problem',
    'customer-segments',
    'unique-value',
    'solution',
    'channels',
    'revenue-streams',
    'cost-structure',
    'key-metrics',
    'unfair-advantage',
  ];

  return (
    <div className="lean-canvas-summary">
      <div className="summary-header">
        <LayoutGrid size={20} />
        <h3>Lean Canvas</h3>
        <Link href={`/lean-canvas/${canvas.id}`} className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="canvas-blocks-grid">
        {blockTypes.map(blockType => {
          const block = canvas.blocks.find(b => b.block_type === blockType);
          const content = block?.content as { items?: string[] } | undefined;
          const hasContent = !!content?.items && content.items.length > 0;
          const info = LEAN_CANVAS_BLOCK_INFO[blockType as keyof typeof LEAN_CANVAS_BLOCK_INFO];

          return (
            <div
              key={blockType}
              className={`canvas-block-item ${hasContent ? 'completed' : ''}`}
            >
              {hasContent ? (
                <CheckCircle size={14} className="block-icon completed" />
              ) : (
                <Circle size={14} className="block-icon" />
              )}
              <span className="block-label">{info?.label || blockType}</span>
              {hasContent && (
                <span className="block-count">{content.items?.length}件</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
