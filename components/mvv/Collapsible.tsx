'use client';

/**
 * components/mvv/Collapsible.tsx
 *
 * 折り畳み（アコーディオン）コンポーネント
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible ${isOpen ? 'open' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-header"
        aria-expanded={isOpen}
      >
        <div className="collapsible-icon">
          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        <div className="collapsible-title">
          <span className="title-text">{title}</span>
          {subtitle && <span className="subtitle-text">{subtitle}</span>}
        </div>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
