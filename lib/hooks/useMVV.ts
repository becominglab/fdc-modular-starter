/**
 * lib/hooks/useMVV.ts
 *
 * MVV 管理用カスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { MVV, MVVCreate, MVVUpdate } from '@/lib/types/mvv';

export function useMVV(brandId: string | null) {
  const [mvv, setMVV] = useState<MVV | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMVV = useCallback(async () => {
    if (!brandId) {
      setMVV(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/mvv?brandId=${brandId}`);
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to fetch MVV');
      }

      const data = await res.json();
      setMVV(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchMVV();
  }, [fetchMVV]);

  // MVV 作成
  const createMVV = async (input: MVVCreate): Promise<MVV | null> => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/api/mvv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error('Failed to create MVV');

      const created = await res.json();
      setMVV(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // MVV 更新
  const updateMVV = async (input: MVVUpdate): Promise<boolean> => {
    if (!mvv) return false;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/mvv/${mvv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error('Failed to update MVV');

      const updated = await res.json();
      setMVV(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // MVV を作成または更新（upsert的な動作）
  const saveMVV = async (input: MVVUpdate): Promise<boolean> => {
    if (!brandId) return false;

    if (mvv) {
      return await updateMVV(input);
    } else {
      const created = await createMVV({ ...input, brand_id: brandId });
      return !!created;
    }
  };

  // Value 追加
  const addValue = async (value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    const newValues = [...(mvv?.values || []), value.trim()];
    return await saveMVV({ values: newValues });
  };

  // Value 削除
  const removeValue = async (index: number): Promise<boolean> => {
    const newValues = (mvv?.values || []).filter((_, i) => i !== index);
    return await saveMVV({ values: newValues });
  };

  // Value 更新
  const updateValue = async (index: number, value: string): Promise<boolean> => {
    const newValues = [...(mvv?.values || [])];
    newValues[index] = value;
    return await saveMVV({ values: newValues });
  };

  return {
    mvv,
    loading,
    error,
    saving,
    refetch: fetchMVV,
    createMVV,
    updateMVV,
    saveMVV,
    addValue,
    removeValue,
    updateValue,
  };
}
