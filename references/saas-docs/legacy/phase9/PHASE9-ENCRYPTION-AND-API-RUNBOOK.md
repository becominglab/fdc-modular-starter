# Phase 9: Encryption & API Runbook

## Phase 9-7: Supabase Auth 完全移行後の運用ガイド

### 概要
Phase 9-7 により、FDC の認証基盤が **Supabase Auth + RLS** に完全移行しました。
旧 JWT/Session ベースの認証コードの一部を削除し、以下の環境変数のみが必要です。

### 必須環境変数

#### Vercel 本番環境
以下の環境変数を Vercel Dashboard で設定してください:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### ローカル開発環境
`.env.local` ファイルに以下を記述:

```bash
# Supabase 接続情報（Phase 9-7）
NEXT_PUBLIC_SUPABASE_URL=https://xxx-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要**: `.env.local` ファイルは Git に含めないでください（`.gitignore` に追加済み）。

### 認証フロー

#### ログイン
1. フロントエンド: `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Supabase が Google OAuth を処理し、JWT を発行
3. JWT は Supabase SDK が自動的に LocalStorage に保存
4. 以降の API リクエストでは、Supabase SDK が自動的に `Authorization: Bearer <JWT>` ヘッダーを付与

#### ログアウト
1. フロントエンド: `supabase.auth.signOut()`
2. Supabase SDK が LocalStorage の JWT を削除

#### セッション確認
1. フロントエンド: `supabase.auth.getUser()`
2. 有効な JWT があれば、ユーザー情報を返す

#### Google Calendar API 連携
1. Supabase Auth でログイン後、`session.provider_token` から Google OAuth の access_token を取得
2. この token を使用して Google Calendar API を呼び出す

```typescript
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.provider_token;  // Google OAuth の access_token

// Google Calendar API 呼び出し
const calendars = await fetchCalendarList(accessToken);
```

### RLS ポリシー
すべての DB テーブルには RLS ポリシーが設定されており、`auth.uid()` で自動認可されます。
詳細は `DOCS/RLS-POLICY-GUIDE.md` を参照してください。

### トラブルシューティング

#### ログイン後すぐにログアウトされる
- Supabase Dashboard で Google OAuth の Redirect URL が正しく設定されているか確認
- `https://app.foundersdirect.jp` が許可されているか確認

#### `Missing required environment variables` エラー
- Vercel Dashboard で `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されているか確認
- ローカル開発では `.env.local` ファイルが存在するか確認

#### Google Calendar API が `UNAUTHORIZED` エラーを返す
- Supabase Dashboard の Google OAuth 設定で、`calendar.readonly` と `calendar.events` スコープが有効になっているか確認
- `session.provider_token` が null でないか確認（null の場合は再ログインが必要）

### 削除された旧認証コード（Phase 9-7）

以下のファイルは Phase 9-7 で削除されました:

#### フロントエンド
- `js/core/googleAuth.ts`（旧 Google Identity Services ベース）

#### バックエンド
- `api/auth/google.ts`（旧 Cookie 発行エンドポイント）
- `api/auth/session.ts`（旧セッション確認エンドポイント）
- `api/auth/logout.ts`（旧ログアウトエンドポイント）

#### 残存ファイル（他の API エンドポイントが依存）
以下のファイルは、`/api/clients`, `/api/leads` などの API エンドポイントが依存しているため残しています:
- `api/_lib/middleware.ts`（セッション認証ミドルウェア）
- `api/_lib/session.ts`（セッション管理ライブラリ）
- `api/_lib/jwt.ts`（JWT 署名・検証ライブラリ）

**注**: 将来的には、これらの API エンドポイントも Supabase RLS に完全移行し、上記ファイルも削除する予定です。

### コード例

#### ログイン処理
```typescript
import { supabase, signInWithGoogle } from './core/supabase.js';

// ログインボタンのクリックイベント
async function handleLogin() {
  try {
    await signInWithGoogle();
    console.log('Google OAuth ログイン処理を開始しました');
  } catch (error) {
    console.error('ログインエラー:', error);
  }
}
```

#### ログアウト処理
```typescript
import { supabase, signOut } from './core/supabase.js';

async function handleLogout() {
  try {
    await signOut();
    console.log('ログアウトしました');
    window.location.href = '/';
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
}
```

#### セッション確認
```typescript
import { getCurrentSupabaseUser } from './core/supabase.js';

async function checkAuth() {
  const user = await getCurrentSupabaseUser();
  if (user) {
    console.log('ログイン中:', user.email);
  } else {
    console.log('未ログイン');
  }
}
```

### 関連ドキュメント
- [RLS ポリシーガイド](./RLS-POLICY-GUIDE.md)
- [開発環境セットアップ](./HOW-TO-DEVELOP.md)
- [Phase 9-12 マスタープラン](./PHASE9-12-MASTER-PLAN.md)
