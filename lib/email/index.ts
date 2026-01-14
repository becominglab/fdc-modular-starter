/**
 * lib/email/index.ts
 *
 * メールモジュールのエクスポート
 */

export { getResendClient, getEmailConfig, type EmailConfig } from './resend';
export { sendInvitationEmail, type SendInvitationParams, type SendInvitationResult } from './send-invitation';
export * from './templates/invitation';
