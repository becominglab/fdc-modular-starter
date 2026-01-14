'use client';

/**
 * components/business-plan/BrandSummary.tsx
 *
 * ブランド概要表示
 */

import Link from 'next/link';
import { Palette, Edit } from 'lucide-react';
import type { Brand } from '@/lib/types/brand';

interface BrandSummaryProps {
  brand: Brand;
}

export function BrandSummary({ brand }: BrandSummaryProps) {
  return (
    <div className="brand-summary">
      <div className="summary-header">
        <Palette size={20} />
        <h3>ブランド</h3>
        <Link href="/brand" className="edit-link">
          <Edit size={14} />
        </Link>
      </div>

      <div className="summary-content">
        {brand.logo_url && (
          <img src={brand.logo_url} alt={brand.name} className="brand-logo" />
        )}
        <div className="brand-info">
          <h4 className="brand-name">{brand.name}</h4>
          {brand.tagline && (
            <p className="brand-tagline">{brand.tagline}</p>
          )}
        </div>
      </div>

      {brand.story && (
        <p className="brand-story">{brand.story}</p>
      )}
    </div>
  );
}
