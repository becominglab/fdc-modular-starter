/**
 * lib/services/email.ts
 *
 * Resend を使用したメール送信サービス
 */

import { Resend } from 'resend';
import { InvitationEmail } from '@/lib/emails/InvitationEmail';
import { InvitationAcceptedEmail } from '@/lib/emails/InvitationAcceptedEmail';
import type {
  EmailResult,
  InvitationEmailData,
  InvitationAcceptedEmailData,
} from '@/lib/types/email';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * 招待メール送信
 */
export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<EmailResult> {
  try {
    const invitationLink = `${appUrl}/invite/accept?token=${data.invitationToken}`;

    const { data: result, error } = await resend.emails.send({
      from: `FDC Modular <${fromEmail}>`,
      to: data.to,
      subject: `${data.workspaceName} への招待`,
      react: InvitationEmail({
        inviterName: data.inviterName,
        workspaceName: data.workspaceName,
        invitationLink,
        role: data.role,
        expiresAt: data.expiresAt,
      }),
    });

    if (error) {
      console.error('Invitation email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Send invitation email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 招待承諾通知メール送信
 */
export async function sendInvitationAcceptedEmail(
  data: InvitationAcceptedEmailData
): Promise<EmailResult> {
  try {
    const { data: result, error } = await resend.emails.send({
      from: `FDC Modular <${fromEmail}>`,
      to: data.to,
      subject: `新しいメンバーが ${data.workspaceName} に参加しました`,
      react: InvitationAcceptedEmail({
        acceptedUserName: data.acceptedUserName,
        acceptedUserEmail: data.acceptedUserEmail,
        workspaceName: data.workspaceName,
      }),
    });

    if (error) {
      console.error('Invitation accepted email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Send invitation accepted email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
