/**
 * lib/types/approach.ts
 *
 * アプローチ（接触履歴）の型定義
 */

// アプローチタイプ
export type ApproachType = 'call' | 'email' | 'meeting' | 'visit' | 'other';

// アプローチタイプのラベル
export const APPROACH_TYPE_LABELS: Record<ApproachType, string> = {
  call: '電話',
  email: 'メール',
  meeting: '会議',
  visit: '訪問',
  other: 'その他',
};

// アプローチ型
export interface Approach {
  id: string;
  prospect_id: string;
  user_id: string;
  type: ApproachType;
  content: string;
  result: string | null;
  approached_at: string;
  created_at: string;
  updated_at: string;
}

// アプローチ作成入力
export interface CreateApproachInput {
  prospect_id: string;
  type: ApproachType;
  content: string;
  result?: string;
  approached_at?: string;
}

// アプローチ更新入力
export interface UpdateApproachInput {
  type?: ApproachType;
  content?: string;
  result?: string;
  approached_at?: string;
}

// アプローチ統計
export interface ApproachStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  byType: Record<ApproachType, number>;
}
