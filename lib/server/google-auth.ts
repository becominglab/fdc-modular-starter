import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt, isTokenExpired } from './encryption';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

/**
 * Google API トークンをリフレッシュ
 */
export async function refreshGoogleToken(userId: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();

  // ユーザーのリフレッシュトークンを取得
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('google_refresh_token, google_token_expires_at, google_access_token')
    .eq('id', userId)
    .single();

  if (error || !user?.google_refresh_token) {
    console.error('No refresh token found for user:', userId);
    return null;
  }

  // トークンがまだ有効な場合はそのまま返す
  if (!isTokenExpired(user.google_token_expires_at) && user.google_access_token) {
    return decrypt(user.google_access_token);
  }

  // リフレッシュトークンを復号
  const refreshToken = decrypt(user.google_refresh_token);

  // Google API でトークンをリフレッシュ
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token refresh failed:', errorData);
    return null;
  }

  const tokenData: TokenResponse = await response.json();

  // 新しいトークンを暗号化して保存
  const encryptedAccessToken = encrypt(tokenData.access_token);
  const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabaseAdmin.from('users').update({
    google_access_token: encryptedAccessToken,
    google_token_expires_at: tokenExpiresAt,
  }).eq('id', userId);

  // 新しいリフレッシュトークンが返された場合は更新
  if (tokenData.refresh_token) {
    const encryptedRefreshToken = encrypt(tokenData.refresh_token);
    await supabaseAdmin.from('users').update({
      google_refresh_token: encryptedRefreshToken,
    }).eq('id', userId);
  }

  return tokenData.access_token;
}

/**
 * ユーザーの有効な Google API トークンを取得
 * 期限切れの場合は自動的にリフレッシュ
 */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('google_access_token, google_token_expires_at, google_api_enabled')
    .eq('id', userId)
    .single();

  if (error || !user?.google_api_enabled) {
    return null;
  }

  // トークンが期限切れの場合はリフレッシュ
  if (isTokenExpired(user.google_token_expires_at)) {
    return refreshGoogleToken(userId);
  }

  // 有効なトークンを復号して返す
  if (user.google_access_token) {
    return decrypt(user.google_access_token);
  }

  return null;
}
