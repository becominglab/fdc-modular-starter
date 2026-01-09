'use client';

import { useState } from 'react';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { useObjectives } from '@/lib/hooks/useObjectives';
import { ObjectiveCard } from '@/components/okr/ObjectiveCard';
import { AddObjectiveForm } from '@/components/okr/AddObjectiveForm';

export default function OKRPage() {
  const { objectives, isLoading, error, addObjective, deleteObjective } = useObjectives();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">エラー: {error.message}</div>;
  }

  // 全体進捗を計算
  const totalProgress = objectives.length > 0
    ? Math.round(objectives.reduce((sum, o) => sum + (o.progress_rate || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-blue-600" />
            OKR
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            目標と成果指標を管理
          </p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Objective を追加
        </button>
      </div>

      {/* 全体進捗 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">全体進捗</p>
            <p className="text-4xl font-bold">{totalProgress}%</p>
          </div>
          <TrendingUp size={48} className="text-blue-200" />
        </div>
        <div className="mt-4 bg-blue-400/30 rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Objective 一覧 */}
      {objectives.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Objective がまだありません</p>
          <button
            onClick={() => setIsAddFormOpen(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            最初の Objective を作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onDelete={deleteObjective}
            />
          ))}
        </div>
      )}

      {/* 追加フォーム */}
      <AddObjectiveForm
        isOpen={isAddFormOpen}
        onAdd={addObjective}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
