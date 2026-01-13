/**
 * lib/hooks/useProductSection.ts
 *
 * 製品セクション管理用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ProductSection,
  Product,
  ProductSectionCreate,
  ProductSectionUpdate,
  ProductCreate,
  ProductUpdate,
  ProductTier,
} from '@/lib/types/product-section';

// セクション + 商品
interface ProductSectionWithProducts extends ProductSection {
  products: Product[];
}

// セクション一覧管理
export function useProductSectionList(brandId?: string) {
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = brandId
        ? `/api/product-sections?brandId=${brandId}`
        : '/api/product-sections';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch product sections');
      const data = await res.json();
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = async (input: ProductSectionCreate): Promise<ProductSection | null> => {
    try {
      const res = await fetch('/api/product-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create product section');
      const section = await res.json();
      setSections(prev => [section, ...prev]);
      return section;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteSection = async (sectionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/product-sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product section');
      setSections(prev => prev.filter(s => s.id !== sectionId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    sections,
    loading,
    error,
    refetch: fetchSections,
    createSection,
    deleteSection,
  };
}

// 個別セクション管理
export function useProductSection(sectionId: string | null) {
  const [section, setSection] = useState<ProductSectionWithProducts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);

  const fetchSection = useCallback(async () => {
    if (!sectionId) {
      setSection(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/product-sections/${sectionId}`);
      if (!res.ok) throw new Error('Failed to fetch product section');
      const data = await res.json();
      setSection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSection();
  }, [fetchSection]);

  const updateSection = async (input: ProductSectionUpdate): Promise<boolean> => {
    if (!sectionId) return false;
    try {
      const res = await fetch(`/api/product-sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update product section');
      const updated = await res.json();
      setSection(prev => prev ? { ...prev, ...updated } : null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // 商品作成
  const createProduct = async (input: ProductCreate): Promise<Product | null> => {
    if (!sectionId) return null;
    try {
      const res = await fetch(`/api/product-sections/${sectionId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create product');
      const product = await res.json();
      setSection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          products: [...prev.products, product],
        };
      });
      return product;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  // 商品更新
  const updateProduct = async (productId: string, input: ProductUpdate): Promise<boolean> => {
    try {
      setSavingProduct(productId);
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update product');
      const updated = await res.json();
      setSection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          products: prev.products.map(p => p.id === productId ? updated : p),
        };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSavingProduct(null);
    }
  };

  // 商品削除
  const deleteProduct = async (productId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setSection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          products: prev.products.filter(p => p.id !== productId),
        };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // 層ごとの商品取得
  const getProductsByTier = (tier: ProductTier): Product[] => {
    if (!section) return [];
    return section.products
      .filter(p => p.tier === tier)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  // フラッグシップ商品の設定
  const setFlagship = async (productId: string, tier: ProductTier): Promise<boolean> => {
    if (!section) return false;

    // 同じ層の他の商品のフラッグシップを解除
    const otherFlagships = section.products.filter(
      p => p.tier === tier && p.is_flagship && p.id !== productId
    );

    for (const p of otherFlagships) {
      await updateProduct(p.id, { is_flagship: false });
    }

    // 選択した商品をフラッグシップに
    return updateProduct(productId, { is_flagship: true });
  };

  return {
    section,
    loading,
    error,
    savingProduct,
    refetch: fetchSection,
    updateSection,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsByTier,
    setFlagship,
  };
}
