'use client';

/**
 * app/invite/accept/page.tsx
 *
 * 招待承諾ページ
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

type AcceptStatus = 'loading' | 'success' | 'error' | 'login-required';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<AcceptStatus>('loading');
  const [message, setMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus('error');
      setMessage('招待トークンが見つかりません');
      return;
    }

    if (!user) {
      setStatus('login-required');
      setMessage('招待を承諾するにはログインが必要です');
      return;
    }

    // 招待を承諾
    const acceptInvitation = async () => {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'ワークスペースに参加しました');
          setWorkspaceId(data.workspaceId);
        } else {
          setStatus('error');
          setMessage(data.error || '招待の承諾に失敗しました');
        }
      } catch (err) {
        console.error('Accept invitation error:', err);
        setStatus('error');
        setMessage('エラーが発生しました');
      }
    };

    acceptInvitation();
  }, [token, user, authLoading]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGoToLogin = () => {
    // ログイン後にこのページに戻るようにリダイレクト
    const returnUrl = `/invite/accept?token=${token}`;
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <div className="invite-accept-page">
      <div className="invite-accept-card">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin" size={48} />
            <h1>招待を処理中...</h1>
            <p>しばらくお待ちください</p>
          </>
        )}

        {status === 'login-required' && (
          <>
            <LogIn size={48} style={{ color: 'var(--ws-secondary)' }} />
            <h1>ログインが必要です</h1>
            <p>{message}</p>
            <button onClick={handleGoToLogin} className="btn btn-primary">
              ログインページへ
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} style={{ color: 'var(--ws-success)' }} />
            <h1>参加完了</h1>
            <p>{message}</p>
            <button onClick={handleGoToDashboard} className="btn btn-primary">
              ダッシュボードへ
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} style={{ color: 'var(--ws-primary)' }} />
            <h1>エラー</h1>
            <p>{message}</p>
            <button onClick={handleGoToDashboard} className="btn btn-secondary">
              ダッシュボードへ
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .invite-accept-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f3f4f6;
        }

        .invite-accept-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .invite-accept-card h1 {
          margin: 24px 0 12px;
          font-size: 24px;
          color: #111827;
        }

        .invite-accept-card p {
          margin: 0 0 24px;
          color: #6b7280;
        }

        .invite-accept-card .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .invite-accept-card .btn-primary {
          background: #2563eb;
          color: #ffffff;
        }

        .invite-accept-card .btn-primary:hover {
          background: #1d4ed8;
        }

        .invite-accept-card .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .invite-accept-card .btn-secondary:hover {
          background: #d1d5db;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        :global(.animate-spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="invite-accept-page">
      <div className="invite-accept-card">
        <Loader2 className="animate-spin" size={48} />
        <h1>読み込み中...</h1>
      </div>
      <style jsx>{`
        .invite-accept-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f3f4f6;
        }
        .invite-accept-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .invite-accept-card h1 {
          margin: 24px 0 12px;
          font-size: 24px;
          color: #111827;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        :global(.animate-spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
