/**
 * app/(app)/lean-canvas/page.tsx
 *
 * Lean Canvas 一覧ページ
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Loader2, Trash2, Edit, Eye, ChevronDown } from 'lucide-react';
import { useLeanCanvasList } from '@/lib/hooks/useLeanCanvas';
import { useBrands } from '@/lib/hooks/useBrand';

export default function LeanCanvasListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBrandId = searchParams.get('brandId') || undefined;

  // ブランド一覧を取得
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(urlBrandId);

  // URLパラメータまたは選択されたブランドを使用
  const brandId = selectedBrandId;

  // ブランドが読み込まれたら、最初のブランドを選択（URLパラメータがない場合）
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const { canvases, loading, error, createCanvas, deleteCanvas } = useLeanCanvasList(brandId);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = async () => {
    if (!brandId) {
      alert('ブランドを選択してください');
      return;
    }
    setCreating(true);
    const canvas = await createCanvas({
      brand_id: brandId,
      title: newTitle || 'New Lean Canvas',
    });
    setCreating(false);
    if (canvas) {
      setNewTitle('');
      setShowCreateForm(false);
      router.push(`/lean-canvas/${canvas.id}`);
    }
  };

  const handleDelete = async (canvasId: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    await deleteCanvas(canvasId);
  };

  if (loading || brandsLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <p>エラー: {error}</p>
      </div>
    );
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="lean-canvas-list-page">
      <header className="page-header">
        <div className="header-content">
          <LayoutGrid size={24} />
          <h1>Lean Canvas</h1>
        </div>
        <div className="header-actions-group">
          {/* ブランド選択 */}
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value || undefined)}
              className="brand-select"
            >
              {brands.length === 0 ? (
                <option value="">ブランドがありません</option>
              ) : (
                brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
            disabled={!brandId || brands.length === 0}
          >
            <Plus size={16} />
            新規作成
          </button>
        </div>
      </header>

      {brands.length === 0 && (
        <div className="alert alert-warning">
          まず「ブランド」タブでブランドを作成してください。
        </div>
      )}

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h2>新規キャンバス作成</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="キャンバス名（任意）"
              className="form-input"
              autoFocus
            />
            <div className="form-actions">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTitle('');
                }}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {canvases.length === 0 ? (
        <div className="empty-state">
          <LayoutGrid size={48} />
          <h2>キャンバスがありません</h2>
          <p>新規作成ボタンからLean Canvasを作成しましょう</p>
        </div>
      ) : (
        <div className="canvas-grid">
          {canvases.map((canvas) => (
            <div key={canvas.id} className="canvas-card">
              <div className="card-header">
                <h3>{canvas.title}</h3>
                <div className="card-actions">
                  <button
                    onClick={() => router.push(`/lean-canvas/${canvas.id}`)}
                    className="btn-icon"
                    title="編集"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(canvas.id, canvas.title)}
                    className="btn-icon btn-danger"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {canvas.description && (
                <p className="card-description">{canvas.description}</p>
              )}
              <div className="card-meta">
                <span>
                  作成: {new Date(canvas.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <button
                onClick={() => router.push(`/lean-canvas/${canvas.id}`)}
                className="card-open"
              >
                <Eye size={16} />
                開く
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
