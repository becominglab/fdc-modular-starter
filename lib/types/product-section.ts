/**
 * lib/types/product-section.ts
 *
 * 製品セクション（フロント/ミドル/バック）の型定義
 */

// 商品層
export type ProductTier = 'front' | 'middle' | 'back';

// 価格タイプ
export type PriceType = 'free' | 'fixed' | 'range' | 'custom';

// 提供形態
export type DeliveryType = 'online' | 'offline' | 'hybrid';

// 製品セクション
export interface ProductSection {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// 商品
export interface Product {
  id: string;
  section_id: string;
  tier: ProductTier;
  name: string;
  description?: string | null;
  price_type: PriceType;
  price_min?: number | null;
  price_max?: number | null;
  price_label?: string | null;
  delivery_type: DeliveryType;
  duration?: string | null;
  features: string[];
  target_audience?: string | null;
  conversion_goal?: string | null;
  sort_order: number;
  is_flagship: boolean;
  created_at: string;
  updated_at: string;
}

// セクション作成用
export interface ProductSectionCreate {
  brand_id: string;
  title?: string;
  description?: string;
}

// セクション更新用
export interface ProductSectionUpdate {
  title?: string;
  description?: string | null;
}

// 商品作成用（section_id は API の URL パスから取得）
export interface ProductCreate {
  tier: ProductTier;
  name: string;
  description?: string | null;
  price_type?: PriceType;
  price_min?: number | null;
  price_max?: number | null;
  price_label?: string | null;
  delivery_type?: DeliveryType;
  duration?: string | null;
  features?: string[];
  target_audience?: string | null;
  conversion_goal?: string | null;
  is_flagship?: boolean;
}

// 商品更新用
export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price_type?: PriceType;
  price_min?: number | null;
  price_max?: number | null;
  price_label?: string | null;
  delivery_type?: DeliveryType;
  duration?: string | null;
  features?: string[];
  target_audience?: string | null;
  conversion_goal?: string | null;
  sort_order?: number;
  is_flagship?: boolean;
}

// 層ごとの表示情報
export const PRODUCT_TIER_INFO: Record<ProductTier, {
  label: string;
  labelEn: string;
  description: string;
  purpose: string;
  priceRange: string;
  examples: string[];
  color: string;
}> = {
  front: {
    label: 'フロント商品',
    labelEn: 'Front-end',
    description: '集客・認知獲得のための商品',
    purpose: '見込み客を集める',
    priceRange: '無料〜低価格',
    examples: ['無料セミナー', 'お試し相談', 'サンプル', '無料コンテンツ'],
    color: '#3b82f6',
  },
  middle: {
    label: 'ミドル商品',
    labelEn: 'Middle-end',
    description: '信頼構築・関係性構築のための商品',
    purpose: '信頼を築く',
    priceRange: '中価格帯',
    examples: ['単発コンサル', 'ワークショップ', 'エントリー講座'],
    color: '#8b5cf6',
  },
  back: {
    label: 'バック商品',
    labelEn: 'Back-end',
    description: '収益の柱となる主力商品',
    purpose: '収益を上げる',
    priceRange: '高価格帯',
    examples: ['年間コンサル', '継続サービス', 'プレミアムプラン'],
    color: '#f59e0b',
  },
};

// 価格タイプの表示情報
export const PRICE_TYPE_INFO: Record<PriceType, {
  label: string;
  description: string;
}> = {
  free: { label: '無料', description: '無料で提供' },
  fixed: { label: '固定価格', description: '決まった価格' },
  range: { label: '価格帯', description: '最低〜最高の範囲' },
  custom: { label: '要相談', description: 'カスタム見積もり' },
};

// 提供形態の表示情報
export const DELIVERY_TYPE_INFO: Record<DeliveryType, {
  label: string;
  description: string;
}> = {
  online: { label: 'オンライン', description: 'オンラインで提供' },
  offline: { label: 'オフライン', description: '対面で提供' },
  hybrid: { label: 'ハイブリッド', description: 'オンライン+対面' },
};

// 層の順序
export const PRODUCT_TIERS: ProductTier[] = ['front', 'middle', 'back'];
