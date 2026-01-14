/**
 * lib/emails/InvitationAcceptedEmail.tsx
 *
 * 招待承諾通知メールテンプレート
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface InvitationAcceptedEmailProps {
  acceptedUserName: string;
  acceptedUserEmail: string;
  workspaceName: string;
}

export function InvitationAcceptedEmail({
  acceptedUserName,
  acceptedUserEmail,
  workspaceName,
}: InvitationAcceptedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>新しいメンバーが {workspaceName} に参加しました</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>新しいメンバーが参加しました</Heading>

          <Text style={text}>
            <strong>{acceptedUserName}</strong> ({acceptedUserEmail}) さんが
            <strong> {workspaceName}</strong> に参加しました。
          </Text>

          <Text style={text}>
            ダッシュボードからメンバー一覧を確認できます。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const h1: React.CSSProperties = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 20px',
};

const text: React.CSSProperties = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

export default InvitationAcceptedEmail;
