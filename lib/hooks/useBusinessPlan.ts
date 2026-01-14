/**
 * lib/hooks/useBusinessPlan.ts
 *
 * ビジネスプラン統合データ取得 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { BusinessPlanOverview } from '@/lib/types/business-plan';

export function useBusinessPlan(brandId: string | null) {
  const [data, setData] = useState<BusinessPlanOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!brandId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/business-plan/${brandId}`);
      if (!res.ok) throw new Error('Failed to fetch business plan');

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
