'use client';

/**
 * components/mvv/UnifiedView.tsx
 *
 * Brand + Lean Canvas + MVV 統合ビュー
 */

import Link from 'next/link';
import { Edit } from 'lucide-react';
import type { Brand } from '@/lib/types/brand';
import type { LeanCanvas, LeanCanvasBlock } from '@/lib/types/lean-canvas';
import type { MVV } from '@/lib/types/mvv';
import { Collapsible } from './Collapsible';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface UnifiedViewProps {
  brand: Brand;
  leanCanvas: (LeanCanvas & { blocks: LeanCanvasBlock[] }) | null;
  mvv: MVV | null;
}

export function UnifiedView({ brand, leanCanvas, mvv }: UnifiedViewProps) {
  return (
    <div className="unified-view">
      {/* ブランド概要 */}
      <Collapsible title="ブランド概要" subtitle={brand.name} defaultOpen>
        <div className="unified-brand">
          <div className="brand-header">
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.name} className="brand-logo" />
            )}
            <div className="brand-info">
              <h3>{brand.name}</h3>
              {brand.tagline && <p className="tagline">{brand.tagline}</p>}
            </div>
            <Link href="/brand" className="edit-link">
              <Edit size={14} />
            </Link>
          </div>
          {brand.story && <p className="brand-story">{brand.story}</p>}
        </div>
      </Collapsible>

      {/* MVV */}
      <Collapsible title="MVV" subtitle="Mission / Vision / Values" defaultOpen>
        <div className="unified-mvv">
          {mvv ? (
            <div className="mvv-summary">
              <div className="mvv-summary-item">
                <span className="label">Mission</span>
                <p>{mvv.mission || '未設定'}</p>
              </div>
              <div className="mvv-summary-item">
                <span className="label">Vision</span>
                <p>{mvv.vision || '未設定'}</p>
              </div>
              <div className="mvv-summary-item">
                <span className="label">Values</span>
                {mvv.values.length > 0 ? (
                  <ul className="unified-values-list">
                    {mvv.values.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                ) : (
                  <p>未設定</p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-message">MVV が未設定です</p>
          )}
        </div>
      </Collapsible>

      {/* Lean Canvas サマリー */}
      <Collapsible title="Lean Canvas" subtitle={leanCanvas?.title}>
        {leanCanvas ? (
          <div className="unified-canvas">
            <div className="canvas-summary-grid">
              {['problem', 'customer-segments', 'unique-value', 'solution'].map(blockType => {
                const block = leanCanvas.blocks.find(b => b.block_type === blockType);
                const content = block?.content as { items?: string[] } | undefined;
                const info = LEAN_CANVAS_BLOCK_INFO[blockType as keyof typeof LEAN_CANVAS_BLOCK_INFO];

                return (
                  <div key={blockType} className="canvas-summary-item">
                    <span className="label">{info?.label}</span>
                    {content?.items && content.items.length > 0 ? (
                      <ul>
                        {content.items.slice(0, 2).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                        {content.items.length > 2 && (
                          <li className="more">+{content.items.length - 2}件</li>
                        )}
                      </ul>
                    ) : (
                      <p className="empty">未入力</p>
                    )}
                  </div>
                );
              })}
            </div>
            <Link href={`/lean-canvas/${leanCanvas.id}`} className="view-full-link">
              全体を見る
            </Link>
          </div>
        ) : (
          <div className="empty-message">
            <p>Lean Canvas がありません</p>
            <Link href="/lean-canvas" className="btn btn-outline">
              作成する
            </Link>
          </div>
        )}
      </Collapsible>
    </div>
  );
}
