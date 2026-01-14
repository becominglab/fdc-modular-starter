/**
 * lib/types/email.ts
 *
 * メール関連の型定義
 */

// メールの種類
export type EmailType =
  | 'workspace_invitation'
  | 'invitation_accepted'
  | 'password_reset'
  | 'welcome';

// 招待メールのデータ
export interface InvitationEmailData {
  to: string;
  inviterName: string;
  workspaceName: string;
  invitationToken: string;
  role: string;
  expiresAt: string;
}

// 招待承諾通知のデータ
export interface InvitationAcceptedEmailData {
  to: string;
  acceptedUserName: string;
  acceptedUserEmail: string;
  workspaceName: string;
}

// ウェルカムメールのデータ
export interface WelcomeEmailData {
  to: string;
  userName: string;
}

// メール送信結果
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
