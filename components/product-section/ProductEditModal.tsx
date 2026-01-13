/**
 * components/product-section/ProductEditModal.tsx
 *
 * 商品編集モーダルコンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import type {
  Product,
  ProductTier,
  PriceType,
  DeliveryType,
  ProductCreate,
  ProductUpdate,
} from '@/lib/types/product-section';
import {
  PRODUCT_TIER_INFO,
  PRICE_TYPE_INFO,
  DELIVERY_TYPE_INFO,
} from '@/lib/types/product-section';

interface ProductEditModalProps {
  product?: Product | null;
  tier?: ProductTier;
  onSave: (data: ProductCreate | ProductUpdate) => Promise<boolean>;
  onClose: () => void;
}

export function ProductEditModal({
  product,
  tier,
  onSave,
  onClose,
}: ProductEditModalProps) {
  const isEdit = !!product;
  const initialTier = product?.tier || tier || 'front';

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    tier: initialTier,
    price_type: product?.price_type || 'fixed' as PriceType,
    price_min: product?.price_min?.toString() || '',
    price_max: product?.price_max?.toString() || '',
    price_label: product?.price_label || '',
    delivery_type: product?.delivery_type || 'online' as DeliveryType,
    duration: product?.duration || '',
    features: product?.features || [] as string[],
    target_audience: product?.target_audience || '',
    conversion_goal: product?.conversion_goal || '',
    is_flagship: product?.is_flagship || false,
  });

  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC キーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setForm(prev => ({
      ...prev,
      features: [...prev.features, newFeature.trim()],
    }));
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('商品名を入力してください');
      return;
    }

    setSaving(true);

    const data = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      tier: form.tier as ProductTier,
      price_type: form.price_type,
      price_min: form.price_min ? parseInt(form.price_min) : null,
      price_max: form.price_max ? parseInt(form.price_max) : null,
      price_label: form.price_label.trim() || null,
      delivery_type: form.delivery_type,
      duration: form.duration.trim() || null,
      features: form.features,
      target_audience: form.target_audience.trim() || null,
      conversion_goal: form.conversion_goal.trim() || null,
      is_flagship: form.is_flagship,
    };

    const success = await onSave(data);
    setSaving(false);

    if (success) {
      onClose();
    } else {
      setError('保存に失敗しました');
    }
  };

  const tierInfo = PRODUCT_TIER_INFO[form.tier as ProductTier];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-edit-modal" onClick={e => e.stopPropagation()}>
        <div
          className="modal-header"
          style={{ '--tier-color': tierInfo.color } as React.CSSProperties}
        >
          <h2>{isEdit ? '商品を編集' : '商品を追加'}</h2>
          <button onClick={onClose} className="modal-close" aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {/* 基本情報 */}
          <div className="form-section">
            <h3>基本情報</h3>

            <div className="form-group">
              <label htmlFor="name">商品名 *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="例: 無料相談会"
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">説明</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="商品の概要"
                className="form-textarea"
                rows={3}
              />
            </div>

            {!isEdit && (
              <div className="form-group">
                <label htmlFor="tier">商品層</label>
                <select
                  id="tier"
                  name="tier"
                  value={form.tier}
                  onChange={handleChange}
                  className="form-select"
                >
                  {Object.entries(PRODUCT_TIER_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label} ({info.labelEn})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 価格設定 */}
          <div className="form-section">
            <h3>価格設定</h3>

            <div className="form-group">
              <label htmlFor="price_type">価格タイプ</label>
              <select
                id="price_type"
                name="price_type"
                value={form.price_type}
                onChange={handleChange}
                className="form-select"
              >
                {Object.entries(PRICE_TYPE_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} - {info.description}
                  </option>
                ))}
              </select>
            </div>

            {(form.price_type === 'fixed' || form.price_type === 'range') && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price_min">
                    {form.price_type === 'range' ? '最低価格' : '価格'}
                  </label>
                  <input
                    id="price_min"
                    name="price_min"
                    type="number"
                    value={form.price_min}
                    onChange={handleChange}
                    placeholder="10000"
                    className="form-input"
                  />
                </div>
                {form.price_type === 'range' && (
                  <div className="form-group">
                    <label htmlFor="price_max">最高価格</label>
                    <input
                      id="price_max"
                      name="price_max"
                      type="number"
                      value={form.price_max}
                      onChange={handleChange}
                      placeholder="50000"
                      className="form-input"
                    />
                  </div>
                )}
              </div>
            )}

            {form.price_type === 'custom' && (
              <div className="form-group">
                <label htmlFor="price_label">価格表示</label>
                <input
                  id="price_label"
                  name="price_label"
                  type="text"
                  value={form.price_label}
                  onChange={handleChange}
                  placeholder="例: 要見積もり"
                  className="form-input"
                />
              </div>
            )}
          </div>

          {/* 提供形態 */}
          <div className="form-section">
            <h3>提供形態</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="delivery_type">提供方法</label>
                <select
                  id="delivery_type"
                  name="delivery_type"
                  value={form.delivery_type}
                  onChange={handleChange}
                  className="form-select"
                >
                  {Object.entries(DELIVERY_TYPE_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="duration">所要時間・期間</label>
                <input
                  id="duration"
                  name="duration"
                  type="text"
                  value={form.duration}
                  onChange={handleChange}
                  placeholder="例: 60分、3ヶ月"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* 特徴 */}
          <div className="form-section">
            <h3>特徴・含まれるもの</h3>

            <div className="features-list">
              {form.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="btn-icon btn-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="feature-add">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="特徴を追加"
                className="form-input"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="btn btn-outline"
                disabled={!newFeature.trim()}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* ターゲット */}
          <div className="form-section">
            <h3>ターゲット・目標</h3>

            <div className="form-group">
              <label htmlFor="target_audience">ターゲット顧客</label>
              <input
                id="target_audience"
                name="target_audience"
                type="text"
                value={form.target_audience}
                onChange={handleChange}
                placeholder="例: 起業を考えている会社員"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="conversion_goal">次のステップ（コンバージョン先）</label>
              <input
                id="conversion_goal"
                name="conversion_goal"
                type="text"
                value={form.conversion_goal}
                onChange={handleChange}
                placeholder="例: ミドル商品の購入"
                className="form-input"
              />
            </div>
          </div>

          {/* オプション */}
          <div className="form-section">
            <div className="form-checkbox">
              <input
                id="is_flagship"
                name="is_flagship"
                type="checkbox"
                checked={form.is_flagship}
                onChange={handleChange}
              />
              <label htmlFor="is_flagship">この層の主力商品に設定</label>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            キャンセル
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
