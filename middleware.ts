/**
 * middleware.ts
 *
 * Next.js 15 Middleware - 認証チェックとリダイレクト
 *
 * 【責務】
 * - Cookie ベースのセッション検証
 * - 未認証ユーザーを /login へリダイレクト
 * - 認証済みユーザーの / へのアクセスを /dashboard へリダイレクト
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cookie からセッション情報を取得
  const fdcSession = request.cookies.get('fdc_session');
  const hasSession = !!fdcSession?.value;

  // ルートパス (/) へのアクセス
  if (pathname === '/') {
    if (hasSession) {
      // 認証済み → /dashboard へリダイレクト
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // 未認証 → ランディングページを表示
    return NextResponse.next();
  }

  // ログインページへのアクセス
  if (pathname === '/login') {
    if (hasSession) {
      // 既にログイン済み → /dashboard へリダイレクト
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 公開ページ（認証不要）
  const publicPaths = ['/terms', '/privacy', '/legal', '/about'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 保護されたパス（/dashboard, /leads, /clients など）
  // Note: localStorage での認証チェックは layout.tsx で行うため、
  // middleware では Cookie がなくても通過させる（Phase 0-2 の仕様）
  // Phase 3 以降で Supabase Auth 導入時に Cookie ベースに移行
  return NextResponse.next();
}

/**
 * Middleware を適用するパスの設定
 */
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - api (API routes)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico, manifest.json
     * - 画像ファイル
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
