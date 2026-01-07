/**
 * ワークスペースロールの型
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member';

/**
 * ワークスペースの型
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ワークスペースメンバーの型
 */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

/**
 * メンバー情報（ユーザー情報付き）
 */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

/**
 * ワークスペース作成の入力型
 */
export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string;
}

/**
 * ワークスペース更新の入力型
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

/**
 * メンバー招待の入力型
 */
export interface InviteMemberInput {
  email: string;
  role: WorkspaceRole;
}

/**
 * ロール別の権限マップ
 */
export const ROLE_PERMISSIONS = {
  owner: {
    canCreateTask: true,
    canInviteMember: true,
    canRemoveMember: true,
    canUpdateWorkspace: true,
    canDeleteWorkspace: true,
    canChangeOwner: true,
  },
  admin: {
    canCreateTask: true,
    canInviteMember: true,
    canRemoveMember: true,
    canUpdateWorkspace: true,
    canDeleteWorkspace: false,
    canChangeOwner: false,
  },
  member: {
    canCreateTask: true,
    canInviteMember: false,
    canRemoveMember: false,
    canUpdateWorkspace: false,
    canDeleteWorkspace: false,
    canChangeOwner: false,
  },
} as const;

/**
 * 権限チェック関数
 */
export function hasPermission(
  role: WorkspaceRole,
  permission: keyof typeof ROLE_PERMISSIONS.owner
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
