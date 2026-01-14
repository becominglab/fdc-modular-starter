'use client';

/**
 * components/business-plan/CompletionIndicator.tsx
 *
 * 完成度表示コンポーネント
 */

import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import type { CompletionStatus } from '@/lib/types/business-plan';

interface CompletionIndicatorProps {
  completion: CompletionStatus;
  showDetails?: boolean;
}

export function CompletionIndicator({ completion, showDetails = false }: CompletionIndicatorProps) {
  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'completion-high';
    if (percentage >= 50) return 'completion-medium';
    return 'completion-low';
  };

  return (
    <div className={`completion-indicator ${getColorClass(completion.percentage)}`}>
      <div className="completion-header">
        <span className="completion-label">完成度</span>
        <span className="completion-percentage">{completion.percentage}%</span>
      </div>

      <div className="completion-bar">
        <div
          className="completion-bar-fill"
          style={{ width: `${completion.percentage}%` }}
        />
      </div>

      <div className="completion-stats">
        <span>{completion.completed} / {completion.total} 項目完了</span>
      </div>

      {showDetails && (
        <div className="completion-details">
          {['brand', 'lean-canvas', 'products'].map(category => {
            const categoryItems = completion.items.filter(i => i.category === category);
            const categoryCompleted = categoryItems.filter(i => i.completed).length;
            const categoryLabel = {
              brand: 'ブランド',
              'lean-canvas': 'Lean Canvas',
              products: '製品セクション',
            }[category];

            return (
              <div key={category} className="completion-category">
                <span className="category-label">{categoryLabel}</span>
                <span className="category-count">
                  {categoryCompleted}/{categoryItems.length}
                </span>
                <div className="category-items">
                  {categoryItems.map(item => (
                    <div
                      key={item.field}
                      className={`category-item ${item.completed ? 'completed' : ''}`}
                    >
                      {item.completed ? (
                        <CheckCircle size={12} />
                      ) : item.priority === 'high' ? (
                        <AlertCircle size={12} />
                      ) : (
                        <Circle size={12} />
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
