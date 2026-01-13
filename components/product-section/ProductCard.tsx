/**
 * components/product-section/ProductCard.tsx
 *
 * 商品カードコンポーネント
 */

'use client';

import { Edit, Trash2, Star, Package } from 'lucide-react';
import type { Product, ProductTier } from '@/lib/types/product-section';
import {
  PRODUCT_TIER_INFO,
  PRICE_TYPE_INFO,
  DELIVERY_TYPE_INFO,
} from '@/lib/types/product-section';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onSetFlagship?: (productId: string, tier: ProductTier) => void;
}

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onSetFlagship,
}: ProductCardProps) {
  const tierInfo = PRODUCT_TIER_INFO[product.tier];
  const priceInfo = PRICE_TYPE_INFO[product.price_type];
  const deliveryInfo = DELIVERY_TYPE_INFO[product.delivery_type];

  const formatPrice = () => {
    if (product.price_type === 'free') return '無料';
    if (product.price_type === 'custom') return '要相談';
    if (product.price_type === 'range') {
      const min = product.price_min?.toLocaleString() || '?';
      const max = product.price_max?.toLocaleString() || '?';
      return `¥${min} 〜 ¥${max}`;
    }
    if (product.price_min) {
      return `¥${product.price_min.toLocaleString()}`;
    }
    return product.price_label || priceInfo.label;
  };

  return (
    <div
      className={`product-card ${product.is_flagship ? 'flagship' : ''}`}
      style={{ '--tier-color': tierInfo.color } as React.CSSProperties}
    >
      {/* ヘッダー */}
      <div className="product-card-header">
        <div className="product-card-title-row">
          <h4 className="product-card-title">{product.name}</h4>
          {product.is_flagship && (
            <Star className="flagship-icon" size={16} fill="currentColor" />
          )}
        </div>
        <div className="product-card-actions">
          {onSetFlagship && !product.is_flagship && (
            <button
              onClick={() => onSetFlagship(product.id, product.tier)}
              className="btn-icon btn-star"
              title="主力商品に設定"
            >
              <Star size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit(product)}
            className="btn-icon"
            title="編集"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="btn-icon btn-danger"
            title="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 説明 */}
      {product.description && (
        <p className="product-card-description">{product.description}</p>
      )}

      {/* メタ情報 */}
      <div className="product-card-meta">
        <span className="meta-price">{formatPrice()}</span>
        <span className="meta-delivery">{deliveryInfo.label}</span>
        {product.duration && (
          <span className="meta-duration">{product.duration}</span>
        )}
      </div>

      {/* 特徴 */}
      {product.features.length > 0 && (
        <ul className="product-card-features">
          {product.features.slice(0, 3).map((feature, idx) => (
            <li key={idx}>
              <Package size={12} />
              {feature}
            </li>
          ))}
          {product.features.length > 3 && (
            <li className="more">+{product.features.length - 3} more</li>
          )}
        </ul>
      )}

      {/* ターゲット */}
      {product.target_audience && (
        <p className="product-card-target">
          <span className="target-label">対象:</span>
          {product.target_audience}
        </p>
      )}

      {/* コンバージョン目標 */}
      {product.conversion_goal && (
        <p className="product-card-goal">
          <span className="goal-label">次のステップ:</span>
          {product.conversion_goal}
        </p>
      )}
    </div>
  );
}
