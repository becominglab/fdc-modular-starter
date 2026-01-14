/**
 * lib/types/admin.ts
 *
 * ワークスペース管理者機能の型定義
 */

// ワークスペースロール
export type WorkspaceRole = 'owner' | 'admin' | 'member';

// 招待
export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expires_at: string;
  created_by: string;
  accepted_at: string | null;
  created_at: string;
}

// 招待作成用
export interface InvitationCreate {
  workspace_id: string;
  email: string;
  role?: 'admin' | 'member';
}

// 監査ログアクション
export type AuditAction =
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'role_changed'
  | 'member_removed'
  | 'workspace_updated'
  | 'workspace_deleted';

// 監査ログ
export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: AuditAction | string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// メンバー（workspace_members + users 情報）
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// ロール変更用
export interface RoleChangeRequest {
  member_id: string;
  new_role: WorkspaceRole;
}

// ロール表示情報
export const ROLE_INFO: Record<WorkspaceRole, {
  label: string;
  labelEn: string;
  description: string;
  color: string;
  canManageMembers: boolean;
  canDeleteWorkspace: boolean;
}> = {
  owner: {
    label: 'オーナー',
    labelEn: 'Owner',
    description: '全権限を持つワークスペースの所有者',
    color: '#f59e0b',
    canManageMembers: true,
    canDeleteWorkspace: true,
  },
  admin: {
    label: '管理者',
    labelEn: 'Admin',
    description: 'メンバー管理が可能な管理者',
    color: '#8b5cf6',
    canManageMembers: true,
    canDeleteWorkspace: false,
  },
  member: {
    label: 'メンバー',
    labelEn: 'Member',
    description: '通常のメンバー',
    color: '#6b7280',
    canManageMembers: false,
    canDeleteWorkspace: false,
  },
};

// 監査ログアクション表示情報
export const AUDIT_ACTION_INFO: Record<string, {
  label: string;
  icon: string;
}> = {
  invite_sent: { label: '招待を送信', icon: 'mail' },
  invite_accepted: { label: '招待を承諾', icon: 'check' },
  invite_revoked: { label: '招待を取り消し', icon: 'x' },
  role_changed: { label: 'ロールを変更', icon: 'shield' },
  member_removed: { label: 'メンバーを削除', icon: 'user-minus' },
  workspace_updated: { label: 'ワークスペースを更新', icon: 'edit' },
  workspace_deleted: { label: 'ワークスペースを削除', icon: 'trash' },
};

// 権限チェックヘルパー
export function canManageRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  // OWNER は全てのロールを管理可能
  if (actorRole === 'owner') return true;
  // ADMIN は MEMBER のみ管理可能
  if (actorRole === 'admin' && targetRole === 'member') return true;
  return false;
}

export function canChangeToRole(
  actorRole: WorkspaceRole,
  newRole: WorkspaceRole
): boolean {
  // OWNER は全てのロールに変更可能
  if (actorRole === 'owner') return true;
  // ADMIN は MEMBER への変更のみ可能
  if (actorRole === 'admin' && newRole === 'member') return true;
  return false;
}
