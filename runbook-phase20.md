# Phase 20: メール通知システム（Resend）

## 目標

Resend を使用したメール通知システムを実装します。

### 習得する概念

- **Resend**: モダンなメール送信API
- **トランザクションメール**: 招待・通知などのシステムメール
- **メールテンプレート**: React Email によるテンプレート作成
- **非同期処理**: メール送信のバックグラウンド処理

### 実装する機能

1. ワークスペース招待メール
2. 招待承諾通知メール
3. パスワードリセットメール（Supabase Auth連携）

---

## Step 1: Resend セットアップ

### 1.1 Resend アカウント作成

1. https://resend.com にアクセス
2. アカウント作成（GitHub連携可能）
3. API Key を取得

### 1.2 環境変数設定

`.env.local` に追加:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### 1.3 パッケージインストール

```bash
npm install resend @react-email/components
```

### 確認ポイント

- [ ] Resend アカウントを作成した
- [ ] API Key を取得した
- [ ] 環境変数を設定した
- [ ] パッケージをインストールした

---

## Step 2: 型定義の作成

### ファイル: `lib/types/email.ts`

```typescript
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
```

### 確認ポイント

- [ ] `lib/types/email.ts` を作成した

---

## Step 3: メールテンプレート作成

### 3.1 ディレクトリ作成

```bash
mkdir -p lib/emails
```

### 3.2 ファイル: `lib/emails/InvitationEmail.tsx`

```typescript
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
  const roleLabel = {
    owner: 'オーナー',
    admin: '管理者',
    member: 'メンバー',
  }[role] || role;

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
            あなたは <strong>{roleLabel}</strong> として招待されています。
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

// スタイル
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 20px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const smallText = {
  color: '#8a8a8a',
  fontSize: '14px',
  margin: '16px 0 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 32px',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '32px 0',
};

const footer = {
  color: '#8a8a8a',
  fontSize: '12px',
  lineHeight: '1.6',
};

const link = {
  color: '#667eea',
  wordBreak: 'break-all' as const,
};

export default InvitationEmail;
```

### 3.3 ファイル: `lib/emails/InvitationAcceptedEmail.tsx`

```typescript
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

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 20px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

export default InvitationAcceptedEmail;
```

### 確認ポイント

- [ ] `lib/emails/InvitationEmail.tsx` を作成した
- [ ] `lib/emails/InvitationAcceptedEmail.tsx` を作成した

---

## Step 4: メール送信サービス作成

### ファイル: `lib/services/email.ts`

```typescript
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
const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
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
```

### 確認ポイント

- [ ] `lib/services/email.ts` を作成した

---

## Step 5: 招待 API の更新

### ファイル: `app/api/workspaces/[workspaceId]/invitations/route.ts`

POST ハンドラーにメール送信を追加:

```typescript
// 既存のインポートに追加
import { sendInvitationEmail } from '@/lib/services/email';

// POST ハンドラー内、招待作成後に追加:

    // メール送信
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: inviterProfile?.full_name || inviterProfile?.email || 'チームメンバー',
      workspaceName: workspace.name,
      invitationToken: invitation.token,
      role,
      expiresAt: invitation.expires_at,
    });

    if (!emailResult.success) {
      console.warn('Invitation email failed:', emailResult.error);
      // メール送信失敗でも招待自体は成功とする
    }
```

### 確認ポイント

- [ ] 招待 API にメール送信を追加した

---

## Step 6: 招待承諾 API の更新

### ファイル: `app/api/invitations/accept/route.ts`

招待承諾後にオーナーへ通知メール送信:

```typescript
// 既存のインポートに追加
import { sendInvitationAcceptedEmail } from '@/lib/services/email';

// 招待承諾処理後に追加:

    // オーナーに通知メール送信
    const { data: ownerMember } = await serviceClient
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('role', 'owner')
      .single();

    if (ownerMember) {
      const { data: ownerProfile } = await serviceClient
        .from('profiles')
        .select('email')
        .eq('id', ownerMember.user_id)
        .single();

      const { data: acceptedProfile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (ownerProfile?.email) {
        await sendInvitationAcceptedEmail({
          to: ownerProfile.email,
          acceptedUserName: acceptedProfile?.full_name || acceptedProfile?.email || 'ユーザー',
          acceptedUserEmail: acceptedProfile?.email || '',
          workspaceName: invitation.workspaces?.name || 'ワークスペース',
        });
      }
    }
```

### 確認ポイント

- [ ] 招待承諾 API に通知メール送信を追加した

---

## Step 7: メールプレビュー API（開発用）

### ファイル: `app/api/email-preview/route.ts`

```typescript
/**
 * app/api/email-preview/route.ts
 *
 * 開発用メールプレビュー（本番では無効化推奨）
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
```

### 確認ポイント

- [ ] `app/api/email-preview/route.ts` を作成した

---

## Step 8: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックが通る
- [ ] ビルドが成功する

---

## Step 9: 動作確認

### 9.1 メールプレビュー確認（開発環境）

```
http://localhost:3000/api/email-preview?template=invitation
http://localhost:3000/api/email-preview?template=accepted
```

### 9.2 招待メール送信テスト

1. 管理ページからメンバーを招待
2. 招待メールが届くことを確認
3. 招待リンクから承諾
4. オーナーに通知メールが届くことを確認

### 確認ポイント

- [ ] メールプレビューが表示される
- [ ] 招待メールが送信される
- [ ] 招待承諾通知が送信される

---

## Step 10: Git プッシュ

```bash
git add -A
git commit -m "Phase 20: メール通知システム（Resend）を実装"
git push
```

### 確認ポイント

- [ ] コミットした
- [ ] プッシュした
- [ ] Vercel デプロイが成功した

---

## 完了チェック

- [ ] Resend でメール送信できる
- [ ] 招待メールが届く
- [ ] 招待承諾通知が届く
- [ ] メールテンプレートが正しく表示される
- [ ] GitHub にプッシュした

---

## 補足: Resend ドメイン認証

本番運用時は Resend でドメイン認証を行うことを推奨:

1. Resend Dashboard → Domains
2. ドメインを追加
3. DNS レコード（SPF, DKIM）を設定
4. 認証完了後、そのドメインからメール送信可能

---

## トラブルシューティング

### メールが届かない

1. Resend Dashboard でログを確認
2. API Key が正しいか確認
3. `EMAIL_FROM` が認証済みドメインか確認

### 開発環境でのテスト

Resend は開発環境でも実際にメール送信されます。
テスト用に `onboarding@resend.dev` を使用可能。
