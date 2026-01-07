'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, Plus, Calendar } from 'lucide-react';
import { useApproaches } from '@/lib/hooks/useApproaches';
import { ApproachTimeline, AddApproachForm, ApproachStatsCard, PDCADashboard } from '@/components/approaches';
import type { Prospect } from '@/lib/types/prospect';

type Params = Promise<{ prospectId: string }>;

export default function ProspectDetailPage({ params }: { params: Params }) {
  const { prospectId } = use(params);
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const {
    approaches,
    stats,
    isLoading: approachesLoading,
    addApproach,
    deleteApproach,
    setGoal,
  } = useApproaches({ prospectId });

  // リード情報取得
  useEffect(() => {
    async function fetchProspect() {
      try {
        const response = await fetch(`/api/prospects/${prospectId}`);
        if (!response.ok) {
          throw new Error('リードの取得に失敗しました');
        }
        const data = await response.json();
        setProspect(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProspect();
  }, [prospectId]);

  const handleDelete = async (id: string) => {
    if (confirm('このアプローチを削除しますか？')) {
      await deleteApproach(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="p-8 text-center text-red-500">
        {error || 'リードが見つかりません'}
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{prospect.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {prospect.company}
            </span>
            {prospect.email && (
              <span className="flex items-center gap-1">
                <Mail size={14} />
                {prospect.email}
              </span>
            )}
            {prospect.phone && (
              <span className="flex items-center gap-1">
                <Phone size={14} />
                {prospect.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PDCA・統計カード（横並び） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PDCADashboard stats={stats} onSetGoal={setGoal} />
        <ApproachStatsCard stats={stats} />
      </div>

      {/* アプローチ履歴 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={20} />
            アプローチ履歴
          </h2>
          <button
            onClick={() => setIsAddFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            記録する
          </button>
        </div>

        {approachesLoading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : (
          <ApproachTimeline
            approaches={approaches}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* アプローチ追加フォーム */}
      <AddApproachForm
        prospectId={prospectId}
        isOpen={isAddFormOpen}
        onAdd={addApproach}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
