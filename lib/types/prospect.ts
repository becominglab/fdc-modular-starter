/**
 * リードステータスの型
 */
export type ProspectStatus =
  | 'new'
  | 'approaching'
  | 'negotiating'
  | 'proposing'
  | 'won'
  | 'lost';

/**
 * リードの型
 */
export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * リード作成の入力型
 */
export interface CreateProspectInput {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  status?: ProspectStatus;
  notes?: string;
}

/**
 * リード更新の入力型
 */
export interface UpdateProspectInput {
  name?: string;
  company?: string;
  email?: string | null;
  phone?: string | null;
  status?: ProspectStatus;
  notes?: string | null;
}

/**
 * ステータスの表示情報
 */
export const PROSPECT_STATUS_CONFIG = {
  new: {
    label: '新規',
    color: 'bg-gray-100 text-gray-800',
    kanbanColor: 'bg-gray-50 border-gray-200',
  },
  approaching: {
    label: 'アプローチ中',
    color: 'bg-blue-100 text-blue-800',
    kanbanColor: 'bg-blue-50 border-blue-200',
  },
  negotiating: {
    label: '商談中',
    color: 'bg-yellow-100 text-yellow-800',
    kanbanColor: 'bg-yellow-50 border-yellow-200',
  },
  proposing: {
    label: '提案中',
    color: 'bg-purple-100 text-purple-800',
    kanbanColor: 'bg-purple-50 border-purple-200',
  },
  won: {
    label: '成約',
    color: 'bg-green-100 text-green-800',
    kanbanColor: 'bg-green-50 border-green-200',
  },
  lost: {
    label: '失注',
    color: 'bg-red-100 text-red-800',
    kanbanColor: 'bg-red-50 border-red-200',
  },
} as const;

/**
 * カンバン表示用のステータス順序（won/lostは除外）
 */
export const KANBAN_STATUSES: ProspectStatus[] = [
  'new',
  'approaching',
  'negotiating',
  'proposing',
];

/**
 * 全ステータス
 */
export const ALL_STATUSES: ProspectStatus[] = [
  'new',
  'approaching',
  'negotiating',
  'proposing',
  'won',
  'lost',
];
