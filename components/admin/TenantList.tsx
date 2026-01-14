/**
 * components/admin/TenantList.tsx
 *
 * テナント（ワークスペース）一覧
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, Building2, Users, Loader2 } from 'lucide-react';
import type { TenantSummary } from '@/lib/types/super-admin';

export function TenantList() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/super-admin/tenants?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-gray-500" />
          <h3 className="font-medium">テナント一覧</h3>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ワークスペース名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : tenants.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            テナントがありません
          </div>
        ) : (
          tenants.map((tenant) => (
            <div key={tenant.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-sm text-gray-500">{tenant.ownerEmail}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{tenant.memberCount}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                作成: {new Date(tenant.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
