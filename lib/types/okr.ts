/**
 * OKR（目標管理）の型定義
 * Phase 11: FDC 3層アーキテクチャの戦略層
 */

// Objective（目標）
export interface Objective {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  period: string;  // 'Q1 2025', '2025年上期' など
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;  // KRの平均進捗
  key_result_count?: number;
}

// Key Result（成果指標）
export interface KeyResult {
  id: string;
  objective_id: string;
  user_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;  // '%', '円', '件', '人' など
  sort_order: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;  // (current_value / target_value) * 100
  action_map_count?: number;
}

// 作成用入力型
export interface CreateObjectiveInput {
  title: string;
  description?: string;
  period: string;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string;
  period?: string;
  is_archived?: boolean;
}

export interface CreateKeyResultInput {
  objective_id: string;
  title: string;
  target_value: number;
  current_value?: number;
  unit: string;
}

export interface UpdateKeyResultInput {
  title?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
}

// 期間オプション
export const PERIOD_OPTIONS = [
  { value: 'Q1 2026', label: 'Q1 2026（1-3月）' },
  { value: 'Q2 2026', label: 'Q2 2026（4-6月）' },
  { value: 'Q3 2026', label: 'Q3 2026（7-9月）' },
  { value: 'Q4 2026', label: 'Q4 2026（10-12月）' },
  { value: '2026年上期', label: '2026年上期' },
  { value: '2026年下期', label: '2026年下期' },
  { value: '2026年通期', label: '2026年通期' },
];

// 単位オプション
export const UNIT_OPTIONS = [
  { value: '%', label: '%（パーセント）' },
  { value: '円', label: '円' },
  { value: '万円', label: '万円' },
  { value: '件', label: '件' },
  { value: '人', label: '人' },
  { value: '回', label: '回' },
  { value: 'pt', label: 'ポイント' },
];
