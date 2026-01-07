/**
 * lib/types/approach.ts
 *
 * アプローチ（接触履歴）の型定義
 */

// アプローチタイプ
export type ApproachType = 'call' | 'email' | 'meeting' | 'visit' | 'other';

// アプローチ結果ステータス
export type ApproachResultStatus = 'success' | 'pending' | 'failed';

// アプローチタイプのラベル
export const APPROACH_TYPE_LABELS: Record<ApproachType, string> = {
  call: '電話',
  email: 'メール',
  meeting: '会議',
  visit: '訪問',
  other: 'その他',
};

// 結果ステータスのラベル
export const RESULT_STATUS_LABELS: Record<ApproachResultStatus, string> = {
  success: '成功',
  pending: '保留',
  failed: '失敗',
};

// アプローチ型
export interface Approach {
  id: string;
  prospect_id: string;
  user_id: string;
  type: ApproachType;
  content: string;
  result: string | null;
  result_status: ApproachResultStatus | null;
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
  result_status?: ApproachResultStatus;
  approached_at?: string;
}

// アプローチ更新入力
export interface UpdateApproachInput {
  type?: ApproachType;
  content?: string;
  result?: string;
  result_status?: ApproachResultStatus;
  approached_at?: string;
}

// 目標期間タイプ
export type GoalPeriod = 'weekly' | 'monthly';

// アプローチ目標
export interface ApproachGoal {
  id: string;
  user_id: string;
  period: GoalPeriod;
  target_count: number;
  year: number;
  week_or_month: number; // 週番号 or 月番号
  created_at: string;
  updated_at: string;
}

// 目標作成入力
export interface CreateGoalInput {
  period: GoalPeriod;
  target_count: number;
  year?: number;
  week_or_month?: number;
}

// 目標更新入力
export interface UpdateGoalInput {
  target_count: number;
}

// アプローチ統計（PDCA対応版）
export interface ApproachStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  byType: Record<ApproachType, number>;
  // 成功率
  successRate: number;
  byResultStatus: Record<ApproachResultStatus, number>;
  // 目標達成率
  weeklyGoal: number | null;
  monthlyGoal: number | null;
  weeklyAchievementRate: number | null;
  monthlyAchievementRate: number | null;
}
