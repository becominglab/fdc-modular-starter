# Phase 3: Supabase Auth 認証 ランブック

## 目標

デモ認証から本格的な認証システムに移行する：
- Supabase Auth による Google OAuth 認証
- セッション管理の改善
- 認証状態に応じた UI 表示
- ログアウト機能の実装

## 前提条件

- [ ] Phase 2 完了（タスク機能が動作している）
- [ ] Supabase プロジェクトが作成済み
- [ ] `.env.local` に Supabase の設定が完了している
- [ ] Google Cloud Console へのアクセス権限がある

---

## Step 1: Google OAuth の設定（Google Cloud Console）

### 1.1 Google Cloud Console でプロジェクト作成

1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクトを作成（または既存を使用）

### 1.2 OAuth 同意画面の設定

1. 「APIとサービス」→「OAuth 同意画面」
2. User Type: 「外部」を選択
3. 以下を入力:
   - アプリ名: `FDC Modular`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先: あなたのメールアドレス
4. スコープ: `email`, `profile`, `openid` を追加
5. テストユーザー: あなたのGoogleアカウントを追加

### 1.3 OAuth クライアント ID の作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: 「ウェブアプリケーション」
4. 名前: `FDC Modular`
5. 承認済みの JavaScript 生成元:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. 承認済みのリダイレクト URI:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
7. 「作成」をクリック
8. **クライアント ID** と **クライアント シークレット** をメモ

### 確認ポイント

- [ ] OAuth 同意画面が設定された
- [ ] OAuth クライアント ID が作成された
- [ ] クライアント ID とシークレットをメモした

---

## Step 2: Supabase で Google Auth を有効化

### 2.1 Supabase ダッシュボードで設定

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Authentication」→「Providers」
4. 「Google」を有効化
5. 以下を入力:
   - Client ID: Google で取得した値
   - Client Secret: Google で取得した値
6. 「Save」をクリック

### 2.2 リダイレクト URL の確認

Supabase の「Authentication」→「URL Configuration」で以下を確認:
- Site URL: `http://localhost:3000`（開発時）
- Redirect URLs: `http://localhost:3000/**`

### 確認ポイント

- [ ] Supabase で Google プロバイダーが有効化された
- [ ] Site URL が正しく設定された

---

## Step 3: Supabase クライアントの作成

**ファイルパス:** `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**ファイルパス:** `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は無視
          }
        },
      },
    }
  );
}
```

### 3.1 必要なパッケージのインストール

```bash
npm install @supabase/ssr
```

### 確認ポイント

- [ ] `@supabase/ssr` がインストールされた
- [ ] `lib/supabase/client.ts` が作成された
- [ ] `lib/supabase/server.ts` が作成された

---

## Step 4: 認証コンテキストの更新

**ファイルパス:** `lib/contexts/AuthContext.tsx`

```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 初期セッション取得
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getSession();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [supabase.auth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 確認ポイント

- [ ] `AuthContext.tsx` が更新された
- [ ] `signInWithGoogle` と `signOut` 関数が追加された

---

## Step 5: 認証コールバックページの作成

**ファイルパス:** `app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### 確認ポイント

- [ ] `app/auth/callback/route.ts` が作成された

---

## Step 6: ログインページの更新

**ファイルパス:** `app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, Rocket } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, isLoading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // URL パラメータからエラーを取得
  const authError = searchParams.get('error');

  // デモ認証（開発用に残す）
  const handleDemoLogin = async () => {
    setIsLoading(true);
    if (password === 'fdc') {
      localStorage.setItem(
        'fdc_session',
        JSON.stringify({
          user: { id: '1', email: 'demo@example.com', name: 'Demo User' },
          loggedInAt: new Date().toISOString(),
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push('/dashboard');
    } else {
      setError('パスワードが違います');
      setIsLoading(false);
    }
  };

  // Google 認証
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      setError('Google ログインに失敗しました');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ marginBottom: '24px' }}>
          <Rocket
            size={48}
            style={{
              color: 'var(--primary)',
              marginBottom: '16px',
            }}
          />
        </div>

        <h1>FDC Modular</h1>
        <p>Founders Direct Cockpit - 学習用スターター</p>

        {(error || authError) && (
          <div
            className="alert alert-error"
            style={{ marginBottom: '16px', textAlign: 'left' }}
          >
            {error || '認証に失敗しました。もう一度お試しください。'}
          </div>
        )}

        {/* Google ログインボタン */}
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onClick={handleGoogleLogin}
          disabled={authLoading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {authLoading ? 'ログイン中...' : 'Google でログイン'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '16px 0',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ padding: '0 12px', fontSize: '12px' }}>または</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* デモ認証（開発用） */}
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} />
            デモ用パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()}
            placeholder="パスワードを入力"
            disabled={isLoading}
          />
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={handleDemoLogin}
          disabled={isLoading}
        >
          <LogIn size={18} />
          {isLoading ? 'ログイン中...' : 'デモログイン'}
        </button>

        <p
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'var(--bg-gray)',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          デモ用パスワード: <code style={{ fontWeight: 600 }}>fdc</code>
        </p>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] ログインページに Google ログインボタンが追加された
- [ ] デモログインも引き続き使用可能

---

## Step 7: レイアウトの更新

**ファイルパス:** `app/(app)/layout.tsx`

以下の変更を行う:

### 7.1 AuthProvider のインポートと使用

```typescript
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
```

### 7.2 認証チェックの更新

`useAuth` フックを使用して認証状態を管理:

```typescript
function AppContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();

  // localStorage のデモセッションも確認（後方互換性）
  const [demoUser, setDemoUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('fdc_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setDemoUser(parsed.user);
      } catch {
        // 無視
      }
    }
  }, []);

  const handleLogout = async () => {
    // Supabase セッションがあればサインアウト
    if (user) {
      await signOut();
    }
    // デモセッションも削除
    localStorage.removeItem('fdc_session');
    router.push('/login');
  };

  // ローディング中
  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        読み込み中...
      </div>
    );
  }

  // 未認証時はLPを表示
  const currentUser = user || demoUser;
  if (!currentUser) {
    return <LandingPage />;
  }

  // 以下、認証済みユーザー用のレイアウト
  // ...
}
```

### 確認ポイント

- [ ] `AuthProvider` でラップされている
- [ ] Supabase 認証とデモ認証の両方に対応

---

## Step 8: 動作確認

### 8.1 デモ認証テスト

1. http://localhost:3000/login にアクセス
2. パスワード `fdc` でデモログイン
- [ ] ダッシュボードに遷移する

### 8.2 Google 認証テスト

1. http://localhost:3000/login にアクセス
2. 「Google でログイン」ボタンをクリック
- [ ] Google の認証画面にリダイレクトされる
3. Google アカウントでログイン
- [ ] コールバック後、ダッシュボードに遷移する
4. ユーザー名が表示される
- [ ] Google アカウントの名前が表示される

### 8.3 ログアウトテスト

1. ログアウトボタンをクリック
- [ ] ログインページにリダイレクトされる
2. 再度アクセス
- [ ] 認証が必要

---

## Step 9: 型チェックとビルド確認

```bash
# 型チェック
npm run type-check

# ビルド確認
npm run build
```

### 確認ポイント

- [ ] `npm run type-check` がエラーなしで完了
- [ ] `npm run build` がエラーなしで完了

---

## 完了チェックリスト

### 外部設定

- [ ] Google Cloud Console で OAuth クライアント ID を作成
- [ ] Supabase で Google プロバイダーを有効化
- [ ] リダイレクト URL を正しく設定

### ファイル作成

- [ ] `lib/supabase/client.ts` - ブラウザ用 Supabase クライアント
- [ ] `lib/supabase/server.ts` - サーバー用 Supabase クライアント
- [ ] `app/auth/callback/route.ts` - 認証コールバック

### ファイル修正

- [ ] `lib/contexts/AuthContext.tsx` - Supabase Auth 対応
- [ ] `app/login/page.tsx` - Google ログインボタン追加
- [ ] `app/(app)/layout.tsx` - AuthProvider 使用

### 機能確認

- [ ] Google でログインできる
- [ ] デモログイン（パスワード: fdc）も動作する
- [ ] ログアウトが正しく動作する
- [ ] 認証状態がページリロード後も保持される

### 品質確認

- [ ] `npm run type-check` がエラーなし
- [ ] `npm run build` がエラーなし

---

## 次のステップ

Phase 3 が完了したら、Phase 4 に進みます：
- Supabase Database との連携
- タスクデータのクラウド保存
- ユーザーごとのデータ分離

---

## トラブルシューティング

### Google ログインがリダイレクトループする

1. Supabase の Site URL が正しいか確認
2. Google Cloud Console のリダイレクト URI が正しいか確認
3. `app/auth/callback/route.ts` が存在するか確認

### 「Invalid redirect URL」エラー

Supabase ダッシュボードの「Authentication」→「URL Configuration」で:
- Redirect URLs に `http://localhost:3000/**` を追加

### セッションが保持されない

- ブラウザの Cookie が有効か確認
- `@supabase/ssr` が正しくインストールされているか確認

### Google 認証画面が表示されない

- Google Cloud Console で OAuth 同意画面が公開されているか確認
- テストユーザーに自分のアカウントが追加されているか確認

---

## 環境変数の確認

`.env.local` に以下が設定されていることを確認:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Google の認証情報は Supabase ダッシュボードで設定するため、
`.env.local` への追加は不要です。
