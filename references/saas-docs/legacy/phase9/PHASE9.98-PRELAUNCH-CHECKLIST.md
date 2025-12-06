# Phase 9.98: Web公開前チェックリスト対応

**作成日**: 2025-11-27
**目的**: Zennチェックリストに基づく公開前セキュリティ・UX対応

---

## 概要

Phase 9.98 では、Webサービス公開前の業界標準チェックリストに基づき、
残存する対応項目を完了させる。

### 対応項目サマリ

| カテゴリ | 項目数 | 優先度 |
|---------|--------|--------|
| セキュリティヘッダー | 3 | 高 |
| favicon/apple-touch-icon | 2 | 中 |
| OGP設定 | 4 | 中 |
| エラーページ | 2 | 中 |

---

## DOD（完了定義）

- [x] セキュリティヘッダー（HSTS, X-Frame-Options相当, X-Content-Type-Options）が設定されている
- [x] favicon.ico が設置されている（`app/icon.tsx` 動的生成）
- [x] apple-touch-icon.png が設置されている（`app/apple-icon.tsx` 動的生成）
- [x] ログインページにOGPメタタグが設定されている（`app/login/layout.tsx`）
- [x] 404ページがカスタマイズされている（`app/not-found.tsx`）
- [x] 500エラーページがカスタマイズされている（`app/error.tsx`, `app/global-error.tsx`）
- [x] `npm run build` が成功する
- [x] `npm run type-check` が成功する

**完了日**: 2025-11-27

---

## Task 9.98-A: セキュリティヘッダー設定

### 対象ファイル
- `next.config.mjs`

### 追加するヘッダー

```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ],
  },
],
```

---

## Task 9.98-B: favicon / apple-touch-icon 設置

### 対象ファイル
- `app/favicon.ico` (新規)
- `app/apple-touch-icon.png` (新規)
- `app/icon.tsx` (新規 - Next.js 13+ 動的生成)

### 仕様
- favicon: 32x32 ICO形式
- apple-touch-icon: 180x180 PNG形式
- ブランドカラー: #00B8C4（FDCプライマリカラー）

---

## Task 9.98-C: OGP設定（ログインページ）

### 対象ファイル
- `app/login/page.tsx` → メタデータ追加

### 追加するメタデータ

```typescript
export const metadata: Metadata = {
  title: 'ログイン | Founders Direct Cockpit',
  description: '自走型AI開発基盤 - Googleアカウントでログイン',
  openGraph: {
    title: 'Founders Direct Cockpit',
    description: '自走型AI開発基盤',
    url: 'https://app.foundersdirect.jp/login',
    siteName: 'Founders Direct Cockpit',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Founders Direct Cockpit',
    description: '自走型AI開発基盤',
  },
};
```

---

## Task 9.98-D: カスタムエラーページ

### 対象ファイル
- `app/not-found.tsx` (新規) - 404ページ
- `app/error.tsx` (新規) - 500エラーページ
- `app/global-error.tsx` (新規) - ルートエラーページ

### 要件
- FDCブランドデザインに統一
- トップページ（/login）へのリンク
- エラーメッセージの明確化

---

## 検証手順

### 1. ローカルビルド確認
```bash
npm run type-check
npm run build
```

### 2. セキュリティヘッダー確認
```bash
# ローカルで確認
npm run dev
curl -I http://localhost:3000/login
```

### 3. Lighthouse確認
```bash
npx lighthouse https://app.foundersdirect.jp --view
```

---

## 対応済み項目（Phase 9.94までで完了）

- [x] Cookie属性（HttpOnly, Secure, SameSite=Lax, Domain未指定）
- [x] サーバーサイドバリデーション（Zod）
- [x] SQLインジェクション対策（Supabase SDK）
- [x] XSS対策（dangerouslySetInnerHTML未使用）
- [x] レート制限
- [x] RBAC認可
- [x] 暗号化（AES-256-GCM）
- [x] 監査ログ
- [x] lang="ja" 設定
- [x] next/font フォント最適化
- [x] WCAG 2.1 AA準拠
- [x] モバイル対応（375px崩れなし）

---

## リリース判定

Phase 9.98 完了後:
- 全DOD項目がチェック済み
- ビルド成功
- 本番デプロイ可能

