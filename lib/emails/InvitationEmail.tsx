/**
 * lib/emails/InvitationEmail.tsx
 *
 * ワークスペース招待メールテンプレート
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface InvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  invitationLink: string;
  role: string;
  expiresAt: string;
}

export function InvitationEmail({
  inviterName,
  workspaceName,
  invitationLink,
  role,
  expiresAt,
}: InvitationEmailProps) {
  const roleLabel: Record<string, string> = {
    owner: 'オーナー',
    admin: '管理者',
    member: 'メンバー',
  };

  return (
    <Html>
      <Head />
      <Preview>{workspaceName} への招待</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>ワークスペースへの招待</Heading>

          <Text style={text}>
            {inviterName} さんから <strong>{workspaceName}</strong> への招待が届いています。
          </Text>

          <Text style={text}>
            あなたは <strong>{roleLabel[role] || role}</strong> として招待されています。
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={invitationLink}>
              招待を承諾する
            </Button>
          </Section>

          <Text style={smallText}>
            この招待は {new Date(expiresAt).toLocaleDateString('ja-JP')} まで有効です。
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            ボタンが機能しない場合は、以下のリンクをブラウザに貼り付けてください：
            <br />
            <Link href={invitationLink} style={link}>
              {invitationLink}
            </Link>
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
  lineHeight: '1.3',
  margin: '0 0 20px',
};

const text: React.CSSProperties = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const smallText: React.CSSProperties = {
  color: '#8a8a8a',
  fontSize: '14px',
  margin: '16px 0 0',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
  padding: '12px 32px',
};

const hr: React.CSSProperties = {
  borderColor: '#e6e6e6',
  margin: '32px 0',
};

const footer: React.CSSProperties = {
  color: '#8a8a8a',
  fontSize: '12px',
  lineHeight: '1.6',
};

const link: React.CSSProperties = {
  color: '#667eea',
  wordBreak: 'break-all',
};

export default InvitationEmail;
