/**
 * components/lean-canvas/CanvasGrid.tsx
 *
 * Lean Canvas 9ブロックグリッドレイアウト
 */

'use client';

import { BlockEditor } from './BlockEditor';
import type { LeanCanvasBlockType } from '@/lib/types/lean-canvas';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface CanvasGridProps {
  getBlockContent: (blockType: LeanCanvasBlockType) => string[];
  onUpdateBlock: (blockType: LeanCanvasBlockType, content: string[]) => Promise<boolean>;
  savingBlock: LeanCanvasBlockType | null;
}

// グリッドレイアウト順序（Lean Canvas 標準配置）
const GRID_LAYOUT: LeanCanvasBlockType[][] = [
  // Row 1: Problem, Solution, Unique Value, Unfair Advantage, Customer Segments
  ['problem', 'solution', 'unique_value', 'unfair_advantage', 'customer_segments'],
  // Row 2: (Problem続き), Key Metrics, (Unique Value続き), Channels, (Customer Segments続き)
];

// 各ブロックのグリッド配置
const BLOCK_GRID_AREAS: Record<LeanCanvasBlockType, string> = {
  problem: 'problem',
  solution: 'solution',
  unique_value: 'unique-value',
  unfair_advantage: 'unfair-advantage',
  customer_segments: 'customer-segments',
  key_metrics: 'key-metrics',
  channels: 'channels',
  cost_structure: 'cost-structure',
  revenue_streams: 'revenue-streams',
};

// 全ブロックタイプ
const ALL_BLOCK_TYPES: LeanCanvasBlockType[] = [
  'problem',
  'solution',
  'unique_value',
  'unfair_advantage',
  'customer_segments',
  'key_metrics',
  'channels',
  'cost_structure',
  'revenue_streams',
];

export function CanvasGrid({
  getBlockContent,
  onUpdateBlock,
  savingBlock,
}: CanvasGridProps) {
  return (
    <div className="lean-canvas-grid">
      {ALL_BLOCK_TYPES.map((blockType) => (
        <div
          key={blockType}
          className="grid-cell"
          style={{ gridArea: BLOCK_GRID_AREAS[blockType] }}
        >
          <BlockEditor
            blockType={blockType}
            content={getBlockContent(blockType)}
            onUpdate={(content) => onUpdateBlock(blockType, content)}
            saving={savingBlock === blockType}
            compact={false}
          />
        </div>
      ))}
    </div>
  );
}

// コンパクト版（一覧表示用）
export function CanvasGridCompact({
  getBlockContent,
}: {
  getBlockContent: (blockType: LeanCanvasBlockType) => string[];
}) {
  return (
    <div className="lean-canvas-grid-compact">
      {ALL_BLOCK_TYPES.map((blockType) => {
        const info = LEAN_CANVAS_BLOCK_INFO[blockType];
        const content = getBlockContent(blockType);
        return (
          <div
            key={blockType}
            className="grid-cell-compact"
            style={{
              gridArea: BLOCK_GRID_AREAS[blockType],
              '--block-color': info.color,
            } as React.CSSProperties}
          >
            <div className="cell-header">
              <span className="cell-label">{info.label}</span>
              <span className="cell-count">{content.length}</span>
            </div>
            {content.length > 0 && (
              <ul className="cell-items">
                {content.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {content.length > 3 && (
                  <li className="cell-more">+{content.length - 3} more</li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
