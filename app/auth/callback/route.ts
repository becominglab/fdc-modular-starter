import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/server/encryption';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // 認証コードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const session = data.session;
    const user = session?.user;

    if (user && session) {
      try {
        const supabaseAdmin = createAdminClient();

        // users テーブルにユーザー情報を upsert
        await supabaseAdmin.from('users').upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url,
        }, {
          onConflict: 'id',
        });

        // Google API トークンを保存
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        if (providerToken) {
          // アクセストークンを暗号化して保存
          const encryptedAccessToken = encrypt(providerToken);
          // トークンの有効期限（1時間）
          const tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

          await supabaseAdmin.from('users').update({
            google_access_token: encryptedAccessToken,
            google_token_expires_at: tokenExpiresAt,
            google_api_enabled: true,
            google_scopes: [
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/tasks',
            ],
          }).eq('id', user.id);

          console.log('Google access token saved for user:', user.id);
        }

        if (providerRefreshToken) {
          // リフレッシュトークンを暗号化して保存
          const encryptedRefreshToken = encrypt(providerRefreshToken);

          await supabaseAdmin.from('users').update({
            google_refresh_token: encryptedRefreshToken,
          }).eq('id', user.id);

          console.log('Google refresh token saved for user:', user.id);
        }
      } catch (err) {
        console.error('Failed to save user/token data:', err);
        // トークン保存に失敗してもログインは成功させる
      }
    }
  }

  // ダッシュボードへリダイレクト
  return NextResponse.redirect(`${origin}/dashboard`);
}
