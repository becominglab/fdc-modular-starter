'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Calendar } from 'lucide-react';
import type { Prospect } from '@/lib/types/prospect';

export default function LostLeadsPage() {
  const [lostProspects, setLostProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLostProspects() {
      try {
        const response = await fetch('/api/prospects?status=lost');
        if (!response.ok) {
          throw new Error('失注リードの取得に失敗しました');
        }
        const data = await response.json();
        setLostProspects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLostProspects();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラー: {error}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">失注リード</h1>
          <p className="text-sm text-gray-500">失注した案件の分析・振り返り用</p>
        </div>
      </div>

      {/* 統計 */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
        <p className="text-sm text-red-600">失注件数</p>
        <p className="text-3xl font-bold text-red-700">{lostProspects.length}</p>
      </div>

      {/* リスト */}
      {lostProspects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          失注リードはありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">名前</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">会社</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">失注日</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">メモ</th>
              </tr>
            </thead>
            <tbody>
              {lostProspects.map((prospect) => (
                <tr key={prospect.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {prospect.name}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building2 size={14} />
                      <span>{prospect.company}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar size={14} />
                      <span>{formatDate(prospect.updated_at)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {prospect.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
