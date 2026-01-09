# Phase 12: Google Calendar/Tasks API 連携準備

## 目標

Phase 4 で設定した Supabase Auth + Google OAuth に Calendar/Tasks スコープを追加し、ログイン時に自動的にカレンダー連携を完了させる。

## 認証フローの理解

```
┌─────────────────────────────────────────────────────────────────┐
│  ユーザー                                                       │
│       ↓                                                         │
│  ログインボタンをクリック                                        │
│       ↓                                                         │
│  Supabase Auth → Google OAuth 画面                              │
│  ┌───────────────────────────────────────────┐                 │
│  │ FDC がアクセスを求めています:              │                 │
│  │ ✓ 基本的なプロフィール情報                 │                 │
│  │ ✓ メールアドレス                           │                 │
│  │ ✓ Google カレンダーの予定を表示・編集      │  ← 新規追加     │
│  │ ✓ Google Tasks の表示・編集               │  ← 新規追加     │
│  └───────────────────────────────────────────┘                 │
│       ↓                                                         │
│  /api/auth/callback                                             │
│  ┌───────────────────────────────────────────┐                 │
│  │ 1. Supabase から session 取得              │                 │
│  │ 2. session.provider_token 取得             │                 │
│  │ 3. session.provider_refresh_token 取得     │                 │
│  │ 4. 暗号化して DB に保存                    │                 │
│  │ 5. ダッシュボードへリダイレクト            │                 │
│  └───────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

**ポイント**: ログインとカレンダー連携は **同時に** 行われる

---

## Step 1: Google Cloud Console 設定（手動）

### 1.1 Google Cloud Console にアクセス

1. https://console.cloud.google.com/ にアクセス
2. Phase 4 で作成したプロジェクトを選択

### 1.2 Calendar API を有効化

1. 左メニュー「APIとサービス」→「ライブラリ」
2. 「Google Calendar API」を検索
3. 「有効にする」をクリック

### 1.3 Tasks API を有効化

1. 左メニュー「APIとサービス」→「ライブラリ」
2. 「Google Tasks API」を検索
3. 「有効にする」をクリック

### 1.4 OAuth 同意画面でスコープ追加

1. 左メニュー「OAuth 同意画面」
2. 「編集」をクリック
3. 「スコープを追加または削除」をクリック
4. 以下のスコープを追加:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/tasks`
5. 「保存して次へ」

### 確認ポイント

- [ ] Google Calendar API が有効になっている
- [ ] Google Tasks API が有効になっている
- [ ] OAuth 同意画面に Calendar/Tasks スコープが追加されている

---

## Step 2: Supabase Dashboard 設定（手動）

### 2.1 Authentication Provider 設定

1. Supabase Dashboard にアクセス
2. 左メニュー「Authentication」→「Providers」
3. 「Google」を選択
4. 「Additional OAuth Scopes」に以下を追加（カンマ区切り）:

```
https://www.googleapis.com/auth/calendar.readonly,https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/tasks
```

5. 「Save」をクリック

### 確認ポイント

- [ ] Supabase の Google Provider に追加スコープが設定されている

---

## Step 3: 環境変数の追加

### 3.1 暗号化キーを生成

```bash
openssl rand -base64 32
```

### 3.2 .env.local に追加

**ファイル:** `.env.local`

```bash
# Phase 4 で設定済み
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Phase 12 で追加
TOKEN_ENCRYPTION_KEY=生成した暗号化キー
```

### 確認ポイント

- [ ] TOKEN_ENCRYPTION_KEY が .env.local に設定されている

---

## Step 4: Supabase マイグレーション作成

### 4.1 マイグレーションファイル作成

**ファイル:** `supabase/migrations/20260109_phase12_google_tokens.sql`

```sql
-- =============================================
-- Phase 12: Google API トークン保存用カラム追加
-- =============================================

-- 1. users テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Google API 用カラムを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_api_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_scopes TEXT[];

-- 3. RLS ポリシー設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがあれば削除して再作成
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_google_api_enabled ON users(google_api_enabled);

-- 5. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();
```

### 4.2 マイグレーション実行

```bash
supabase db push
```

### 確認ポイント

- [ ] マイグレーションがエラーなく完了
- [ ] users テーブルに google_* カラムが追加された

---

## Step 5: 暗号化ユーティリティ作成

### 5.1 ディレクトリ作成

```bash
mkdir -p lib/server
```

### 5.2 暗号化ユーティリティ作成

**ファイル:** `lib/server/encryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  }
  return Buffer.from(key, 'base64');
}

/**
 * 文字列を AES-256-GCM で暗号化
 * @param text 暗号化する文字列
 * @returns Base64エンコードされた暗号文（iv:authTag:encrypted）
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // iv:authTag:encrypted の形式で返す
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * AES-256-GCM で暗号化された文字列を復号
 * @param encryptedData Base64エンコードされた暗号文（iv:authTag:encrypted）
 * @returns 復号された文字列
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * トークンが期限切れかどうかを確認
 * @param expiresAt ISO形式の日時文字列
 * @param bufferMinutes 余裕を持たせる分数（デフォルト5分）
 */
export function isTokenExpired(expiresAt: string | null, bufferMinutes = 5): boolean {
  if (!expiresAt) return true;
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const buffer = bufferMinutes * 60 * 1000;
  return now >= expiryTime - buffer;
}
```

### 確認ポイント

- [ ] `lib/server/encryption.ts` が作成された
- [ ] encrypt, decrypt, isTokenExpired 関数がエクスポートされている

---

## Step 6: Supabase Admin クライアント作成

### 6.1 Admin クライアント作成

**ファイル:** `lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Supabase Admin クライアント（サーバーサイドのみ）
 * RLS をバイパスしてデータベースにアクセスする
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

### 6.2 環境変数確認

`.env.local` に以下が設定されていることを確認:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**注意**: Service Role Key は Supabase Dashboard → Settings → API から取得

### 確認ポイント

- [ ] `lib/supabase/admin.ts` が作成された
- [ ] SUPABASE_SERVICE_ROLE_KEY が .env.local に設定されている

---

## Step 7: auth/callback の拡張

### 7.1 現在の callback を確認

```bash
cat app/auth/callback/route.ts
```

### 7.2 callback を拡張

**ファイル:** `app/auth/callback/route.ts`

```typescript
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
```

### 確認ポイント

- [ ] `app/auth/callback/route.ts` が更新された
- [ ] provider_token と provider_refresh_token を保存する処理が追加された

---

## Step 8: トークンリフレッシュ関数作成

### 8.1 トークンリフレッシュユーティリティ

**ファイル:** `lib/server/google-auth.ts`

```typescript
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
```

### 確認ポイント

- [ ] `lib/server/google-auth.ts` が作成された
- [ ] refreshGoogleToken, getValidGoogleToken 関数がエクスポートされている

---

## Step 9: 型定義の更新

### 9.1 Supabase 型を再生成

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
cp lib/supabase/database.types.ts lib/types/database.ts
```

### 9.2 database.ts の確認

users テーブルに以下のカラムが含まれていることを確認:

- google_access_token
- google_refresh_token
- google_token_expires_at
- google_api_enabled
- google_scopes

### 確認ポイント

- [ ] 型定義が再生成された
- [ ] users テーブルの型に google_* フィールドが含まれている

---

## Step 10: 動作確認

### 10.1 開発サーバー起動

```bash
npm run dev
```

### 10.2 ログインテスト

1. http://localhost:3000/login にアクセス
2. Google でログイン
3. Google OAuth 画面で以下のスコープが表示されることを確認:
   - カレンダーの予定を表示・編集
   - Tasks の表示・編集
4. 「許可」をクリック
5. ダッシュボードにリダイレクトされることを確認

### 10.3 トークン保存確認

Supabase Dashboard または SQL で確認:

```sql
SELECT
  id,
  email,
  google_api_enabled,
  google_scopes,
  google_token_expires_at,
  CASE WHEN google_access_token IS NOT NULL THEN 'SET' ELSE 'NULL' END as access_token,
  CASE WHEN google_refresh_token IS NOT NULL THEN 'SET' ELSE 'NULL' END as refresh_token
FROM users
WHERE google_api_enabled = true;
```

### 確認ポイント

- [ ] Google OAuth 画面に Calendar/Tasks スコープが表示される
- [ ] ログイン後、users テーブルに google_access_token が保存される
- [ ] google_api_enabled が true になっている

---

## Step 11: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックがエラーなく完了
- [ ] ビルドがエラーなく完了

---

## Step 12: Git プッシュ

```bash
git add -A
git commit -m "Phase 12: Google Calendar/Tasks API 連携準備

- Google Cloud Console で Calendar/Tasks API 有効化
- Supabase Dashboard で追加 OAuth スコープ設定
- lib/server/encryption.ts: トークン暗号化ユーティリティ
- lib/server/google-auth.ts: トークンリフレッシュ機能
- lib/supabase/admin.ts: Admin クライアント
- app/auth/callback: provider_token 保存処理追加
- users テーブルに google_* カラム追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push
```

---

## 完了チェックリスト

### Google Cloud Console
- [ ] Google Calendar API が有効
- [ ] Google Tasks API が有効
- [ ] OAuth 同意画面にスコープ追加済み

### Supabase Dashboard
- [ ] Google Provider に追加スコープ設定済み

### 環境変数
- [ ] TOKEN_ENCRYPTION_KEY が設定済み
- [ ] SUPABASE_SERVICE_ROLE_KEY が設定済み

### コード
- [ ] `supabase/migrations/20260109_phase12_google_tokens.sql` 作成・実行
- [ ] `lib/server/encryption.ts` 作成
- [ ] `lib/supabase/admin.ts` 作成
- [ ] `lib/server/google-auth.ts` 作成
- [ ] `app/auth/callback/route.ts` 拡張

### 動作確認
- [ ] Google OAuth 画面に Calendar/Tasks スコープ表示
- [ ] ログイン後 users テーブルにトークン保存
- [ ] google_api_enabled が true
- [ ] 型チェック成功
- [ ] ビルド成功
- [ ] Git プッシュ完了

---

## 追加スコープまとめ

| スコープ | 用途 |
|---------|------|
| `calendar.readonly` | カレンダー読み取り |
| `calendar.events` | カレンダーイベント作成・編集 |
| `tasks` | Google Tasks 読み書き |

---

## 次のステップ（Phase 13 以降）

1. **Google Calendar API 連携**
   - カレンダー一覧取得
   - イベント取得・作成
   - Task との双方向同期

2. **ダッシュボードに予定表示**
   - 今日の予定ウィジェット
   - 週間カレンダービュー

3. **Task ↔ Google Tasks 同期**
   - FDC Task を Google Tasks に同期
   - 双方向同期オプション
