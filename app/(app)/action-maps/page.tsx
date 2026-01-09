'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { useActionMaps } from '@/lib/hooks/useActionMaps';
import { useActionItems } from '@/lib/hooks/useActionItems';
import { ActionMapList } from '@/components/action-map/ActionMapList';
import { ActionItemList } from '@/components/action-map/ActionItemList';
import { AddActionMapForm } from '@/components/action-map/AddActionMapForm';
import type { ActionMap, ActionItem } from '@/lib/types/action-map';

export default function ActionMapsPage() {
  const { actionMaps, isLoading, createActionMap, updateActionMap, deleteActionMap, archiveActionMap } = useActionMaps();
  const [selectedMap, setSelectedMap] = useState<ActionMap | null>(null);
  const { actionItems, createActionItem, updateStatus } = useActionItems(selectedMap?.id || null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const handleCreateMap = async (input: { title: string; description?: string; key_result_id?: string }) => {
    const newMap = await createActionMap(input);
    setSelectedMap(newMap);
    return newMap;
  };

  const handleEditMap = async (map: ActionMap) => {
    const title = prompt('新しいタイトル', map.title);
    if (title && title !== map.title) {
      await updateActionMap(map.id, { title });
    }
  };

  const handleAddItem = async () => {
    const title = prompt('ActionItemのタイトルを入力');
    if (title) {
      await createActionItem({ title });
    }
  };

  const handleSelectItem = (item: ActionItem) => {
    alert(`ActionItem: ${item.title}\n進捗: ${item.progress_rate || 0}%\nタスク: ${item.completed_task_count || 0}/${item.linked_task_count || 0}`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Map size={28} color="#667eea" />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          Action Map
        </h1>
      </div>

      {/* 2カラムレイアウト */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* 左: ActionMap リスト */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}>
          <ActionMapList
            actionMaps={actionMaps}
            onSelect={setSelectedMap}
            onCreate={() => setIsAddFormOpen(true)}
            onEdit={handleEditMap}
            onArchive={archiveActionMap}
            onDelete={deleteActionMap}
            selectedId={selectedMap?.id}
          />
        </div>

        {/* 右: ActionItems */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          minHeight: '400px',
        }}>
          {selectedMap ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  {selectedMap.title}
                </h2>
                {selectedMap.description && (
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                    {selectedMap.description}
                  </p>
                )}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    全体進捗
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${selectedMap.progress_rate || 0}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {selectedMap.progress_rate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              <ActionItemList
                items={actionItems}
                onAdd={handleAddItem}
                onStatusChange={updateStatus}
                onSelect={handleSelectItem}
              />
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#9ca3af',
            }}>
              <Map size={48} strokeWidth={1} />
              <p style={{ marginTop: '12px' }}>
                ActionMapを選択してください
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 追加フォーム */}
      <AddActionMapForm
        isOpen={isAddFormOpen}
        onAdd={handleCreateMap}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
