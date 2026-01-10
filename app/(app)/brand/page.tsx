'use client';

/**
 * app/(app)/brand/page.tsx
 *
 * ブランド戦略ページ
 */

import { useState } from 'react';
import { Palette, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useBrands, useBrand } from '@/lib/hooks/useBrand';
import { BrandProfile } from '@/components/brand/BrandProfile';
import { BrandPoints } from '@/components/brand/BrandPoints';
import { TonmanaCheck } from '@/components/brand/TonmanaCheck';

export default function BrandPage() {
  const { brands, isLoading: brandsLoading, createBrand, deleteBrand } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const { brand, isLoading: brandLoading, updateBrand, updatePoint } = useBrand(selectedBrandId);

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsCreating(true);
    try {
      const newBrand = await createBrand({ name: newBrandName.trim() });
      setSelectedBrandId(newBrand.id);
      setNewBrandName('');
    } catch (err) {
      console.error('Failed to create brand:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('このブランドを削除しますか？')) return;
    try {
      await deleteBrand(brandId);
      if (selectedBrandId === brandId) {
        setSelectedBrandId(null);
      }
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Palette size={28} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            ブランド戦略
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            10ポイントでブランドを整理
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px',
      }}>
        {/* サイドバー: ブランド一覧 */}
        <div>
          {/* 新規作成 */}
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--bg-gray)',
            borderRadius: '12px',
          }}>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="新しいブランド名"
              className="glass-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                marginBottom: '8px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBrand();
              }}
            />
            <button
              onClick={handleCreateBrand}
              disabled={!newBrandName.trim() || isCreating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                fontWeight: 500,
                background: newBrandName.trim() ? 'var(--primary)' : 'var(--border-light)',
                color: newBrandName.trim() ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                cursor: newBrandName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Plus size={16} />
              {isCreating ? '作成中...' : '作成'}
            </button>
          </div>

          {/* ブランド一覧 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {brandsLoading ? (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '16px' }}>
                読み込み中...
              </p>
            ) : brands.length === 0 ? (
              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                padding: '16px',
                textAlign: 'center',
              }}>
                ブランドがありません
              </p>
            ) : (
              brands.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: selectedBrandId === b.id ? 'var(--primary-alpha-10, rgba(59, 130, 246, 0.1))' : 'white',
                    border: selectedBrandId === b.id ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedBrandId(b.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {b.name}
                    </p>
                    {b.tagline && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        margin: '2px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {b.tagline}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBrand(b.id);
                      }}
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div>
          {!selectedBrandId ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              background: 'var(--bg-gray)',
              borderRadius: '16px',
              textAlign: 'center',
            }}>
              <Palette size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                ブランドを選択または作成してください
              </p>
            </div>
          ) : brandLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              読み込み中...
            </div>
          ) : brand ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* プロファイル */}
              <BrandProfile brand={brand} onUpdate={updateBrand} />

              {/* 10ポイント */}
              <BrandPoints points={brand.points} onUpdatePoint={updatePoint} />

              {/* トンマナチェック */}
              <TonmanaCheck brandName={brand.name} points={brand.points} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
