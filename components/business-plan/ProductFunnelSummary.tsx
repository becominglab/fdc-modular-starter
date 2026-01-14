'use client';

/**
 * components/business-plan/ProductFunnelSummary.tsx
 *
 * 製品ファネル概要表示
 */

import Link from 'next/link';
import { Package, Edit, ArrowRight } from 'lucide-react';
import type { ProductSection, Product } from '@/lib/types/product-section';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';

interface ProductFunnelSummaryProps {
  section: ProductSection & { products: Product[] };
}

export function ProductFunnelSummary({ section }: ProductFunnelSummaryProps) {
  const getProductsByTier = (tier: 'front' | 'middle' | 'back') =>
    section.products.filter(p => p.tier === tier);

  const frontProducts = getProductsByTier('front');
  const middleProducts = getProductsByTier('middle');
  const backProducts = getProductsByTier('back');

  return (
    <div className="product-funnel-summary">
      <div className="summary-header">
        <Package size={20} />
        <h3>製品ファネル</h3>
        <Link href={`/product-sections/${section.id}`} className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="funnel-flow">
        {(['front', 'middle', 'back'] as const).map((tier, index) => {
          const products = tier === 'front' ? frontProducts
            : tier === 'middle' ? middleProducts : backProducts;
          const info = PRODUCT_TIER_INFO[tier];
          const flagship = products.find(p => p.is_flagship) || products[0];

          return (
            <div key={tier} className="funnel-stage">
              <div
                className="stage-card"
                style={{ borderColor: info.color }}
              >
                <span
                  className="stage-badge"
                  style={{ backgroundColor: info.color }}
                >
                  {info.label}
                </span>
                <span className="stage-count">{products.length}件</span>
                {flagship && (
                  <span className="stage-flagship">{flagship.name}</span>
                )}
              </div>
              {index < 2 && (
                <ArrowRight size={16} className="funnel-arrow" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
