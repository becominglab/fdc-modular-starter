/**
 * lib/hooks/useLeanCanvas.ts
 *
 * Lean Canvas 管理用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  LeanCanvas,
  LeanCanvasBlock,
  LeanCanvasCreate,
  LeanCanvasUpdate,
  LeanCanvasBlockType,
  LeanCanvasBlockUpdate,
} from '@/lib/types/lean-canvas';

// キャンバス + ブロック
interface LeanCanvasWithBlocks extends LeanCanvas {
  blocks: LeanCanvasBlock[];
}

// キャンバス一覧管理
export function useLeanCanvasList(brandId?: string) {
  const [canvases, setCanvases] = useState<LeanCanvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCanvases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = brandId
        ? `/api/lean-canvas?brandId=${brandId}`
        : '/api/lean-canvas';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch canvases');
      const data = await res.json();
      setCanvases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  const createCanvas = async (input: LeanCanvasCreate): Promise<LeanCanvas | null> => {
    try {
      const res = await fetch('/api/lean-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create canvas');
      const canvas = await res.json();
      setCanvases(prev => [canvas, ...prev]);
      return canvas;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteCanvas = async (canvasId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/lean-canvas/${canvasId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete canvas');
      setCanvases(prev => prev.filter(c => c.id !== canvasId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    canvases,
    loading,
    error,
    refetch: fetchCanvases,
    createCanvas,
    deleteCanvas,
  };
}

// 個別キャンバス管理
export function useLeanCanvas(canvasId: string | null) {
  const [canvas, setCanvas] = useState<LeanCanvasWithBlocks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBlock, setSavingBlock] = useState<LeanCanvasBlockType | null>(null);

  const fetchCanvas = useCallback(async () => {
    if (!canvasId) {
      setCanvas(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/lean-canvas/${canvasId}`);
      if (!res.ok) throw new Error('Failed to fetch canvas');
      const data = await res.json();
      setCanvas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    fetchCanvas();
  }, [fetchCanvas]);

  const updateCanvas = async (input: LeanCanvasUpdate): Promise<boolean> => {
    if (!canvasId) return false;
    try {
      const res = await fetch(`/api/lean-canvas/${canvasId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update canvas');
      const updated = await res.json();
      setCanvas(prev => prev ? { ...prev, ...updated } : null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const updateBlock = async (
    blockType: LeanCanvasBlockType,
    input: LeanCanvasBlockUpdate
  ): Promise<boolean> => {
    if (!canvasId) return false;
    try {
      setSavingBlock(blockType);
      const res = await fetch(`/api/lean-canvas/${canvasId}/blocks/${blockType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update block');
      const updatedBlock = await res.json();
      setCanvas(prev => {
        if (!prev) return null;
        const blocks = prev.blocks.map(b =>
          b.block_type === blockType ? updatedBlock : b
        );
        // ブロックが存在しない場合は追加
        if (!blocks.find(b => b.block_type === blockType)) {
          blocks.push(updatedBlock);
        }
        return { ...prev, blocks };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSavingBlock(null);
    }
  };

  // 特定ブロックの内容を取得
  const getBlockContent = (blockType: LeanCanvasBlockType): string[] => {
    if (!canvas) return [];
    const block = canvas.blocks.find(b => b.block_type === blockType);
    return block?.content || [];
  };

  return {
    canvas,
    loading,
    error,
    savingBlock,
    refetch: fetchCanvas,
    updateCanvas,
    updateBlock,
    getBlockContent,
  };
}
