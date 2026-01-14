'use client';

/**
 * app/(app)/business-plan/page.tsx
 *
 * ビジネスプラン統合ダッシュボード
 */

import { useState, useEffect } from 'react';
import { Briefcase, Loader2, ChevronDown, Plus } from 'lucide-react';
import { useBrands } from '@/lib/hooks/useBrand';
import { useBusinessPlan } from '@/lib/hooks/useBusinessPlan';
import {
  CompletionIndicator,
  RevenueSimulation,
  ActionItemList,
  BrandSummary,
  LeanCanvasSummary,
  ProductFunnelSummary,
} from '@/components/business-plan';

export default function BusinessPlanPage() {
  const { brands, isLoading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // ブランドが読み込まれたら最初のブランドを選択
  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const { data, loading, error } = useBusinessPlan(selectedBrandId);

  if (brandsLoading) {
    return (
      <div className="page-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="business-plan-page">
        <header className="page-header">
          <div className="header-content">
            <Briefcase size={24} />
            <h1>ビジネスプラン</h1>
          </div>
        </header>
        <div className="empty-state">
          <Briefcase size={48} />
          <h2>ブランドがありません</h2>
          <p>まず「ブランド」タブでブランドを作成してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-plan-page">
      <header className="page-header">
        <div className="header-content">
          <Briefcase size={24} />
          <h1>ビジネスプラン</h1>
        </div>
        <div className="header-actions-group">
          <div className="brand-selector">
            <select
              value={selectedBrandId || ''}
              onChange={e => setSelectedBrandId(e.target.value || null)}
              className="brand-select"
            >
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : error ? (
        <div className="page-error">
          <p>エラー: {error}</p>
        </div>
      ) : data ? (
        <div className="business-plan-layout">
          {/* 完成度 */}
          <section className="plan-section completion-section">
            <CompletionIndicator completion={data.completion} showDetails />
          </section>

          {/* 上段: ブランド + Lean Canvas */}
          <div className="plan-row">
            <section className="plan-section">
              {data.brand && <BrandSummary brand={data.brand} />}
            </section>
            <section className="plan-section">
              {data.leanCanvas ? (
                <LeanCanvasSummary canvas={data.leanCanvas} />
              ) : (
                <div className="empty-section">
                  <p>Lean Canvas がありません</p>
                  <a href="/lean-canvas" className="btn btn-outline">
                    <Plus size={14} /> 作成する
                  </a>
                </div>
              )}
            </section>
          </div>

          {/* 中段: 製品ファネル */}
          <section className="plan-section">
            {data.productSection ? (
              <ProductFunnelSummary section={data.productSection} />
            ) : (
              <div className="empty-section">
                <p>製品セクションがありません</p>
                <a href="/product-sections" className="btn btn-outline">
                  <Plus size={14} /> 作成する
                </a>
              </div>
            )}
          </section>

          {/* 収益シミュレーション */}
          {data.revenue && data.revenue.monthly > 0 && (
            <section className="plan-section">
              <RevenueSimulation revenue={data.revenue} />
            </section>
          )}

          {/* アクションアイテム */}
          <section className="plan-section">
            <ActionItemList items={data.actionItems} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
