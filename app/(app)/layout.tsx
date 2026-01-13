'use client';

/**
 * app/(app)/layout.tsx
 *
 * 認証済みユーザー用レイアウト（Phase 3: Supabase Auth 対応）
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import LandingPage from '@/components/landing/default/LandingPage';
import {
  LayoutDashboard,
  LogOut,
  CheckSquare,
  Users,
  Briefcase,
  Map,
  Target,
  Grid2X2,
  Palette,
  LayoutGrid,
  Package,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/matrix', label: 'マトリクス', icon: Grid2X2 },
  { href: '/okr', label: 'OKR', icon: Target },
  { href: '/action-maps', label: 'Action Map', icon: Map },
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
  { href: '/leads', label: 'リード', icon: Users },
  { href: '/clients', label: 'クライアント', icon: Briefcase },
  { href: '/brand', label: 'ブランド', icon: Palette },
  { href: '/lean-canvas', label: 'Lean Canvas', icon: LayoutGrid },
  { href: '/product-sections', label: '製品セクション', icon: Package },
  { href: '/mvv', label: 'MVV', icon: Target },
];

// デモユーザーの型
interface DemoUser {
  id: string;
  email: string;
  name: string;
}

// 内部コンポーネント: 認証状態に応じてレンダリング
function AppContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: supabaseUser, isLoading: supabaseLoading, signOut } = useAuth();

  // デモユーザー（localStorage）
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [demoLoading, setDemoLoading] = useState(true);

  // デモセッションをチェック
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
    setDemoLoading(false);
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(async () => {
    // Supabase セッションがあればサインアウト
    if (supabaseUser) {
      await signOut();
    }
    // デモセッションも削除
    localStorage.removeItem('fdc_session');
    setDemoUser(null);
    router.push('/login');
  }, [supabaseUser, signOut, router]);

  // ローディング中
  if (supabaseLoading || demoLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        読み込み中...
      </div>
    );
  }

  // 認証済みユーザーを取得（Supabase優先）
  const currentUser = supabaseUser || demoUser;

  // ユーザー表示名
  const displayName = supabaseUser
    ? supabaseUser.user_metadata?.full_name || supabaseUser.email
    : demoUser?.name || demoUser?.email;

  // 未認証時はLPを表示
  if (!currentUser) {
    return <LandingPage />;
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="header">
        <div className="header-content">
          <h1>FDC Modular</h1>
          <p className="subtitle">Founders Direct Cockpit - 学習用スターター</p>
        </div>
        <div className="header-actions">
          <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
            {displayName}
          </span>
          <button className="btn btn-secondary btn-small" onClick={handleLogout}>
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="container">
        <nav className="tabs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`tab ${pathname === item.href ? 'active' : ''}`}
              >
                <Icon className="tab-icon" size={20} />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* メインコンテンツ */}
        <main>{children}</main>
      </div>
    </>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
