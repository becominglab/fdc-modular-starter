/**
 * lib/utils/audit-log.ts
 *
 * アクティビティログ（監査ログ）記録ユーティリティ
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';

export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'convert';

export type ResourceType =
  | 'task'
  | 'prospect'
  | 'client'
  | 'objective'
  | 'key_result'
  | 'workspace'
  | 'member'
  | 'invitation';

interface AuditLogParams {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * ユーザーの最初のワークスペースIDを取得する
 * サービスクライアントを使用してRLSをバイパス
 */
export async function getUserWorkspaceId(
  userId: string
): Promise<string | null> {
  try {
    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (serviceClient as any)
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    return data?.workspace_id || null;
  } catch {
    return null;
  }
}

/**
 * アクティビティログを記録する
 * サービスクライアントを使用してRLSをバイパス
 * エラーが発生しても例外をスローしない（ログ記録の失敗で本処理を止めない）
 */
export async function logActivity({
  workspaceId,
  userId,
  action,
  resourceType,
  resourceId = null,
  details = {},
}: Omit<AuditLogParams, 'supabase'>): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient as any).from('audit_logs').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
    if (error) {
      console.warn('Failed to log activity:', error);
    }
  } catch (error) {
    // ログ記録の失敗は警告のみ（本処理を止めない）
    console.warn('Failed to log activity:', error);
  }
}

/**
 * ユーザーのワークスペースを取得してアクティビティログを記録する
 * workspaceIdが不明な場合に使用
 */
export async function logActivityForUser({
  userId,
  action,
  resourceType,
  resourceId = null,
  details = {},
}: Omit<AuditLogParams, 'workspaceId' | 'supabase'>): Promise<void> {
  const workspaceId = await getUserWorkspaceId(userId);
  if (!workspaceId) {
    // ワークスペースがない場合はログをスキップ
    console.warn('No workspace found for user:', userId);
    return;
  }
  await logActivity({
    workspaceId,
    userId,
    action,
    resourceType,
    resourceId,
    details,
  });
}
