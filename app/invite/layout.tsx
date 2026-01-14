'use client';

/**
 * app/invite/layout.tsx
 *
 * 招待関連ページのレイアウト
 */

import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
