/**
 * タスクの型定義
 * Phase 9: アイゼンハワーマトリクス（4象限）対応
 */

// Suit（4象限）
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

// タスクステータス
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

// Task インターフェース
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  suit?: Suit;              // undefined = joker/未分類
  scheduled_date?: string;  // YYYY-MM-DD形式
  user_id: string;
  workspace_id?: string;
  action_item_id?: string;  // Phase 10: ActionItem との紐付け
  google_event_id?: string; // Phase 14: Google Calendar イベントID
  created_at: string;
  updated_at: string;
}

// 作成用入力型
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  suit?: Suit;
  scheduled_date?: string;
  action_item_id?: string;
  google_event_id?: string; // Phase 14: Google Calendar イベントID
}

// 更新用入力型
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  suit?: Suit | null;
  scheduled_date?: string | null;
  action_item_id?: string | null;
}

// Suit設定
export const SUIT_CONFIG: Record<Suit, { label: string; emoji: string; color: string; bgColor: string; description: string }> = {
  spade: {
    label: 'スペード',
    emoji: '♠',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    bgColor: 'bg-gradient-to-r from-slate-200 to-slate-100',
    description: '緊急かつ重要：今すぐやる',
  },
  heart: {
    label: 'ハート',
    emoji: '♥',
    color: 'bg-red-50 text-red-800 border-red-300',
    bgColor: 'bg-gradient-to-r from-red-100 to-red-50',
    description: '重要だが緊急ではない：習慣化',
  },
  diamond: {
    label: 'ダイヤ',
    emoji: '♦',
    color: 'bg-blue-50 text-blue-800 border-blue-300',
    bgColor: 'bg-gradient-to-r from-blue-100 to-blue-50',
    description: '緊急だが重要ではない：委任・効率化',
  },
  club: {
    label: 'クラブ',
    emoji: '♣',
    color: 'bg-green-50 text-green-800 border-green-300',
    bgColor: 'bg-gradient-to-r from-green-100 to-green-50',
    description: '緊急でも重要でもない：20%タイム',
  },
};

// ステータス設定
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  not_started: { label: '未着手', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  done: { label: '完了', color: 'bg-green-100 text-green-700' },
};

// Suit配列（表示順）
export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];

// フィルター種別（互換性のため残す）
export type TaskFilter = 'all' | 'pending' | 'completed';

// ソート種別
export type TaskSort = 'created_at' | 'updated_at';

// ソート順
export type SortOrder = 'asc' | 'desc';
