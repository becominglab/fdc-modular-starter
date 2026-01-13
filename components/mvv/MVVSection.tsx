'use client';

/**
 * components/mvv/MVVSection.tsx
 *
 * MVV（Mission/Vision/Value）編集セクション
 */

import { useState } from 'react';
import { Edit, Save, X, Plus, Trash2, Loader2, Target, Eye, Heart } from 'lucide-react';
import type { MVV, MVVUpdate } from '@/lib/types/mvv';
import { MVV_SECTION_INFO } from '@/lib/types/mvv';

interface MVVSectionProps {
  mvv: MVV | null;
  saving: boolean;
  onSave: (data: MVVUpdate) => Promise<boolean>;
  onAddValue: (value: string) => Promise<boolean>;
  onRemoveValue: (index: number) => Promise<boolean>;
  onUpdateValue: (index: number, value: string) => Promise<boolean>;
}

export function MVVSection({
  mvv,
  saving,
  onSave,
  onAddValue,
  onRemoveValue,
  onUpdateValue,
}: MVVSectionProps) {
  const [editingField, setEditingField] = useState<'mission' | 'vision' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState('');

  const handleEditStart = (field: 'mission' | 'vision') => {
    setEditingField(field);
    setEditValue(mvv?.[field] || '');
  };

  const handleEditSave = async () => {
    if (!editingField) return;
    const success = await onSave({ [editingField]: editValue.trim() || null });
    if (success) {
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleAddValue = async () => {
    if (!newValue.trim()) return;
    const success = await onAddValue(newValue.trim());
    if (success) {
      setNewValue('');
    }
  };

  const handleValueEditStart = (index: number) => {
    setEditingValueIndex(index);
    setEditingValueText(mvv?.values[index] || '');
  };

  const handleValueEditSave = async () => {
    if (editingValueIndex === null) return;
    const success = await onUpdateValue(editingValueIndex, editingValueText.trim());
    if (success) {
      setEditingValueIndex(null);
      setEditingValueText('');
    }
  };

  return (
    <div className="mvv-section">
      {/* Mission */}
      <div className="mvv-item">
        <div className="mvv-item-header">
          <div className="mvv-item-icon mission">
            <Target size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.mission.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.mission.labelJa}</span>
          </div>
          {editingField !== 'mission' && (
            <button
              onClick={() => handleEditStart('mission')}
              className="btn-icon"
              disabled={saving}
            >
              <Edit size={16} />
            </button>
          )}
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.mission.description}</p>

        {editingField === 'mission' ? (
          <div className="mvv-edit-form">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={MVV_SECTION_INFO.mission.placeholder}
              className="form-textarea"
              rows={3}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleEditCancel} className="btn btn-secondary" disabled={saving}>
                <X size={14} /> キャンセル
              </button>
              <button onClick={handleEditSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="mvv-item-content">
            {mvv?.mission ? (
              <p className="content-text">{mvv.mission}</p>
            ) : (
              <p className="content-empty">未設定</p>
            )}
          </div>
        )}
      </div>

      {/* Vision */}
      <div className="mvv-item">
        <div className="mvv-item-header">
          <div className="mvv-item-icon vision">
            <Eye size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.vision.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.vision.labelJa}</span>
          </div>
          {editingField !== 'vision' && (
            <button
              onClick={() => handleEditStart('vision')}
              className="btn-icon"
              disabled={saving}
            >
              <Edit size={16} />
            </button>
          )}
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.vision.description}</p>

        {editingField === 'vision' ? (
          <div className="mvv-edit-form">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={MVV_SECTION_INFO.vision.placeholder}
              className="form-textarea"
              rows={3}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleEditCancel} className="btn btn-secondary" disabled={saving}>
                <X size={14} /> キャンセル
              </button>
              <button onClick={handleEditSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="mvv-item-content">
            {mvv?.vision ? (
              <p className="content-text">{mvv.vision}</p>
            ) : (
              <p className="content-empty">未設定</p>
            )}
          </div>
        )}
      </div>

      {/* Values */}
      <div className="mvv-item values">
        <div className="mvv-item-header">
          <div className="mvv-item-icon values">
            <Heart size={20} />
          </div>
          <div className="mvv-item-label">
            <h3>{MVV_SECTION_INFO.values.label}</h3>
            <span className="label-ja">{MVV_SECTION_INFO.values.labelJa}</span>
          </div>
        </div>
        <p className="mvv-item-description">{MVV_SECTION_INFO.values.description}</p>

        <div className="values-list">
          {(mvv?.values || []).map((value, index) => (
            <div key={index} className="value-item">
              {editingValueIndex === index ? (
                <div className="value-edit">
                  <input
                    type="text"
                    value={editingValueText}
                    onChange={(e) => setEditingValueText(e.target.value)}
                    className="form-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleValueEditSave();
                      if (e.key === 'Escape') {
                        setEditingValueIndex(null);
                        setEditingValueText('');
                      }
                    }}
                  />
                  <button
                    onClick={handleValueEditSave}
                    className="btn-icon"
                    disabled={saving}
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingValueIndex(null);
                      setEditingValueText('');
                    }}
                    className="btn-icon"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="value-text">{value}</span>
                  <div className="value-actions">
                    <button
                      onClick={() => handleValueEditStart(index)}
                      className="btn-icon"
                      disabled={saving}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onRemoveValue(index)}
                      className="btn-icon btn-danger"
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="value-add">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={MVV_SECTION_INFO.values.placeholder}
            className="form-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddValue();
            }}
          />
          <button
            onClick={handleAddValue}
            className="btn btn-outline"
            disabled={saving || !newValue.trim()}
          >
            <Plus size={14} /> 追加
          </button>
        </div>

        {/* 例 */}
        <div className="values-examples">
          <span className="examples-label">例:</span>
          {MVV_SECTION_INFO.values.examples.map((example, i) => (
            <button
              key={i}
              onClick={() => setNewValue(example)}
              className="example-chip"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
