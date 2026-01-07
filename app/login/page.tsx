'use client';

/**
 * app/login/page.tsx
 *
 * ログインページ（Phase 3: Google OAuth 対応）
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, Rocket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError('Google ログインに失敗しました');
        setIsGoogleLoading(false);
      }
    } catch {
      setError('Google ログインに失敗しました');
      setIsGoogleLoading(false);
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
          disabled={isGoogleLoading}
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
          {isGoogleLoading ? 'ログイン中...' : 'Google でログイン'}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-container">
          <div className="login-card">
            <p>読み込み中...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
