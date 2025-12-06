# Phase 9.94-A: パフォーマンス & 最適化ワークストリーム

**作成日:** 2025-11-25
**親ランブック:** `docs/PHASE9.94-POLISH-RUNBOOK.md`
**担当:** ____
**期間:** Day 1-5

---

## 1. 目的

Lighthouse Performance 90+ を達成し、RSC 本格導入の基盤を構築する。

---

## 2. 必読ドキュメント

| ドキュメント | パス | 確認 |
|-------------|------|------|
| **Phase 9.94 メインランブック** | `docs/PHASE9.94-POLISH-RUNBOOK.md` | [ ] |
| **パフォーマンス基準** | `docs/PERFORMANCE-BASELINE.md` | [ ] |
| **RSC PoC レポート** | `docs/RSC-POC-REPORT.md` | [ ] |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | [ ] |

---

## 3. 現状と目標

| 指標 | Phase 9.93 実績 | Phase 9.94 目標 | CI 閾値 | 根拠 |
|------|----------------|----------------|---------|------|
| Dashboard First Load JS | 145 KB | **120 KB** | 130 KB | 実績から15%削減目標 |
| 共有チャンク合計 | 102 KB | **95 KB** | 100 KB | 100KB以下が業界標準 |
| 合計静的チャンク | 1.2 MB | **1.0 MB** | 1.1 MB | 1MB以下が理想 |
| Lighthouse Performance | 未計測（推定70） | **90+** | 85 | Core Web Vitals 基準 |
| LCP | 未計測 | **< 2.0s** | 2.5s | Good 判定基準 |
| FCP | 未計測 | **< 1.5s** | 1.8s | Good 判定基準 |

---

## 4. タスク一覧

| # | タスク | 期日 | 完了判定 | 完了 |
|---|--------|------|---------|------|
| A-01 | Lighthouse 初回計測（本番ビルド） | Day 1 | 全ページのスコア記録 | [ ] |
| A-02 | RSC 本格導入: Reports ページ | Day 2-3 | TTFB 30%改善 | [ ] |
| A-03 | RSC 本格導入: Dashboard KPI | Day 3-4 | SSG/ISR 適用 | [ ] |
| A-04 | next/image 置換（3箇所） | Day 2 | `no-img-element` 警告 0 | [ ] |
| A-05 | 未使用 CSS 削除 | Day 2 | globals.css 600行以下 | [ ] |
| A-06 | フォント最適化（next/font） | Day 3 | FOUT 解消 | [ ] |
| A-07 | デプロイ警告解消 | Day 4 | Vercel デプロイログ警告 0 | [ ] |
| A-08 | Lighthouse 最終計測 | Day 5 | Performance 90+ | [ ] |

---

## 5. 実装詳細

### 5.1 A-01: Lighthouse 初回計測

```bash
# 本番ビルド
npm run build && npm run start

# 別ターミナルで Lighthouse 実行
npx lighthouse http://localhost:3000/dashboard --output json --output-path ./lighthouse-baseline.json

# または Chrome DevTools → Lighthouse タブ
```

**記録対象ページ:**
- `/login`
- `/dashboard`
- `/leads`
- `/clients`
- `/reports`

### 5.2 A-02: Reports ページ RSC 化

**現状（Client Component）:**
```tsx
// app/(app)/reports/page.tsx
'use client';
import { useReportsViewModel } from '@/lib/hooks/useReportsViewModel';

export default function ReportsPage() {
  const { data, isLoading } = useReportsViewModel();
  // ...
}
```

**目標（Server Component）:**
```tsx
// app/(app)/reports/page.tsx - Server Component
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReportsContent } from './_components/ReportsContent';
import { getReportData } from '@/lib/server/reports';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('fdc_session');

  if (!session?.value) {
    redirect('/login');
  }

  const data = await getReportData(session.value);
  return <ReportsContent initialData={data} />;
}
```

```tsx
// app/(app)/reports/_components/ReportsContent.tsx - Client Component
'use client';
import { useState } from 'react';
import type { ReportData } from '@/lib/types/app-data';

interface Props {
  initialData: ReportData;
}

export function ReportsContent({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  // ... インタラクティブな部分のみ Client Component
}
```

**認証ヘルパー（共通化）:**
```tsx
// lib/server/auth.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('fdc_session');

  if (!session?.value) {
    redirect('/login');
  }

  // セッション検証
  const validated = await validateSession(session.value);
  if (!validated) {
    redirect('/login');
  }

  return validated;
}
```

### 5.3 A-03: Dashboard KPI の SSG/ISR 化

```tsx
// app/(app)/dashboard/_components/KPISection.tsx
// 静的データ部分を Server Component に分離

export async function KPISection({ workspaceId }: { workspaceId: string }) {
  const stats = await getWorkspaceStats(workspaceId);

  return (
    <div className="kpi-grid">
      <KPICard title="リード数" value={stats.leadsCount} />
      <KPICard title="クライアント数" value={stats.clientsCount} />
      {/* ... */}
    </div>
  );
}
```

### 5.4 A-04: next/image 置換

**対象ファイル検索:**
```bash
npm run lint 2>&1 | grep "no-img-element"
```

**修正例:**
```tsx
// Before
<img src="/logo.png" alt="Logo" />

// After
import Image from 'next/image';
<Image src="/logo.png" alt="Logo" width={120} height={40} />
```

### 5.5 A-05: 未使用 CSS 削除

**手順:**
1. PurgeCSS または手動で未使用セレクタを検出
2. 旧 UI 固有クラス（`.legacy-*`）を削除
3. 重複定義を統合

```bash
# 現在の行数確認
wc -l app/globals.css

# 目標: 786行 → 600行以下
```

### 5.6 A-06: フォント最適化

```tsx
// app/layout.tsx
import { Noto_Sans_JP } from 'next/font/google';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body>{children}</body>
    </html>
  );
}
```

### 5.7 A-07: デプロイ警告解消

**よくある警告と対処:**

| 警告 | 対処 |
|------|------|
| `Image with src has no width/height` | width/height を指定 or fill 使用 |
| `Unsized image warning` | Image コンポーネントにサイズ指定 |
| `Large page data warning` | getStaticProps のデータ削減 |
| `Slow build warning` | 動的インポートでコード分割 |
| `Experimental feature warning` | next.config.js の設定確認 |

---

## 6. 依存関係

| 依存先 | 内容 | 影響 |
|--------|------|------|
| WS-D (CI基盤) | Lighthouse CI | Day 3 以降に自動計測可能 |

---

## 7. 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | Lighthouse Performance 90+ | `npm run lighthouse` | [ ] |
| 2 | Dashboard First Load JS ≤ 130KB | ビルド出力確認 | [ ] |
| 3 | Reports ページが RSC で動作 | ページ読み込み確認 | [ ] |
| 4 | `no-img-element` 警告 0件 | `npm run lint` | [ ] |
| 5 | LCP < 2.5s | Lighthouse レポート | [ ] |
| 6 | globals.css 600行以下 | `wc -l` 確認 | [ ] |
| 7 | Vercel デプロイ警告 0件 | デプロイログ確認 | [ ] |

---

## 8. 日次進捗記録

| 日付 | 完了タスク | ブロッカー | 明日の予定 |
|------|-----------|-----------|-----------|
| Day 1 | | | |
| Day 2 | | | |
| Day 3 | | | |
| Day 4 | | | |
| Day 5 | | | |

---

**最終更新:** 2025-11-25
