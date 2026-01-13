/**
 * app/(app)/product-sections/[sectionId]/page.tsx
 *
 * 製品セクション詳細ページ
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Edit, Save } from 'lucide-react';
import { useProductSection } from '@/lib/hooks/useProductSection';
import { TierSection, ProductFlow, ProductEditModal } from '@/components/product-section';
import type { Product, ProductTier, ProductCreate, ProductUpdate } from '@/lib/types/product-section';
import { PRODUCT_TIERS } from '@/lib/types/product-section';

export default function ProductSectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.sectionId as string;

  const {
    section,
    loading,
    error,
    updateSection,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsByTier,
    setFlagship,
  } = useProductSection(sectionId);

  // 編集モード
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // 商品編集モーダル
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [addingTier, setAddingTier] = useState<ProductTier | null>(null);

  // タイトル編集開始
  const startEditTitle = () => {
    setTitleValue(section?.title || '');
    setEditingTitle(true);
  };

  // タイトル保存
  const saveTitle = async () => {
    if (!titleValue.trim()) return;
    setSavingTitle(true);
    await updateSection({ title: titleValue.trim() });
    setSavingTitle(false);
    setEditingTitle(false);
  };

  // 商品追加
  const handleAddProduct = (tier: ProductTier) => {
    setEditingProduct(null);
    setAddingTier(tier);
    setModalOpen(true);
  };

  // 商品編集
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setAddingTier(null);
    setModalOpen(true);
  };

  // 商品削除
  const handleDeleteProduct = async (productId: string) => {
    const product = section?.products.find(p => p.id === productId);
    if (!product) return;
    if (!confirm(`「${product.name}」を削除しますか？`)) return;
    await deleteProduct(productId);
  };

  // 商品保存
  const handleSaveProduct = async (data: ProductCreate | ProductUpdate): Promise<boolean> => {
    if (editingProduct) {
      return await updateProduct(editingProduct.id, data as ProductUpdate);
    } else if (addingTier) {
      const product = await createProduct({ ...data, tier: addingTier } as ProductCreate);
      return !!product;
    }
    return false;
  };

  // フラッグシップ設定
  const handleSetFlagship = async (productId: string, tier: ProductTier) => {
    await setFlagship(productId, tier);
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="page-error">
        <p>エラー: {error || 'セクションが見つかりません'}</p>
        <button onClick={() => router.push('/product-sections')} className="btn btn-secondary">
          一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="product-section-detail-page">
      {/* ヘッダー */}
      <header className="page-header">
        <div className="header-content">
          <button
            onClick={() => router.push('/product-sections')}
            className="btn-icon back-btn"
            title="一覧に戻る"
          >
            <ArrowLeft size={20} />
          </button>
          <Package size={24} />
          {editingTitle ? (
            <div className="title-edit">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="title-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
              <button
                onClick={saveTitle}
                className="btn btn-sm btn-primary"
                disabled={savingTitle}
              >
                {savingTitle ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              </button>
            </div>
          ) : (
            <h1 onClick={startEditTitle} className="editable-title">
              {section.title}
              <Edit size={16} className="edit-icon" />
            </h1>
          )}
        </div>
      </header>

      {/* 商品フロー図 */}
      <ProductFlow products={section.products} />

      {/* 層別セクション */}
      <div className="tier-sections">
        {PRODUCT_TIERS.map(tier => (
          <TierSection
            key={tier}
            tier={tier}
            products={getProductsByTier(tier)}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onSetFlagship={handleSetFlagship}
          />
        ))}
      </div>

      {/* 商品編集モーダル */}
      {modalOpen && (
        <ProductEditModal
          product={editingProduct}
          tier={addingTier || undefined}
          onSave={handleSaveProduct}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
            setAddingTier(null);
          }}
        />
      )}
    </div>
  );
}
