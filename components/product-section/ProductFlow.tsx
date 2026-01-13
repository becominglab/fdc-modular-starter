/**
 * components/product-section/ProductFlow.tsx
 *
 * 商品フロー（ファネル）可視化コンポーネント
 */

'use client';

import { ArrowRight, Users, Handshake, TrendingUp } from 'lucide-react';
import type { Product } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO, PRODUCT_TIERS } from '@/lib/types/product-section';

interface ProductFlowProps {
  products: Product[];
}

export function ProductFlow({ products }: ProductFlowProps) {
  const getProductsByTier = (tier: 'front' | 'middle' | 'back') => {
    return products.filter(p => p.tier === tier);
  };

  const getFlagship = (tier: 'front' | 'middle' | 'back') => {
    const tierProducts = getProductsByTier(tier);
    return tierProducts.find(p => p.is_flagship) || tierProducts[0];
  };

  const tierIcons = {
    front: Users,
    middle: Handshake,
    back: TrendingUp,
  };

  return (
    <div className="product-flow">
      <h3 className="product-flow-title">商品フロー</h3>
      <p className="product-flow-description">
        見込み客が最初に出会う商品から、主力商品への流れを設計しましょう
      </p>

      <div className="product-flow-diagram">
        {PRODUCT_TIERS.map((tier, index) => {
          const tierInfo = PRODUCT_TIER_INFO[tier];
          const tierProducts = getProductsByTier(tier);
          const flagship = getFlagship(tier);
          const Icon = tierIcons[tier];

          return (
            <div key={tier} className="flow-stage">
              {/* ステージ */}
              <div
                className="flow-stage-card"
                style={{ '--tier-color': tierInfo.color } as React.CSSProperties}
              >
                <div className="flow-stage-icon">
                  <Icon size={24} />
                </div>
                <div className="flow-stage-content">
                  <h4 className="flow-stage-title">{tierInfo.label}</h4>
                  <p className="flow-stage-purpose">{tierInfo.purpose}</p>

                  {flagship ? (
                    <div className="flow-flagship">
                      <span className="flagship-name">{flagship.name}</span>
                      {flagship.is_flagship && (
                        <span className="flagship-badge">主力</span>
                      )}
                    </div>
                  ) : (
                    <p className="flow-empty">未設定</p>
                  )}

                  <span className="flow-count">
                    {tierProducts.length}件の商品
                  </span>
                </div>
              </div>

              {/* 矢印 */}
              {index < PRODUCT_TIERS.length - 1 && (
                <div className="flow-arrow">
                  <ArrowRight size={24} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
