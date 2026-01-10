/**
 * lib/types/lean-canvas.ts
 *
 * Lean Canvas（リーンキャンバス）の型定義
 */

// 9ブロックの種類
export type LeanCanvasBlockType =
  | 'problem'
  | 'solution'
  | 'unique_value'
  | 'unfair_advantage'
  | 'customer_segments'
  | 'key_metrics'
  | 'channels'
  | 'cost_structure'
  | 'revenue_streams';

// Lean Canvas 基本情報
export interface LeanCanvas {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// Lean Canvas ブロック
export interface LeanCanvasBlock {
  id: string;
  canvas_id: string;
  block_type: LeanCanvasBlockType;
  content: string[];  // 箇条書きリスト
  created_at: string;
  updated_at: string;
}

// キャンバス作成用
export interface LeanCanvasCreate {
  brand_id: string;
  title?: string;
  description?: string;
}

// キャンバス更新用
export interface LeanCanvasUpdate {
  title?: string;
  description?: string | null;
}

// ブロック更新用
export interface LeanCanvasBlockUpdate {
  content: string[];
}

// 9ブロックの表示情報
export const LEAN_CANVAS_BLOCK_INFO: Record<LeanCanvasBlockType, {
  label: string;
  labelEn: string;
  description: string;
  placeholder: string;
  gridArea: string;
  color: string;
  order: number;
}> = {
  problem: {
    label: '課題',
    labelEn: 'Problem',
    description: '顧客が抱える上位3つの課題',
    placeholder: '例: 情報が分散している、時間がかかる...',
    gridArea: 'problem',
    color: '#ef4444',
    order: 1,
  },
  solution: {
    label: '解決策',
    labelEn: 'Solution',
    description: '各課題に対する解決策',
    placeholder: '例: 一元管理システム、自動化...',
    gridArea: 'solution',
    color: '#3b82f6',
    order: 2,
  },
  unique_value: {
    label: '独自の価値提案',
    labelEn: 'Unique Value Proposition',
    description: '他にはない独自の価値',
    placeholder: '例: シンプルで直感的なUI...',
    gridArea: 'unique-value',
    color: '#8b5cf6',
    order: 3,
  },
  unfair_advantage: {
    label: '圧倒的な優位性',
    labelEn: 'Unfair Advantage',
    description: '簡単に真似できない強み',
    placeholder: '例: 独自の技術、専門知識...',
    gridArea: 'unfair-advantage',
    color: '#f59e0b',
    order: 4,
  },
  customer_segments: {
    label: '顧客セグメント',
    labelEn: 'Customer Segments',
    description: 'ターゲット顧客',
    placeholder: '例: スタートアップ創業者、SMB...',
    gridArea: 'customer-segments',
    color: '#10b981',
    order: 5,
  },
  key_metrics: {
    label: '主要指標',
    labelEn: 'Key Metrics',
    description: '成功を測る指標',
    placeholder: '例: MAU、コンバージョン率...',
    gridArea: 'key-metrics',
    color: '#6366f1',
    order: 6,
  },
  channels: {
    label: 'チャネル',
    labelEn: 'Channels',
    description: '顧客にリーチする方法',
    placeholder: '例: SNS、口コミ、広告...',
    gridArea: 'channels',
    color: '#ec4899',
    order: 7,
  },
  cost_structure: {
    label: 'コスト構造',
    labelEn: 'Cost Structure',
    description: '主要なコスト項目',
    placeholder: '例: 人件費、サーバー費用...',
    gridArea: 'cost-structure',
    color: '#64748b',
    order: 8,
  },
  revenue_streams: {
    label: '収益の流れ',
    labelEn: 'Revenue Streams',
    description: '収益源',
    placeholder: '例: サブスク、従量課金...',
    gridArea: 'revenue-streams',
    color: '#22c55e',
    order: 9,
  },
};

// ブロックタイプの配列（表示順）
export const LEAN_CANVAS_BLOCK_TYPES: LeanCanvasBlockType[] = [
  'problem',
  'customer_segments',
  'unique_value',
  'solution',
  'unfair_advantage',
  'key_metrics',
  'channels',
  'cost_structure',
  'revenue_streams',
];

// グリッドレイアウト用の順序（左上から右下）
export const LEAN_CANVAS_GRID_ORDER: LeanCanvasBlockType[] = [
  'problem',
  'solution',
  'unique_value',
  'unfair_advantage',
  'customer_segments',
  'key_metrics',
  'channels',
  'cost_structure',
  'revenue_streams',
];
