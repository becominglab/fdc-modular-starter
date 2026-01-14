/**
 * lib/email/resend.ts
 *
 * Resend メール送信ユーティリティ
 */

import { Resend } from 'resend';

// Resend クライアントのシングルトンインスタンス
let resendClient: Resend | null = null;

/**
 * Resend クライアントを取得
 * RESEND_API_KEY が設定されていない場合は null を返す
 */
export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email sending is disabled.');
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * メール送信設定
 */
export interface EmailConfig {
  from?: string;
  replyTo?: string;
}

/**
 * デフォルトのメール設定を取得
 */
export function getEmailConfig(): EmailConfig {
  return {
    from: process.env.EMAIL_FROM || 'noreply@resend.dev',
    replyTo: process.env.EMAIL_REPLY_TO,
  };
}
