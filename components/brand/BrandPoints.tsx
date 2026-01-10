'use client';

/**
 * components/brand/BrandPoints.tsx
 *
 * 10ポイントブランド戦略編集
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';
import {
  BRAND_POINT_INFO,
  BRAND_POINT_TYPES,
  type BrandPoint,
  type BrandPointType,
} from '@/lib/types/brand';

interface BrandPointsProps {
  points: BrandPoint[];
  onUpdatePoint: (pointType: BrandPointType, content: string) => Promise<void>;
}

interface PointCardProps {
  pointType: BrandPointType;
  content: string;
  onSave: (content: string) => Promise<void>;
}

function PointCard({ pointType, content, onSave }: PointCardProps) {
  const info = BRAND_POINT_INFO[pointType];
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const hasContent = content.trim() !== '';

  const handleSave = async () => {
    if (editContent === content) return;
    setIsSaving(true);
    try {
      await onSave(editContent);
    } catch (err) {
      console.error('Failed to save point:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="glass-card-light"
      style={{
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '16px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hasContent ? 'var(--success)' : 'var(--bg-gray)',
            color: hasContent ? 'white' : 'var(--text-muted)',
            borderRadius: '6px',
            fontWeight: 600,
          }}>
            {info.order}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                margin: 0,
              }}>
                {info.label}
              </h3>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}>
                {info.labelEn}
              </span>
            </div>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '2px 0 0 0',
            }}>
              {info.description}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasContent ? (
            <Check size={16} color="var(--success)" />
          ) : (
            <Circle size={16} color="var(--text-muted)" />
          )}
          {isExpanded ? (
            <ChevronUp size={20} color="var(--text-muted)" />
          ) : (
            <ChevronDown size={20} color="var(--text-muted)" />
          )}
        </div>
      </button>

      {/* 展開エリア */}
      {isExpanded && (
        <div style={{
          padding: '0 20px 20px 20px',
          borderTop: '1px solid var(--border-light)',
        }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            placeholder={info.placeholder}
            className="glass-input"
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              marginTop: '16px',
              resize: 'vertical',
            }}
          />
          {isSaving && (
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '8px',
            }}>
              保存中...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function BrandPoints({ points, onUpdatePoint }: BrandPointsProps) {
  const filledCount = points.filter(p => p.content.trim() !== '').length;

  const getPointContent = (pointType: BrandPointType): string => {
    const point = points.find(p => p.point_type === pointType);
    return point?.content || '';
  };

  return (
    <div>
      {/* 進捗 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
        }}>
          10ポイント戦略
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '120px',
            height: '8px',
            background: 'var(--bg-gray)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${(filledCount / 10) * 100}%`,
                height: '100%',
                background: filledCount === 10 ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: filledCount === 10 ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {filledCount}/10
          </span>
        </div>
      </div>

      {/* ポイント一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {BRAND_POINT_TYPES.map(pointType => (
          <PointCard
            key={pointType}
            pointType={pointType}
            content={getPointContent(pointType)}
            onSave={(content) => onUpdatePoint(pointType, content)}
          />
        ))}
      </div>
    </div>
  );
}
