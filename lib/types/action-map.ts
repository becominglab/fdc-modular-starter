/**
 * Action Map（施策管理）の型定義
 * Phase 10: 戦術層の実装
 */

// ActionItem のステータス
export type ActionItemStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';

// ActionItem の優先度
export type ActionItemPriority = 'low' | 'medium' | 'high';

// ActionMap インターフェース
export interface ActionMap {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_period_start?: string;
  target_period_end?: string;
  is_archived: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド（API側で算出）
  progress_rate?: number;
  action_items?: ActionItem[];
}

// ActionItem インターフェース
export interface ActionItem {
  id: string;
  action_map_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  parent_item_id?: string;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
  // 計算フィールド
  progress_rate?: number;
  linked_task_count?: number;
  completed_task_count?: number;
}

// 作成用入力型
export interface CreateActionMapInput {
  title: string;
  description?: string;
  target_period_start?: string;
  target_period_end?: string;
}

export interface CreateActionItemInput {
  action_map_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: ActionItemPriority;
  parent_item_id?: string;
}

// 更新用入力型
export interface UpdateActionMapInput {
  title?: string;
  description?: string;
  target_period_start?: string | null;
  target_period_end?: string | null;
  is_archived?: boolean;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  due_date?: string | null;
  priority?: ActionItemPriority;
  status?: ActionItemStatus;
  sort_order?: number;
}

// ステータス設定
export const ACTION_ITEM_STATUS_CONFIG: Record<ActionItemStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: '未着手', color: '#6b7280', bgColor: '#f3f4f6' },
  in_progress: { label: '進行中', color: '#3b82f6', bgColor: '#dbeafe' },
  blocked: { label: 'ブロック', color: '#ef4444', bgColor: '#fee2e2' },
  done: { label: '完了', color: '#22c55e', bgColor: '#dcfce7' },
};

// 優先度設定
export const ACTION_ITEM_PRIORITY_CONFIG: Record<ActionItemPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: '低', color: '#6b7280', bgColor: '#f3f4f6' },
  medium: { label: '中', color: '#f59e0b', bgColor: '#fef3c7' },
  high: { label: '高', color: '#ef4444', bgColor: '#fee2e2' },
};
