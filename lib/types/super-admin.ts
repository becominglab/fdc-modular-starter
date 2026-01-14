/**
 * lib/types/super-admin.ts
 *
 * Super Admin 機能の型定義
 */

// テナント（ワークスペース）概要
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  memberCount: number;
  createdAt: string;
  lastActivityAt: string | null;
}

// システムメトリクスの種類
export type MetricType =
  | 'active_users'
  | 'total_workspaces'
  | 'api_calls'
  | 'storage_used'
  | 'invitations_sent';

// システムメトリクス
export interface SystemMetric {
  id: string;
  metricType: MetricType;
  value: number;
  details: Record<string, unknown>;
  recordedAt: string;
}

// システム統計サマリー
export interface SystemStats {
  totalUsers: number;
  activeUsersToday: number;
  totalWorkspaces: number;
  pendingInvitations: number;
  securityEventsToday: number;
}

// セキュリティイベントの重要度
export type SecuritySeverity = 'info' | 'warning' | 'critical';

// セキュリティイベントの種類
export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_reset'
  | 'account_locked'
  | 'suspicious_activity'
  | 'permission_denied';

// セキュリティイベント
export interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId: string | null;
  userEmail?: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

// ユーザー管理用
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastSignIn: string | null;
  workspaceCount: number;
}

// ユーザー操作
export type UserAction = 'activate' | 'deactivate' | 'delete' | 'grant_sa' | 'revoke_sa';
