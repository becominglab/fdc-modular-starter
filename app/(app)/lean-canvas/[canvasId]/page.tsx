/**
 * app/(app)/lean-canvas/[canvasId]/page.tsx
 *
 * Lean Canvas 詳細・編集ページ
 */

'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, LayoutGrid, Route } from 'lucide-react';
import { useLeanCanvas } from '@/lib/hooks/useLeanCanvas';
import { CanvasGrid, CustomerJourney } from '@/components/lean-canvas';
import type { LeanCanvasBlockType } from '@/lib/types/lean-canvas';

interface PageProps {
  params: Promise<{ canvasId: string }>;
}

export default function LeanCanvasDetailPage({ params }: PageProps) {
  const { canvasId } = use(params);
  const router = useRouter();
  const {
    canvas,
    loading,
    error,
    savingBlock,
    updateCanvas,
    updateBlock,
    getBlockContent,
  } = useLeanCanvas(canvasId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'journey'>('grid');

  const handleTitleEdit = () => {
    if (canvas) {
      setTitleValue(canvas.title);
      setEditingTitle(true);
    }
  };

  const handleTitleSave = async () => {
    if (!titleValue.trim()) return;
    setSavingTitle(true);
    await updateCanvas({ title: titleValue.trim() });
    setSavingTitle(false);
    setEditingTitle(false);
  };

  const handleBlockUpdate = async (
    blockType: LeanCanvasBlockType,
    content: string[]
  ): Promise<boolean> => {
    return updateBlock(blockType, { content });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="page-error">
        <p>エラー: {error || 'キャンバスが見つかりません'}</p>
        <button onClick={() => router.back()} className="btn btn-secondary">
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="lean-canvas-detail-page">
      <header className="page-header">
        <button onClick={() => router.back()} className="btn-back">
          <ArrowLeft size={20} />
        </button>

        <div className="header-title">
          {editingTitle ? (
            <div className="title-edit">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="title-input"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                disabled={savingTitle}
                className="btn btn-primary btn-sm"
              >
                {savingTitle ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              </button>
            </div>
          ) : (
            <h1 onClick={handleTitleEdit} className="editable-title">
              {canvas.title}
            </h1>
          )}
        </div>

        <div className="view-toggle">
          <button
            onClick={() => setViewMode('grid')}
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            title="グリッドビュー"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('journey')}
            className={`toggle-btn ${viewMode === 'journey' ? 'active' : ''}`}
            title="ジャーニービュー"
          >
            <Route size={18} />
          </button>
        </div>
      </header>

      <main className="page-content">
        {viewMode === 'grid' ? (
          <CanvasGrid
            getBlockContent={getBlockContent}
            onUpdateBlock={handleBlockUpdate}
            savingBlock={savingBlock}
          />
        ) : (
          <div className="journey-view">
            <CustomerJourney getBlockContent={getBlockContent} />
            <div className="journey-grid">
              <CanvasGrid
                getBlockContent={getBlockContent}
                onUpdateBlock={handleBlockUpdate}
                savingBlock={savingBlock}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
