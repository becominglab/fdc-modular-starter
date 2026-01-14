/**
 * app/api/email-preview/route.ts
 *
 * 開発用メールプレビュー（本番では無効化）
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { InvitationEmail } from '@/lib/emails/InvitationEmail';
import { InvitationAcceptedEmail } from '@/lib/emails/InvitationAcceptedEmail';

export async function GET(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'invitation';

  let html = '';

  switch (template) {
    case 'invitation':
      html = await render(
        InvitationEmail({
          inviterName: '山田太郎',
          workspaceName: 'サンプルワークスペース',
          invitationLink: 'http://localhost:3000/invite/accept?token=sample',
          role: 'member',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      );
      break;

    case 'accepted':
      html = await render(
        InvitationAcceptedEmail({
          acceptedUserName: '佐藤花子',
          acceptedUserEmail: 'hanako@example.com',
          workspaceName: 'サンプルワークスペース',
        })
      );
      break;

    default:
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
