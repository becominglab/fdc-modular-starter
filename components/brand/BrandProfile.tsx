'use client';

/**
 * components/brand/BrandProfile.tsx
 *
 * ブランド基本情報表示・編集
 */

import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import type { Brand, BrandUpdate } from '@/lib/types/brand';

interface BrandProfileProps {
  brand: Brand;
  onUpdate: (updates: BrandUpdate) => Promise<void>;
}

export function BrandProfile({ brand, onUpdate }: BrandProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline || '');
  const [story, setStory] = useState(brand.story || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ name, tagline, story });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(brand.name);
    setTagline(brand.tagline || '');
    setStory(brand.story || '');
    setIsEditing(false);
  };

  return (
    <div className="glass-card-light" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: 0,
        }}>
          ブランドプロファイル
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Edit2 size={14} />
            編集
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--bg-gray)',
                color: 'var(--text-dark)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <Save size={14} />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ブランド名 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            ブランド名
          </label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            />
          ) : (
            <p style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-dark)',
              margin: 0,
            }}>
              {brand.name}
            </p>
          )}
        </div>

        {/* タグライン */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            タグライン
          </label>
          {isEditing ? (
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="ブランドを一言で表すフレーズ"
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
              }}
            />
          ) : (
            <p style={{
              fontSize: '16px',
              color: brand.tagline ? 'var(--text-dark)' : 'var(--text-muted)',
              margin: 0,
              fontStyle: brand.tagline ? 'normal' : 'italic',
            }}>
              {brand.tagline || '未設定'}
            </p>
          )}
        </div>

        {/* ストーリー */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}>
            ブランドストーリー
          </label>
          {isEditing ? (
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="ブランドの背景や想いを記述"
              className="glass-input"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          ) : (
            <p style={{
              fontSize: '14px',
              color: brand.story ? 'var(--text-dark)' : 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.6,
              fontStyle: brand.story ? 'normal' : 'italic',
              whiteSpace: 'pre-wrap',
            }}>
              {brand.story || '未設定'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
