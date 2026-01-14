/**
 * lib/types/business-plan.ts
 *
 * ビジネスプラン統合ダッシュボードの型定義
 */

import type { Brand } from './brand';
import type { LeanCanvas, LeanCanvasBlock } from './lean-canvas';
import type { ProductSection, Product } from './product-section';

// 完成度計算結果
export interface CompletionStatus {
  percentage: number;
  completed: number;
  total: number;
  items: CompletionItem[];
}

export interface CompletionItem {
  category: 'brand' | 'lean-canvas' | 'products';
  field: string;
  label: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// 収益シミュレーション
export interface RevenueSimulation {
  monthly: number;
  annual: number;
  breakdown: {
    tier: 'front' | 'middle' | 'back';
    productCount: number;
    averagePrice: number;
    estimatedSales: number;
    subtotal: number;
  }[];
}

// 統合ビジネスプラン
export interface BusinessPlanOverview {
  brand: Brand | null;
  leanCanvas: (LeanCanvas & { blocks: LeanCanvasBlock[] }) | null;
  productSection: (ProductSection & { products: Product[] }) | null;
  completion: CompletionStatus;
  revenue: RevenueSimulation | null;
  actionItems: ActionItem[];
}

// アクションアイテム
export interface ActionItem {
  id: string;
  type: 'brand' | 'lean-canvas' | 'products';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
}

// 完成度計算用の設定
export const COMPLETION_WEIGHTS = {
  brand: {
    name: { weight: 10, label: 'ブランド名', priority: 'high' as const },
    tagline: { weight: 8, label: 'タグライン', priority: 'medium' as const },
    story: { weight: 5, label: 'ブランドストーリー', priority: 'low' as const },
    logo_url: { weight: 3, label: 'ロゴ', priority: 'low' as const },
  },
  leanCanvas: {
    problem: { weight: 10, label: '課題', priority: 'high' as const },
    'customer-segments': { weight: 10, label: '顧客セグメント', priority: 'high' as const },
    'unique-value': { weight: 10, label: '独自の価値提案', priority: 'high' as const },
    solution: { weight: 8, label: '解決策', priority: 'high' as const },
    channels: { weight: 6, label: 'チャネル', priority: 'medium' as const },
    'revenue-streams': { weight: 8, label: '収益の流れ', priority: 'high' as const },
    'cost-structure': { weight: 6, label: 'コスト構造', priority: 'medium' as const },
    'key-metrics': { weight: 5, label: '主要指標', priority: 'medium' as const },
    'unfair-advantage': { weight: 4, label: '圧倒的な優位性', priority: 'low' as const },
  },
  products: {
    front: { weight: 10, label: 'フロント商品', priority: 'high' as const },
    middle: { weight: 8, label: 'ミドル商品', priority: 'medium' as const },
    back: { weight: 10, label: 'バック商品', priority: 'high' as const },
  },
};

// 収益シミュレーション用のデフォルト値
export const REVENUE_DEFAULTS = {
  front: { salesPerMonth: 20, conversionRate: 0.3 },
  middle: { salesPerMonth: 6, conversionRate: 0.5 },
  back: { salesPerMonth: 3, conversionRate: 1.0 },
};
