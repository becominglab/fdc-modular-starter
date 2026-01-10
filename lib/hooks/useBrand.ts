'use client';

/**
 * lib/hooks/useBrand.ts
 *
 * ブランド管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { Brand, BrandPoint, BrandCreate, BrandUpdate, BrandPointType } from '@/lib/types/brand';

interface BrandWithPoints extends Brand {
  points: BrandPoint[];
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/brands', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }

      const data = await response.json();
      setBrands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = useCallback(async (input: BrandCreate) => {
    const response = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create brand');
    }

    const newBrand = await response.json();
    setBrands(prev => [newBrand, ...prev]);
    return newBrand;
  }, []);

  const deleteBrand = useCallback(async (brandId: string) => {
    const response = await fetch(`/api/brands/${brandId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete brand');
    }

    setBrands(prev => prev.filter(b => b.id !== brandId));
  }, []);

  return {
    brands,
    isLoading,
    error,
    refetch: fetchBrands,
    createBrand,
    deleteBrand,
  };
}

export function useBrand(brandId: string | null) {
  const [brand, setBrand] = useState<BrandWithPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    if (!brandId) {
      setBrand(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brand');
      }

      const data = await response.json();
      setBrand(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const updateBrand = useCallback(async (updates: BrandUpdate) => {
    if (!brandId) return;

    const response = await fetch(`/api/brands/${brandId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update brand');
    }

    const updated = await response.json();
    setBrand(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  }, [brandId]);

  const updatePoint = useCallback(async (pointType: BrandPointType, content: string) => {
    if (!brandId) return;

    const response = await fetch(`/api/brands/${brandId}/points/${pointType}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to update point');
    }

    const updatedPoint = await response.json();

    // ローカルステート更新
    setBrand(prev => {
      if (!prev) return null;
      const points = prev.points.map(p =>
        p.point_type === pointType ? updatedPoint : p
      );
      // もし存在しなければ追加
      if (!points.find(p => p.point_type === pointType)) {
        points.push(updatedPoint);
      }
      return { ...prev, points };
    });

    return updatedPoint;
  }, [brandId]);

  // ポイントを取得するヘルパー
  const getPoint = useCallback((pointType: BrandPointType): string => {
    if (!brand) return '';
    const point = brand.points.find(p => p.point_type === pointType);
    return point?.content || '';
  }, [brand]);

  // 入力済みポイント数
  const filledPointsCount = brand?.points.filter(p => p.content.trim() !== '').length || 0;

  return {
    brand,
    isLoading,
    error,
    refetch: fetchBrand,
    updateBrand,
    updatePoint,
    getPoint,
    filledPointsCount,
  };
}
