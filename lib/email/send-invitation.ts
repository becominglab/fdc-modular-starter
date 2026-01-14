/**
 * lib/email/send-invitation.ts
 *
 * 招待メール送信サービス
 */

import { getResendClient, getEmailConfig } from './resend';
import {
  getInvitationSubject,
  getInvitationHtml,
  getInvitationText,
  type InvitationEmailData,
} from './templates/invitation';

export interface SendInvitationParams {
  to: string;
  workspaceName: string;
  inviterEmail: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface SendInvitationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 招待メールを送信
 */
export async function sendInvitationEmail(
  params: SendInvitationParams
): Promise<SendInvitationResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log('Email sending skipped: RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  const config = getEmailConfig();

  // 招待URL を生成
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/invite/accept?token=${params.token}`;

  const emailData: InvitationEmailData = {
    workspaceName: params.workspaceName,
    inviterEmail: params.inviterEmail,
    role: params.role,
    inviteUrl,
    expiresAt: params.expiresAt,
  };

  try {
    const { data, error } = await resend.emails.send({
      from: config.from!,
      to: params.to,
      replyTo: config.replyTo,
      subject: getInvitationSubject(params.workspaceName),
      html: getInvitationHtml(emailData),
      text: getInvitationText(emailData),
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('Invitation email sent:', data?.id);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    console.error('Error sending invitation email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
