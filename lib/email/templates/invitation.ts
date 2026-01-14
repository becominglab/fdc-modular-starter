/**
 * lib/email/templates/invitation.ts
 *
 * 招待メールテンプレート
 */

export interface InvitationEmailData {
  workspaceName: string;
  inviterEmail: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}

/**
 * 招待メールの件名を生成
 */
export function getInvitationSubject(workspaceName: string): string {
  return `${workspaceName} への招待`;
}

/**
 * 招待メールの HTML 本文を生成
 */
export function getInvitationHtml(data: InvitationEmailData): string {
  const roleLabel = data.role === 'admin' ? '管理者' : 'メンバー';
  const expiresDate = new Date(data.expiresAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.workspaceName} への招待</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 24px; color: #333;">ワークスペースへの招待</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                <strong>${data.workspaceName}</strong> に${roleLabel}として招待されました。
              </p>

              <p style="margin: 0 0 30px; font-size: 14px; line-height: 1.6; color: #666;">
                招待者: ${data.inviterEmail}
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${data.inviteUrl}"
                       style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #2563eb; text-decoration: none; border-radius: 6px;">
                      招待を承諾する
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #666;">
                この招待は <strong>${expiresDate}</strong> まで有効です。
              </p>

              <p style="margin: 20px 0 0; font-size: 12px; line-height: 1.6; color: #999;">
                ボタンが機能しない場合は、以下のURLをブラウザに直接貼り付けてください：<br>
                <a href="${data.inviteUrl}" style="color: #2563eb; word-break: break-all;">${data.inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                心当たりのない招待の場合は、このメールを無視してください。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 招待メールのプレーンテキスト本文を生成
 */
export function getInvitationText(data: InvitationEmailData): string {
  const roleLabel = data.role === 'admin' ? '管理者' : 'メンバー';
  const expiresDate = new Date(data.expiresAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
${data.workspaceName} への招待

${data.workspaceName} に${roleLabel}として招待されました。

招待者: ${data.inviterEmail}

以下のリンクから招待を承諾してください：
${data.inviteUrl}

この招待は ${expiresDate} まで有効です。

---
心当たりのない招待の場合は、このメールを無視してください。
  `.trim();
}
