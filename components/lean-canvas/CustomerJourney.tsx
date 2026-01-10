/**
 * components/lean-canvas/CustomerJourney.tsx
 *
 * カスタマージャーニー可視化コンポーネント
 * Problem → Solution → Unique Value → Channels → Customer Segments のフロー表示
 */

'use client';

import { ArrowRight, Users, Lightbulb, Target, Megaphone, CheckCircle } from 'lucide-react';
import type { LeanCanvasBlockType } from '@/lib/types/lean-canvas';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface CustomerJourneyProps {
  getBlockContent: (blockType: LeanCanvasBlockType) => string[];
}

// ジャーニーステップの定義
const JOURNEY_STEPS: {
  blockType: LeanCanvasBlockType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  phase: string;
}[] = [
  { blockType: 'customer_segments', icon: Users, phase: '認知' },
  { blockType: 'problem', icon: Target, phase: '課題認識' },
  { blockType: 'channels', icon: Megaphone, phase: '接触' },
  { blockType: 'unique_value', icon: Lightbulb, phase: '検討' },
  { blockType: 'solution', icon: CheckCircle, phase: '導入' },
];

export function CustomerJourney({ getBlockContent }: CustomerJourneyProps) {
  return (
    <div className="customer-journey">
      <h3 className="journey-title">Customer Journey Flow</h3>
      <div className="journey-flow">
        {JOURNEY_STEPS.map((step, index) => {
          const info = LEAN_CANVAS_BLOCK_INFO[step.blockType];
          const content = getBlockContent(step.blockType);
          const Icon = step.icon;

          return (
            <div key={step.blockType} className="journey-step-wrapper">
              <div
                className="journey-step"
                style={{ '--step-color': info.color } as React.CSSProperties}
              >
                <div className="step-phase">{step.phase}</div>
                <div className="step-icon">
                  <Icon size={24} />
                </div>
                <div className="step-label">{info.label}</div>
                <div className="step-content">
                  {content.length > 0 ? (
                    <ul>
                      {content.slice(0, 2).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                      {content.length > 2 && (
                        <li className="step-more">+{content.length - 2}</li>
                      )}
                    </ul>
                  ) : (
                    <span className="step-empty">未入力</span>
                  )}
                </div>
              </div>
              {index < JOURNEY_STEPS.length - 1 && (
                <div className="journey-arrow">
                  <ArrowRight size={20} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// シンプル版（ホバーカード用）
export function CustomerJourneySimple({
  getBlockContent,
}: CustomerJourneyProps) {
  const filledSteps = JOURNEY_STEPS.filter(
    step => getBlockContent(step.blockType).length > 0
  );
  const progress = Math.round((filledSteps.length / JOURNEY_STEPS.length) * 100);

  return (
    <div className="customer-journey-simple">
      <div className="journey-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{progress}% 完成</span>
      </div>
      <div className="journey-dots">
        {JOURNEY_STEPS.map((step) => {
          const info = LEAN_CANVAS_BLOCK_INFO[step.blockType];
          const hasContent = getBlockContent(step.blockType).length > 0;
          return (
            <div
              key={step.blockType}
              className={`journey-dot ${hasContent ? 'filled' : ''}`}
              style={{ '--dot-color': info.color } as React.CSSProperties}
              title={info.label}
            />
          );
        })}
      </div>
    </div>
  );
}
