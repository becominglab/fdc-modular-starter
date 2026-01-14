/**
 * lib/types/activity.ts
 *
 * アクティビティログ関連の型定義
 */

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'invite'
  | 'accept'
  | 'reject'
  | 'login'
  | 'logout';

export type ActivityResource =
  | 'task'
  | 'prospect'
  | 'client'
  | 'brand'
  | 'objective'
  | 'key_result'
  | 'invitation'
  | 'member'
  | 'workspace';

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: ActivityAction;
  resource_type: ActivityResource;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface ActivityFilters {
  action?: ActivityAction;
  resource_type?: ActivityResource;
  user_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface ActivityResponse {
  logs: ActivityLog[];
  hasMore: boolean;
  nextCursor: string | null;
}
