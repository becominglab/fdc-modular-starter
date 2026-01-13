/**
 * components/product-section/TierSection.tsx
 *
 * 商品層セクションコンポーネント
 */

'use client';

import { Plus } from 'lucide-react';
import type { Product, ProductTier } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';
import { ProductCard } from './ProductCard';

interface TierSectionProps {
  tier: ProductTier;
  products: Product[];
  onAddProduct: (tier: ProductTier) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSetFlagship: (productId: string, tier: ProductTier) => void;
}

export function TierSection({
  tier,
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onSetFlagship,
}: TierSectionProps) {
  const tierInfo = PRODUCT_TIER_INFO[tier];

  return (
    <div
      className="tier-section"
      style={{ '--tier-color': tierInfo.color } as React.CSSProperties}
    >
      {/* ヘッダー */}
      <div className="tier-section-header">
        <div className="tier-section-title">
          <div className="tier-badge" />
          <h3>{tierInfo.label}</h3>
          <span className="tier-label-en">{tierInfo.labelEn}</span>
        </div>
        <button
          onClick={() => onAddProduct(tier)}
          className="btn btn-sm btn-outline"
        >
          <Plus size={14} />
          追加
        </button>
      </div>

      {/* 説明 */}
      <div className="tier-section-info">
        <p className="tier-description">{tierInfo.description}</p>
        <div className="tier-meta">
          <span className="tier-purpose">{tierInfo.purpose}</span>
          <span className="tier-price-range">{tierInfo.priceRange}</span>
        </div>
      </div>

      {/* 商品リスト */}
      {products.length === 0 ? (
        <div className="tier-empty">
          <p>まだ商品がありません</p>
          <p className="tier-examples">
            例: {tierInfo.examples.join('、')}
          </p>
        </div>
      ) : (
        <div className="tier-products">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEditProduct}
              onDelete={onDeleteProduct}
              onSetFlagship={onSetFlagship}
            />
          ))}
        </div>
      )}
    </div>
  );
}
