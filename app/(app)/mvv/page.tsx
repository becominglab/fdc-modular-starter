'use client';

/**
 * app/(app)/mvv/page.tsx
 *
 * MVV 統合ビューページ
 */

import { useState, useEffect } from 'react';
import { Target, Loader2, ChevronDown } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useMVV } from '@/lib/hooks/useMVV';
import { MVVSection, UnifiedView } from '@/components/mvv';
import type { LeanCanvas, LeanCanvasBlock } from '@/lib/types/lean-canvas';

export default function MVVPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [leanCanvas, setLeanCanvas] = useState<(LeanCanvas & { blocks: LeanCanvasBlock[] }) | null>(null);
  const [leanCanvasLoading, setLeanCanvasLoading] = useState(false);

  // ブランドが読み込まれたら最初のブランドを選択
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const selectedBrand = brands.find(b => b.id === selectedBrandId) || null;
  const { mvv, loading, saving, saveMVV, addValue, removeValue, updateValue } = useMVV(selectedBrandId);

  // Lean Canvas 取得
  useEffect(() => {
    if (!selectedBrandId) {
      setLeanCanvas(null);
      return;
    }

    const fetchLeanCanvas = async () => {
      setLeanCanvasLoading(true);
      try {
        const res = await fetch(`/api/lean-canvas?brandId=${selectedBrandId}`);
        if (res.ok) {
          const canvases = await res.json();
          if (canvases.length > 0) {
            // 最新のキャンバスを取得
            const latestCanvas = canvases[0];
            const blocksRes = await fetch(`/api/lean-canvas/${latestCanvas.id}`);
            if (blocksRes.ok) {
              const canvasWithBlocks = await blocksRes.json();
              setLeanCanvas(canvasWithBlocks);
            }
          } else {
            setLeanCanvas(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Lean Canvas:', error);
      } finally {
        setLeanCanvasLoading(false);
      }
    };

    fetchLeanCanvas();
  }, [selectedBrandId]);

  if (brandsLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="mvv-page">
        <header className="page-header">
          <div className="header-content">
            <Target size={24} />
            <h1>MVV</h1>
          </div>
        </header>
        <div className="empty-state">
          <Target size={48} />
          <h2>ブランドがありません</h2>
          <p>まず「ブランド」タブでブランドを作成してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mvv-page">
      <header className="page-header">
        <div className="header-content">
          <Target size={24} />
          <h1>MVV</h1>
          <span className="header-subtitle">Mission / Vision / Values</span>
        </div>
        <div className="header-actions-group">
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value || null)}
              className="brand-select"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>
      </header>

      {loading || leanCanvasLoading ? (
        <div className="page-loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="mvv-layout">
          {/* MVV 編集 */}
          <section className="mvv-edit-section">
            <MVVSection
              mvv={mvv}
              saving={saving}
              onSave={saveMVV}
              onAddValue={addValue}
              onRemoveValue={removeValue}
              onUpdateValue={updateValue}
            />
          </section>

          {/* 統合ビュー */}
          {selectedBrand && (
            <section className="mvv-unified-section">
              <h2>統合ビュー</h2>
              <UnifiedView
                brand={selectedBrand}
                leanCanvas={leanCanvas}
                mvv={mvv}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
