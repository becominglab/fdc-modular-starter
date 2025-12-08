/**
 * app/page.tsx
 *
 * ルートページ - ランディングページを表示
 * 未ログイン時はLPを表示、ログイン済みの場合はダッシュボードへリダイレクト
 */

import LandingPage from '@/components/landing/default/LandingPage';

export default function RootPage() {
  // TODO: Phase 24 で認証チェックを追加
  // ログイン済みの場合は redirect('/dashboard') を実行
  return <LandingPage />;
}
