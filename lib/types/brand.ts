/**
 * lib/types/brand.ts
 *
 * 10ポイントブランド戦略の型定義
 */

// 10ポイントの種類
export type BrandPointType =
  | 'mission'
  | 'vision'
  | 'target_audience'
  | 'unique_value'
  | 'brand_personality'
  | 'tone_voice'
  | 'visual_identity'
  | 'key_messages'
  | 'competitors'
  | 'differentiators';

// ブランド基本情報
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  tagline?: string | null;
  story?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

// ブランドポイント（10項目）
export interface BrandPoint {
  id: string;
  brand_id: string;
  point_type: BrandPointType;
  content: string;
  created_at: string;
  updated_at: string;
}

// ブランド作成用
export interface BrandCreate {
  name: string;
  tagline?: string;
  story?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

// ブランド更新用
export interface BrandUpdate {
  name?: string;
  tagline?: string | null;
  story?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
}

// ポイント更新用
export interface BrandPointUpdate {
  content: string;
}

// 10ポイントの表示情報
export const BRAND_POINT_INFO: Record<BrandPointType, {
  label: string;
  labelEn: string;
  description: string;
  placeholder: string;
  icon: string;
  order: number;
}> = {
  mission: {
    label: 'ミッション',
    labelEn: 'Mission',
    description: 'ブランドの存在意義・使命',
    placeholder: '私たちは〇〇を通じて、△△を実現します',
    icon: 'Target',
    order: 1,
  },
  vision: {
    label: 'ビジョン',
    labelEn: 'Vision',
    description: '目指す未来像',
    placeholder: '〇〇年後、私たちは△△な世界を創ります',
    icon: 'Eye',
    order: 2,
  },
  target_audience: {
    label: 'ターゲット',
    labelEn: 'Target Audience',
    description: '誰のためのブランドか',
    placeholder: '〇〇に悩む△△な人々',
    icon: 'Users',
    order: 3,
  },
  unique_value: {
    label: '独自価値',
    labelEn: 'Unique Value',
    description: '提供する独自の価値',
    placeholder: '私たちだけが提供できる〇〇',
    icon: 'Gem',
    order: 4,
  },
  brand_personality: {
    label: 'ブランド人格',
    labelEn: 'Brand Personality',
    description: 'ブランドの人格・性格',
    placeholder: '信頼できる、革新的、親しみやすい...',
    icon: 'Heart',
    order: 5,
  },
  tone_voice: {
    label: 'トーン&ボイス',
    labelEn: 'Tone & Voice',
    description: 'コミュニケーションの調子',
    placeholder: 'フレンドリーだが専門的、簡潔で明確...',
    icon: 'MessageCircle',
    order: 6,
  },
  visual_identity: {
    label: 'ビジュアル',
    labelEn: 'Visual Identity',
    description: '視覚的な表現ルール',
    placeholder: 'ミニマル、モダン、温かみのある配色...',
    icon: 'Palette',
    order: 7,
  },
  key_messages: {
    label: 'キーメッセージ',
    labelEn: 'Key Messages',
    description: '伝えるべき核心メッセージ',
    placeholder: '常に伝えたい3つのメッセージ',
    icon: 'MessageSquare',
    order: 8,
  },
  competitors: {
    label: '競合分析',
    labelEn: 'Competitors',
    description: '競合との位置づけ',
    placeholder: '主要競合と私たちの違い',
    icon: 'Swords',
    order: 9,
  },
  differentiators: {
    label: '差別化',
    labelEn: 'Differentiators',
    description: '明確な差別化ポイント',
    placeholder: '競合にはない私たちだけの強み',
    icon: 'Trophy',
    order: 10,
  },
};

// ポイントタイプの配列（表示順）
export const BRAND_POINT_TYPES: BrandPointType[] = [
  'mission',
  'vision',
  'target_audience',
  'unique_value',
  'brand_personality',
  'tone_voice',
  'visual_identity',
  'key_messages',
  'competitors',
  'differentiators',
];
