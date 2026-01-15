/**
 * lib/types/notification.ts
 *
 * 通知関連の型定義
 */

export type NotificationType =
  | 'invitation'    // ワークスペース招待
  | 'task_due'      // タスク期限
  | 'task_assigned' // タスク割り当て
  | 'mention'       // メンション
  | 'system'        // システム通知
  | 'info';         // お知らせ

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}
