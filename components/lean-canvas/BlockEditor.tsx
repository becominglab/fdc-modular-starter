/**
 * components/lean-canvas/BlockEditor.tsx
 *
 * Lean Canvas 個別ブロックエディタ
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, X, Loader2, GripVertical } from 'lucide-react';
import type { LeanCanvasBlockType } from '@/lib/types/lean-canvas';
import { LEAN_CANVAS_BLOCK_INFO } from '@/lib/types/lean-canvas';

interface BlockEditorProps {
  blockType: LeanCanvasBlockType;
  content: string[];
  onUpdate: (content: string[]) => Promise<boolean>;
  saving?: boolean;
  compact?: boolean;
}

export function BlockEditor({
  blockType,
  content,
  onUpdate,
  saving = false,
  compact = false,
}: BlockEditorProps) {
  const info = LEAN_CANVAS_BLOCK_INFO[blockType];
  const [items, setItems] = useState<string[]>(content);
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // contentが外部から変更された場合に同期
  useEffect(() => {
    setItems(content);
  }, [content]);

  // 編集開始時にフォーカス
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingIndex]);

  const handleAdd = useCallback(async () => {
    if (!newItem.trim()) return;
    const updated = [...items, newItem.trim()];
    setItems(updated);
    setNewItem('');
    await onUpdate(updated);
    inputRef.current?.focus();
  }, [items, newItem, onUpdate]);

  const handleRemove = useCallback(async (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    await onUpdate(updated);
  }, [items, onUpdate]);

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  }, [items]);

  const handleEditSave = useCallback(async () => {
    if (editingIndex === null) return;
    if (!editValue.trim()) {
      // 空の場合は削除
      await handleRemove(editingIndex);
    } else {
      const updated = [...items];
      updated[editingIndex] = editValue.trim();
      setItems(updated);
      await onUpdate(updated);
    }
    setEditingIndex(null);
    setEditValue('');
  }, [editingIndex, editValue, items, onUpdate, handleRemove]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditValue('');
    }
  };

  return (
    <div
      className={`lean-canvas-block ${compact ? 'compact' : ''}`}
      style={{ '--block-color': info.color } as React.CSSProperties}
    >
      {/* ヘッダー */}
      <div className="block-header">
        <div className="block-title">
          <span className="block-label">{info.label}</span>
          <span className="block-label-en">{info.labelEn}</span>
        </div>
        {saving && (
          <Loader2 className="block-saving" size={14} />
        )}
      </div>

      {/* 説明 */}
      {!compact && (
        <p className="block-description">{info.description}</p>
      )}

      {/* アイテムリスト */}
      <ul className="block-items">
        {items.map((item, index) => (
          <li key={index} className="block-item">
            <GripVertical className="item-grip" size={12} />
            {editingIndex === index ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                className="item-edit-input"
              />
            ) : (
              <span
                className="item-text"
                onClick={() => handleEdit(index)}
              >
                {item}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="item-remove"
              aria-label="削除"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      {/* 新規追加 */}
      <div className="block-add">
        <input
          ref={inputRef}
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={info.placeholder}
          className="add-input"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="add-button"
          aria-label="追加"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
