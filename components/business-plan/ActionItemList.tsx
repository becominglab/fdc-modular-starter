'use client';

/**
 * components/business-plan/ActionItemList.tsx
 *
 * 次のアクションアイテム表示
 */

import Link from 'next/link';
import { ArrowRight, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { ActionItem } from '@/lib/types/business-plan';

interface ActionItemListProps {
  items: ActionItem[];
}

export function ActionItemList({ items }: ActionItemListProps) {
  if (items.length === 0) {
    return (
      <div className="action-items-complete">
        <Lightbulb size={24} />
        <p>すべてのアイテムが完了しています！</p>
      </div>
    );
  }

  const getPriorityIcon = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle size={16} className="priority-high" />;
      case 'medium':
        return <Info size={16} className="priority-medium" />;
      default:
        return <Lightbulb size={16} className="priority-low" />;
    }
  };

  return (
    <div className="action-items">
      <h3>次のアクション</h3>
      <ul className="action-list">
        {items.map(item => (
          <li key={item.id} className={`action-item priority-${item.priority}`}>
            <div className="action-icon">
              {getPriorityIcon(item.priority)}
            </div>
            <div className="action-content">
              <span className="action-title">{item.title}</span>
              <span className="action-description">{item.description}</span>
            </div>
            <Link href={item.link} className="action-link">
              <ArrowRight size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
