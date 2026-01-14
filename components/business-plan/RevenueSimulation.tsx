'use client';

/**
 * components/business-plan/RevenueSimulation.tsx
 *
 * 収益シミュレーション表示コンポーネント
 */

import { TrendingUp } from 'lucide-react';
import type { RevenueSimulation as RevenueSimulationType } from '@/lib/types/business-plan';
import { PRODUCT_TIER_INFO } from '@/lib/types/product-section';

interface RevenueSimulationProps {
  revenue: RevenueSimulationType;
}

export function RevenueSimulation({ revenue }: RevenueSimulationProps) {
  return (
    <div className="revenue-simulation">
      <div className="revenue-header">
        <TrendingUp size={20} />
        <h3>収益シミュレーション</h3>
      </div>

      <div className="revenue-totals">
        <div className="revenue-total monthly">
          <span className="total-label">月間予想</span>
          <span className="total-value">¥{revenue.monthly.toLocaleString()}</span>
        </div>
        <div className="revenue-total annual">
          <span className="total-label">年間予想</span>
          <span className="total-value">¥{revenue.annual.toLocaleString()}</span>
        </div>
      </div>

      <div className="revenue-breakdown">
        <table>
          <thead>
            <tr>
              <th>商品層</th>
              <th>商品数</th>
              <th>平均単価</th>
              <th>販売数/月</th>
              <th>小計</th>
            </tr>
          </thead>
          <tbody>
            {revenue.breakdown.map(item => {
              const tierInfo = PRODUCT_TIER_INFO[item.tier];
              return (
                <tr key={item.tier}>
                  <td>
                    <span
                      className="tier-badge"
                      style={{ backgroundColor: tierInfo.color }}
                    >
                      {tierInfo.label}
                    </span>
                  </td>
                  <td>{item.productCount}</td>
                  <td>¥{item.averagePrice.toLocaleString()}</td>
                  <td>{item.estimatedSales}</td>
                  <td className="subtotal">¥{item.subtotal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="revenue-note">
        * 予想販売数は一般的なコンバージョン率に基づく概算です
      </p>
    </div>
  );
}
