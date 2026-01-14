/**
 * components/super-admin/TenantsTable.tsx
 *
 * テナント（ワークスペース）一覧テーブル
 */

'use client';

import { Search, Building2, Users, Calendar, Activity } from 'lucide-react';
import type { TenantSummary } from '@/lib/types/super-admin';

interface TenantsTableProps {
  tenants: TenantSummary[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
}

export function TenantsTable({ tenants, loading, search, onSearchChange }: TenantsTableProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <h2 className="sa-section-title">
          <Building2 size={20} />
          テナント一覧
        </h2>
        <div className="sa-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="名前またはスラッグで検索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="sa-search-input"
          />
        </div>
      </div>

      <div className="sa-table-wrapper">
        <table className="sa-table">
          <thead>
            <tr>
              <th>名前</th>
              <th>スラッグ</th>
              <th>オーナー</th>
              <th>メンバー数</th>
              <th>作成日</th>
              <th>最終アクティビティ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="sa-table-loading">読み込み中...</td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="sa-table-empty">テナントがありません</td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <span className="sa-tenant-name">{tenant.name}</span>
                  </td>
                  <td>
                    <code className="sa-slug">{tenant.slug}</code>
                  </td>
                  <td>{tenant.ownerEmail}</td>
                  <td>
                    <span className="sa-badge">
                      <Users size={14} />
                      {tenant.memberCount}
                    </span>
                  </td>
                  <td>
                    <span className="sa-date">
                      <Calendar size={14} />
                      {formatDate(tenant.createdAt)}
                    </span>
                  </td>
                  <td>
                    <span className="sa-date">
                      <Activity size={14} />
                      {formatDate(tenant.lastActivityAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
