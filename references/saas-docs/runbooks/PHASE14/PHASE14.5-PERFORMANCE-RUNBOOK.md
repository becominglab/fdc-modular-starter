# Phase 14.5: パフォーマンス最適化ランブック

## 概要

foundersdirectアプリケーションの反応時間・表示時間を改善するための実装ガイドです。

**Phase**: 14.5
**対象バージョン**: v2.8.3+
**最終更新**: 2025-12-02
**ステータス**: Phase 14.5 完了 ✅✅✅✅✅

---

## 目次

1. [現状分析](#1-現状分析)
2. [Phase 1: next/Image 導入](#phase-1-nextimage-導入)
3. [Phase 2: リスト仮想化](#phase-2-リスト仮想化)
4. [Phase 3: コンポーネント分割](#phase-3-コンポーネント分割)
5. [Phase 4: キャッシュ戦略最適化](#phase-4-キャッシュ戦略最適化)
6. [Phase 5: Service Worker / PWA](#phase-5-service-worker--pwa)
7. [計測・検証方法](#計測検証方法)
8. [ロールバック手順](#ロールバック手順)

---

## 1. 現状分析

### 1.1 既に実装済みの最適化

| 項目 | 実装状況 | 場所 |
|------|----------|------|
| dynamic import | ✅ 7タブ | `app/(app)/dashboard/components/TabContents.tsx` |
| Vercel KV キャッシュ | ✅ 60秒TTL | `lib/server/workspace-cache.ts` |
| useMemo/useCallback | ✅ 373箇所 | 各コンポーネント |
| React.memo | ✅ 5コンポーネント | ClientCard, AddClientForm等 |
| バンドルサイズ監視 | ✅ | `scripts/check-bundle-size.cjs` |
| Gzip圧縮 | ✅ | `lib/server/workspace-cache.ts` |

### 1.2 現在のバンドルサイズ

| ルート | サイズ | 制限 | 余裕 |
|--------|--------|------|------|
| /dashboard | 514 KB | 600 KB | 14.3% |
| /login | 545 KB | 650 KB | 16.2% |
| /leads | 377 KB | 450 KB | 16.2% |
| /clients | 358 KB | 430 KB | 16.8% |
| /reports | 355 KB | 430 KB | 17.4% |

### 1.3 改善対象

| 項目 | 現状 | 期待効果 |
|------|------|----------|
| next/Image | ✅ 全ファイル導入完了 | LCP 15-25%改善 |
| リスト仮想化 | ✅ 導入完了（AuditLogs, ListView） | TTI 20-30%改善 |
| コンポーネント分割 | △ 部分的 | 初期ロード10%改善 |
| キャッシュTTL最適化 | △ 固定60秒 | API応答30-50%改善 |
| Service Worker | ❌ 未実装 | オフライン対応 |

---

## Phase 1: next/Image 導入

### 1.1 目的

- LCP (Largest Contentful Paint) の改善
- 画像の自動最適化・WebP変換
- 遅延読み込みの自動適用

### 1.2 対象ファイル

```
app/(marketing)/LandingPage.tsx      # 最優先
app/_components/common/UserAvatar.tsx
app/_components/settings/ProfileSection.tsx
```

### 1.3 実装手順

#### Step 1: LandingPage.tsx の画像最適化

```typescript
// Before
<img src="/apple-touch-icon.png" alt="FDC" className={styles.logoIcon} />

// After
import Image from 'next/image';

<Image
  src="/apple-touch-icon.png"
  alt="FDC"
  width={32}
  height={32}
  priority  // ファーストビューの画像は priority を付ける
  className={styles.logoIcon}
/>
```

#### Step 2: ユーザーアバター画像の最適化

```typescript
// lib/components/UserAvatar.tsx
import Image from 'next/image';

export function UserAvatar({ src, name, size = 40 }: UserAvatarProps) {
  if (!src) {
    return <div className="avatar-placeholder">{name?.[0]}</div>;
  }

  return (
    <Image
      src={src}
      alt={name || 'ユーザー'}
      width={size}
      height={size}
      className="avatar-image"
      // Google プロフィール画像は外部URL
      unoptimized={src.includes('googleusercontent.com')}
    />
  );
}
```

#### Step 3: next.config.mjs の確認

```javascript
// 既に設定済み - 変更不要
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'www.foundersdirect.jp',
      pathname: '/**',
    },
  ],
},
```

### 1.4 検証コマンド

```bash
# ビルド確認
npm run build

# Lighthouse でLCP計測
npx lighthouse http://localhost:3000 --only-categories=performance
```

### 1.5 期待される効果

- LCP: 2.5s → 2.0s (20%改善)
- 画像転送サイズ: 30-50%削減

---

## Phase 2: リスト仮想化

### 2.1 目的

- 大量データ表示時のレンダリング性能向上
- メモリ使用量の削減
- スクロール操作の滑らかさ向上

### 2.2 対象コンポーネント

| コンポーネント | 想定データ量 | 優先度 |
|----------------|-------------|--------|
| ProspectsList | 100-1000件 | 高 |
| ClientsList | 50-500件 | 高 |
| OKRObjectivesList | 10-50件 | 中 |
| MembersList | 10-100件 | 中 |
| AuditLogsList | 100-10000件 | 高 |

### 2.3 実装手順

#### Step 1: react-window インストール

```bash
npm install react-window
npm install -D @types/react-window
```

#### Step 2: 仮想化リストコンポーネント作成

```typescript
// lib/components/VirtualizedList.tsx
'use client';

import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { CSSProperties, ReactNode } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>
      {renderItem(items[index], index, style)}
    </div>
  );

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      className={className}
    >
      {Row}
    </FixedSizeList>
  );
}
```

#### Step 3: ProspectsList への適用

```typescript
// app/_components/prospects/ProspectsList.tsx
import { VirtualizedList } from '@/lib/components/VirtualizedList';
import { ProspectCard } from './ProspectCard';

export function ProspectsList({ prospects }: ProspectsListProps) {
  // 50件以上の場合のみ仮想化を適用
  if (prospects.length < 50) {
    return (
      <div className="prospects-list">
        {prospects.map(p => <ProspectCard key={p.id} prospect={p} />)}
      </div>
    );
  }

  return (
    <VirtualizedList
      items={prospects}
      height={600}
      itemHeight={80}
      renderItem={(prospect, index, style) => (
        <ProspectCard
          key={prospect.id}
          prospect={prospect}
          style={style}
        />
      )}
    />
  );
}
```

#### Step 4: 可変高さリスト（VariableSizeList）

```typescript
// より複雑なレイアウト用
import { VariableSizeList } from 'react-window';

export function VariableHeightList<T>({
  items,
  height,
  getItemHeight,
  renderItem,
}: VariableHeightListProps<T>) {
  return (
    <VariableSizeList
      height={height}
      itemCount={items.length}
      itemSize={(index) => getItemHeight(items[index], index)}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {renderItem(items[index], index)}
        </div>
      )}
    </VariableSizeList>
  );
}
```

### 2.4 検証方法

```typescript
// テスト: 1000件のデータでパフォーマンス計測
const mockProspects = Array.from({ length: 1000 }, (_, i) => ({
  id: `prospect-${i}`,
  name: `見込み客 ${i}`,
  // ...
}));

// React DevTools Profiler で計測
// 目標: 初期レンダリング < 100ms
```

### 2.5 期待される効果

- 1000件表示時: 3s → 0.3s (90%改善)
- メモリ使用量: 50%削減
- スクロールFPS: 30 → 60

---

## Phase 3: コンポーネント分割

### 3.1 目的

- 初期バンドルサイズの削減
- コード分割の最適化
- 保守性の向上

### 3.2 対象ファイル

| ファイル | 行数 | 分割後 |
|----------|------|--------|
| LandingPage.tsx | 850行 | 6ファイル |
| DashboardTabSection.tsx | 500行+ | 3ファイル |
| AdminTab.tsx | 400行+ | 4ファイル |

### 3.3 実装手順

#### Step 1: LandingPage.tsx の分割

```
app/(marketing)/
├── LandingPage.tsx          # メインコンポーネント（100行）
└── sections/
    ├── HeroSection.tsx      # ヒーローセクション
    ├── FeaturesSection.tsx  # 機能紹介
    ├── PricingSection.tsx   # 料金プラン
    ├── FAQSection.tsx       # よくある質問
    ├── CTASection.tsx       # CTA
    └── FooterSection.tsx    # フッター
```

```typescript
// app/(marketing)/LandingPage.tsx
import dynamic from 'next/dynamic';

const HeroSection = dynamic(() => import('./sections/HeroSection'));
const FeaturesSection = dynamic(() => import('./sections/FeaturesSection'));
const PricingSection = dynamic(() => import('./sections/PricingSection'));
const FAQSection = dynamic(() => import('./sections/FAQSection'));

export function LandingPage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
    </main>
  );
}
```

#### Step 2: AdminTab の分割

```
app/_components/admin/
├── AdminTab.tsx             # メイン（50行）
├── sections/
│   ├── InviteSection.tsx    # 招待リンク
│   ├── MembersSection.tsx   # メンバー管理
│   ├── AuditLogsSection.tsx # 監査ログ
│   └── CSVSection.tsx       # CSV管理
└── OrgManagement.tsx        # 組織管理（既存）
```

```typescript
// app/_components/admin/AdminTab.tsx
import { lazy, Suspense } from 'react';
import { TabLoading } from '../common/TabLoading';

const InviteSection = lazy(() => import('./sections/InviteSection'));
const MembersSection = lazy(() => import('./sections/MembersSection'));
const AuditLogsSection = lazy(() => import('./sections/AuditLogsSection'));
const CSVSection = lazy(() => import('./sections/CSVSection'));
const OrgManagement = lazy(() => import('./OrgManagement'));

export function AdminTab({ activeSection }: AdminTabProps) {
  return (
    <Suspense fallback={<TabLoading />}>
      {activeSection === 'invite' && <InviteSection />}
      {activeSection === 'members' && <MembersSection />}
      {activeSection === 'audit' && <AuditLogsSection />}
      {activeSection === 'csv' && <CSVSection />}
      {activeSection === 'org' && <OrgManagement />}
    </Suspense>
  );
}
```

### 3.4 検証コマンド

```bash
# バンドルサイズ確認
npm run build
node scripts/check-bundle-size.cjs

# 分割効果の確認
npx @next/bundle-analyzer
```

### 3.5 期待される効果

- /dashboard 初期ロード: 514KB → 450KB (12%削減)
- First Contentful Paint: 10%改善

---

## Phase 4: キャッシュ戦略最適化

### 4.1 目的

- API応答時間の短縮
- サーバー負荷の軽減
- ユーザー体験の向上

### 4.2 現状のキャッシュ設定

```typescript
// lib/server/workspace-cache.ts
const WORKSPACE_DATA_TTL = 60; // 全データ一律60秒
```

### 4.3 実装手順

#### Step 1: リソース別TTL設定

```typescript
// lib/server/cache-config.ts
export const CACHE_STRATEGIES = {
  // 頻繁に変更されるデータ
  workspace_data: {
    ttl: 60,
    staleWhileRevalidate: 120,
  },

  // 比較的安定したデータ
  user_profile: {
    ttl: 300,
    staleWhileRevalidate: 600,
  },

  // ほぼ変更されないデータ
  workspace_config: {
    ttl: 3600,
    staleWhileRevalidate: 7200,
  },

  // 統計データ（計算コストが高い）
  dashboard_stats: {
    ttl: 120,
    staleWhileRevalidate: 300,
  },
} as const;

export type CacheKey = keyof typeof CACHE_STRATEGIES;
```

#### Step 2: SWR パターンの実装

```typescript
// lib/server/workspace-cache.ts に追加
import { CACHE_STRATEGIES, CacheKey } from './cache-config';

export async function getCachedWithSWR<T>(
  key: string,
  cacheType: CacheKey,
  fetchFn: () => Promise<T>
): Promise<T> {
  const strategy = CACHE_STRATEGIES[cacheType];
  const cacheKey = `${cacheType}:${key}`;

  // キャッシュから取得
  const cached = await cache.get<{ data: T; timestamp: number }>(cacheKey);

  if (cached) {
    const age = Date.now() - cached.timestamp;

    // 新鮮なキャッシュ
    if (age < strategy.ttl * 1000) {
      return cached.data;
    }

    // Stale キャッシュ - バックグラウンドで更新
    if (age < strategy.staleWhileRevalidate * 1000) {
      // 非同期で更新（待たない）
      refreshCacheInBackground(cacheKey, fetchFn, strategy.ttl);
      return cached.data;
    }
  }

  // キャッシュミス - 同期的に取得
  const fresh = await fetchFn();
  await cache.set(cacheKey, { data: fresh, timestamp: Date.now() }, strategy.ttl);
  return fresh;
}

async function refreshCacheInBackground<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
) {
  try {
    const fresh = await fetchFn();
    await cache.set(key, { data: fresh, timestamp: Date.now() }, ttl);
  } catch (error) {
    console.error(`[Cache] Background refresh failed for ${key}:`, error);
  }
}
```

#### Step 3: API エンドポイントへの適用

```typescript
// app/api/workspaces/[workspaceId]/data/route.ts
import { getCachedWithSWR } from '@/lib/server/workspace-cache';

export async function GET(request: Request, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;

  const data = await getCachedWithSWR(
    workspaceId,
    'workspace_data',
    () => fetchWorkspaceDataFromDB(workspaceId)
  );

  return NextResponse.json(data);
}
```

### 4.4 検証方法

```bash
# キャッシュヒット率の確認
# ログに出力される [Cache] HIT/MISS を集計

# API応答時間の計測
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/workspaces/1/data
```

### 4.5 期待される効果

- キャッシュヒット時: 5ms以下
- キャッシュミス時: 50-100ms
- サーバー負荷: 30%削減

---

## Phase 5: Service Worker / PWA

### 5.1 目的

- オフライン対応
- 再訪問時の高速化
- プッシュ通知対応（将来）

### 5.2 実装手順

#### Step 1: Service Worker 作成

```typescript
// public/sw.js
const CACHE_NAME = 'foundersdirect-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/leads',
  '/clients',
  '/apple-touch-icon.png',
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// フェッチ時の戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエスト: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静的アセット: Cache First
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
```

#### Step 2: Service Worker 登録

```typescript
// app/(app)/layout.tsx に追加
'use client';

import { useEffect } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
  }, []);

  return <>{children}</>;
}
```

#### Step 3: manifest.json 作成

```json
// public/manifest.json
{
  "name": "Founders Direct CRM",
  "short_name": "FDC",
  "description": "スタートアップ向けCRM・営業管理ツール",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

### 5.3 検証方法

```bash
# PWA監査
npx lighthouse http://localhost:3000 --only-categories=pwa

# オフラインテスト
# Chrome DevTools > Network > Offline でテスト
```

### 5.4 期待される効果

- 再訪問時ロード: 50%高速化
- オフライン時: 基本機能の閲覧可能

---

## 計測・検証方法

### Core Web Vitals 計測

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000 --only-categories=performance --output=json --output-path=./lighthouse-report.json

# Web Vitals ライブラリ（既に導入済み）
# Vercel Speed Insights で自動計測
```

### バンドルサイズ計測

```bash
# ビルド時に自動計測
npm run build

# 詳細分析
npx @next/bundle-analyzer
```

### API パフォーマンス計測

```typescript
// lib/server/performance.ts
export function measureApiTime(label: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[API] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
}

// 使用例
const timer = measureApiTime('GET /workspaces/:id/data');
const data = await fetchData();
timer.end();
```

---

## ロールバック手順

### Phase 1 (next/Image) ロールバック

```bash
# 変更したファイルを元に戻す
git checkout HEAD~1 -- app/(marketing)/LandingPage.tsx
git checkout HEAD~1 -- app/_components/common/UserAvatar.tsx
```

### Phase 2 (リスト仮想化) ロールバック

```bash
# react-window を削除
npm uninstall react-window @types/react-window

# 変更したファイルを元に戻す
git checkout HEAD~1 -- app/_components/prospects/ProspectsList.tsx
```

### Phase 4 (キャッシュ) ロールバック

```bash
# キャッシュ設定を元に戻す
git checkout HEAD~1 -- lib/server/workspace-cache.ts
git checkout HEAD~1 -- lib/server/cache-config.ts
```

### Phase 5 (Service Worker) ロールバック

```bash
# Service Worker を削除
rm public/sw.js
rm public/manifest.json

# 登録コードを削除
git checkout HEAD~1 -- app/(app)/layout.tsx
```

---

## チェックリスト

### Phase 1: next/Image
- [ ] LandingPage.tsx の画像を next/Image に変更
- [ ] UserAvatar コンポーネントを作成
- [ ] ビルド確認
- [ ] LCP を計測

### Phase 2: リスト仮想化
- [ ] react-window をインストール
- [ ] VirtualizedList コンポーネント作成
- [ ] ProspectsList に適用
- [ ] ClientsList に適用
- [ ] パフォーマンス計測

### Phase 3: コンポーネント分割
- [ ] LandingPage.tsx を分割
- [ ] AdminTab.tsx を分割
- [ ] バンドルサイズ確認

### Phase 4: キャッシュ最適化
- [ ] cache-config.ts 作成
- [ ] SWR パターン実装
- [ ] API エンドポイントに適用
- [ ] キャッシュヒット率確認

### Phase 5: Service Worker
- [ ] sw.js 作成
- [ ] manifest.json 作成
- [ ] 登録コード追加
- [ ] PWA監査実行

---

## 参考資料

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [react-window](https://github.com/bvaughn/react-window)
- [Web Vitals](https://web.dev/vitals/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
