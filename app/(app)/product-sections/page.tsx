/**
 * app/(app)/product-sections/page.tsx
 *
 * 製品セクション一覧ページ
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Package, Loader2, Trash2, Edit, Eye, ChevronDown } from 'lucide-react';
import { useProductSectionList } from '@/lib/hooks/useProductSection';
import { useBrands } from '@/lib/hooks/useBrand';

export default function ProductSectionsListPage() {
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

  const { sections, loading, error, createSection, deleteSection } = useProductSectionList(brandId);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = async () => {
    if (!brandId) {
      alert('ブランドを選択してください');
      return;
    }
    setCreating(true);
    const section = await createSection({
      brand_id: brandId,
      title: newTitle || '製品セクション',
    });
    setCreating(false);
    if (section) {
      setNewTitle('');
      setShowCreateForm(false);
      router.push(`/product-sections/${section.id}`);
    }
  };

  const handleDelete = async (sectionId: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？関連する商品もすべて削除されます。`)) return;
    await deleteSection(sectionId);
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

  return (
    <div className="product-sections-list-page">
      <header className="page-header">
        <div className="header-content">
          <Package size={24} />
          <h1>製品セクション</h1>
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

      {/* セクション説明 */}
      <div className="section-intro">
        <h2>フロント/ミドル/バック商品を設計</h2>
        <p>
          見込み客が最初に出会う<strong>フロント商品</strong>から、
          信頼を構築する<strong>ミドル商品</strong>、
          収益の柱となる<strong>バック商品</strong>まで、
          商品ラインナップを整理してファネルを設計しましょう。
        </p>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h2>新規セクション作成</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="セクション名（任意）"
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

      {sections.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h2>セクションがありません</h2>
          <p>新規作成ボタンから製品セクションを作成しましょう</p>
        </div>
      ) : (
        <div className="section-grid">
          {sections.map((section) => (
            <div key={section.id} className="section-card">
              <div className="card-header">
                <h3>{section.title}</h3>
                <div className="card-actions">
                  <button
                    onClick={() => router.push(`/product-sections/${section.id}`)}
                    className="btn-icon"
                    title="編集"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(section.id, section.title)}
                    className="btn-icon btn-danger"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {section.description && (
                <p className="card-description">{section.description}</p>
              )}
              <div className="card-meta">
                <span>
                  作成: {new Date(section.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <button
                onClick={() => router.push(`/product-sections/${section.id}`)}
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
