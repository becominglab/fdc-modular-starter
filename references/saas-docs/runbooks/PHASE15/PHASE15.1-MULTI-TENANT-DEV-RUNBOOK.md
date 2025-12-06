# Phase 15.1: マルチテナント開発環境ランブック

> **Last Updated**: 2025-12-05
> **Status**: ✅ 完了

## 実装状況（2025-12-05 更新）

| 項目 | ステータス | 備考 |
|------|-----------|------|
| 設計ドキュメント | ✅ 完了 | このファイル |
| Supabase devプロジェクト | ✅ 完了 | 2025-12-05 |
| Vercel devプロジェクト | ✅ 完了 | 2025-12-05 |
| DNS設定（dev.foundersdirect.jp） | ✅ 完了 | 2025-12-05 |
| subdomain.ts 実装 | ⏳ 未着手 | 必要に応じて実装 |
| tenant-routing.ts 実装 | ⏳ 未着手 | 必要に応じて実装 |
| validation.ts 修正 | ⏳ 未着手 | 必要に応じて実装 |

**ステータス**: インフラ構築完了。コード側の実装は必要に応じて追加

---

## 概要

### 原則
| 環境 | サブドメイン | 用途 |
|------|-------------|------|
| **本番（デフォルト）** | `app.foundersdirect.jp` | 全ユーザー向け。指定なしの変更はここに適用 |
| **開発** | `dev.foundersdirect.jp` | 開発・テスト用。スーパーテナント権限 |
| **顧客テナント** | `{customer}.foundersdirect.jp` | 顧客専用環境（将来拡張） |

### dev環境の特権
- **スーパーテナント**: 全ワークスペースへのアクセス権限（テナント境界チェック緩和）
- **差分タブ表示**: 開発専用UIの表示
- **デバッグモード**: 詳細ログ出力

---

## 人間の作業（実装前に必要）

### 【必須】Supabase dev用プロジェクト作成

| 項目 | 作業者 | 内容 |
|------|--------|------|
| 1. Supabase新規プロジェクト作成 | 人間 | `foundersdirect-dev` プロジェクトを作成 |
| 2. DB URL取得 | 人間 | Project Settings → Database → Connection string |
| 3. Anon Key取得 | 人間 | Project Settings → API → anon public |
| 4. スキーマ適用 | Claude | 本番と同じマイグレーションを実行 |
| 5. シードデータ投入 | Claude | テスト用データを生成 |

**取得した値を以下に記入:**
```
SUPABASE_DEV_URL=https://xxxxxxxxxx.supabase.co
SUPABASE_DEV_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 【必須】Vercel dev用プロジェクト作成

| 項目 | 作業者 | 内容 |
|------|--------|------|
| 1. Vercel新規プロジェクト作成 | 人間 | `foundersdirect-dev` プロジェクト |
| 2. GitHubリポジトリ連携 | 人間 | 同じリポジトリ、`develop` ブランチ |
| 3. ドメイン設定 | 人間 | `dev.foundersdirect.jp` を追加 |
| 4. 環境変数設定 | 人間 | 下記の環境変数を設定 |
| 5. Auto Deploy OFF | 人間 | Settings → Git → Auto Deploy を無効化 |

**Vercel dev環境変数:**
```env
NEXT_PUBLIC_SUPABASE_URL=（上記で取得したdev URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（上記で取得したdev Anon Key）
FDC_SESSION_COOKIE_NAME=fdc_session_dev
FDC_SUPER_TENANT_MODE=true
FDC_ENVIRONMENT=development
```

### 【必須】DNS設定

| 項目 | 作業者 | 内容 |
|------|--------|------|
| dev.foundersdirect.jp | 人間 | Vercel devプロジェクトに向ける（CNAME） |

---

## ルーティング・仕様ルール

### サブドメイン判定優先順位
```
1. dev.foundersdirect.jp  → 開発環境（スーパーテナント）
2. app.foundersdirect.jp  → 本番環境（デフォルト）
3. {customer}.foundersdirect.jp → 顧客テナント
4. localhost / 127.0.0.1  → app扱い（ローカル開発）
5. dev.localhost          → dev扱い（ローカルdev開発）
```

### タブ適用ルール
| 条件 | 適用タブ |
|------|----------|
| 指定なし | `defaultTabs.ts`（app用） |
| サブドメイン専用 | `{subdomain}Tabs.ts` を追加 |
| dev専用 | `devTabs.ts` を追加 |
| 存在しない場合 | `defaultTabs.ts` にフォールバック |

---

## ファイル構造

### 新規作成ファイル
```
lib/
├── server/
│   ├── subdomain.ts          # サブドメイン判定ロジック（新規）
│   └── tenant-routing.ts     # テナント別タブ構成（新規）
│
components/
├── tabs/
│   ├── types.ts              # タブ定義の型（新規）
│   ├── defaultTabs.ts        # app用デフォルトタブ定義（新規）
│   └── devTabs.ts            # dev専用タブ定義（新規）
│
app/
├── _components/
│   └── dev/
│       ├── DevToolsTab.tsx       # 開発ツールタブ（新規）
│       └── FeaturePreviewTab.tsx # 機能プレビュータブ（新規）
```

### 修正ファイル
```
lib/
├── server/
│   └── tenants.ts            # extractSubdomain 修正
│
app/
├── api/
│   └── workspaces/[workspaceId]/data/handlers/
│       └── validation.ts     # テナント境界チェック修正（dev緩和）
```

---

## 実装コード

### 1. lib/server/subdomain.ts（新規）

```typescript
/**
 * lib/server/subdomain.ts
 *
 * Phase 15.1: サブドメイン判定・環境テーマ
 */

export type Environment = 'dev' | 'app' | 'customer';

export interface EnvironmentTheme {
  primaryColor: string;
  badge: string | null;
  badgeColor: string | null;
  isDev: boolean;
}

/**
 * ホスト名からサブドメインを抽出
 */
export function extractSubdomain(host: string): string {
  // dev.localhost の場合
  if (host.startsWith('dev.localhost') || host.startsWith('dev.127.0.0.1')) {
    return 'dev';
  }

  // localhost の場合はデフォルトで 'app'
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'app';
  }

  // サブドメインを抽出（例: dev.foundersdirect.jp → dev）
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  // サブドメインがない場合（foundersdirect.jp など）
  return 'app';
}

/**
 * サブドメインから環境タイプを判定
 */
export function getEnvironmentType(subdomain: string): Environment {
  if (subdomain === 'dev') {
    return 'dev';
  }
  if (subdomain === 'app') {
    return 'app';
  }
  return 'customer';
}

/**
 * 環境別テーマを取得
 */
export function getEnvironmentTheme(subdomain: string): EnvironmentTheme {
  if (subdomain === 'dev') {
    return {
      primaryColor: '#FF6B35',  // オレンジ（開発環境を示す）
      badge: 'DEV',
      badgeColor: '#FF6B35',
      isDev: true,
    };
  }

  return {
    primaryColor: '#00B8C4',  // 本番のターコイズ
    badge: null,
    badgeColor: null,
    isDev: false,
  };
}

/**
 * スーパーテナント（dev）かどうか判定
 */
export function isSuperTenant(subdomain: string): boolean {
  return subdomain === 'dev' || process.env.FDC_SUPER_TENANT_MODE === 'true';
}
```

### 2. lib/server/tenant-routing.ts（新規）

```typescript
/**
 * lib/server/tenant-routing.ts
 *
 * Phase 15.1: テナント別タブ構成
 */

import { TabDefinition } from '@/components/tabs/types';
import { defaultTabs } from '@/components/tabs/defaultTabs';
import { devOnlyTabs } from '@/components/tabs/devTabs';

/**
 * サブドメインに応じたタブ一覧を取得
 */
export function getTabsForSubdomain(subdomain: string): TabDefinition[] {
  const baseTabs = [...defaultTabs];

  // dev環境: 開発専用タブを追加
  if (subdomain === 'dev') {
    return [...baseTabs, ...devOnlyTabs];
  }

  // 顧客専用タブがあればマージ（将来拡張）
  // const customerTabs = await loadCustomerTabs(subdomain);
  // if (customerTabs) {
  //   return [...baseTabs, ...customerTabs];
  // }

  return baseTabs;
}

/**
 * 顧客専用タブをロード（将来拡張用）
 */
// async function loadCustomerTabs(subdomain: string): Promise<TabDefinition[] | null> {
//   try {
//     const module = await import(`@/components/tabs/${subdomain}Tabs`);
//     return module.default || module.customerTabs || null;
//   } catch {
//     return null;
//   }
// }
```

### 3. components/tabs/types.ts（新規）

```typescript
/**
 * components/tabs/types.ts
 *
 * Phase 15.1: タブ定義の型
 */

export interface TabDefinition {
  id: string;
  label: string;
  icon: string;
  component: string;
  devOnly?: boolean;  // dev環境でのみ表示
}
```

### 4. components/tabs/defaultTabs.ts（新規）

```typescript
/**
 * components/tabs/defaultTabs.ts
 *
 * Phase 15.1: app用デフォルトタブ定義
 */

import { TabDefinition } from './types';

export const defaultTabs: TabDefinition[] = [
  // 既存のタブはダッシュボードから取得
  // ここでは拡張用の構造のみ定義
];
```

### 5. components/tabs/devTabs.ts（新規）

```typescript
/**
 * components/tabs/devTabs.ts
 *
 * Phase 15.1: dev専用タブ定義
 */

import { TabDefinition } from './types';

export const devOnlyTabs: TabDefinition[] = [
  {
    id: 'dev-tools',
    label: 'Dev Tools',
    icon: 'Wrench',
    component: 'DevToolsTab',
    devOnly: true,
  },
  {
    id: 'feature-preview',
    label: 'Feature Preview',
    icon: 'Sparkles',
    component: 'FeaturePreviewTab',
    devOnly: true,
  },
];
```

### 6. validation.ts の修正（差分パッチ）

```diff
--- a/app/api/workspaces/[workspaceId]/data/handlers/validation.ts
+++ b/app/api/workspaces/[workspaceId]/data/handlers/validation.ts
@@ -10,6 +10,7 @@ import { supabase } from '@/lib/server/db';
 import { getSession } from '@/lib/server/auth';
 import { extractSubdomain } from '@/lib/server/tenants';
 import { apiLogger } from '@/lib/server/logger';
+import { isSuperTenant } from '@/lib/server/subdomain';
 import { isE2ETestRequest } from '@/lib/server/test-mode';

 export type ValidationResult =
@@ -77,6 +78,14 @@ export async function checkTenantBoundary(
   request: NextRequest,
   wsId: number
 ): Promise<{ success: true } | { success: false; response: NextResponse }> {
   const host = request.headers.get('host') || 'localhost';
   const currentSubdomain = extractSubdomain(host);
+
+  // Phase 15.1: スーパーテナント（dev）は全ワークスペースにアクセス可能
+  if (isSuperTenant(currentSubdomain)) {
+    apiLogger.debug({ subdomain: currentSubdomain }, '[API] Super tenant access granted');
+    return { success: true };
+  }

   const { data: currentTenant } = await supabase
     .from('tenants')
```

---

## テスト項目

### 1. dev環境では専用タブが表示される
```typescript
test('dev環境では専用タブが表示される', async ({ page }) => {
  await page.goto('http://dev.localhost:3000/dashboard');
  await expect(page.getByText('Dev Tools')).toBeVisible();
  await expect(page.getByText('Feature Preview')).toBeVisible();
});
```

### 2. app環境では専用タブが表示されない
```typescript
test('app環境では専用タブが表示されない', async ({ page }) => {
  await page.goto('http://app.localhost:3000/dashboard');
  await expect(page.getByText('Dev Tools')).not.toBeVisible();
  await expect(page.getByText('Feature Preview')).not.toBeVisible();
});
```

### 3. サブドメイン判定のエッジケース
```typescript
describe('extractSubdomain', () => {
  test.each([
    ['dev.foundersdirect.jp', 'dev'],
    ['app.foundersdirect.jp', 'app'],
    ['tom.foundersdirect.jp', 'tom'],
    ['foundersdirect.jp', 'app'],
    ['localhost:3000', 'app'],
    ['dev.localhost:3000', 'dev'],
    ['127.0.0.1:3000', 'app'],
    ['dev.127.0.0.1:3000', 'dev'],
    ['', 'app'],
  ])('host=%s → subdomain=%s', (host, expected) => {
    expect(extractSubdomain(host)).toBe(expected);
  });
});
```

### 4. スーパーテナントのアクセス権限
```typescript
test('dev環境から他テナントのワークスペースにアクセス可能', async ({ page }) => {
  // dev環境からtomテナントのワークスペースにアクセス
  await page.goto('http://dev.localhost:3000/dashboard');
  // ワークスペース切り替えで他テナントのWSが見える
  await expect(page.getByText('Tom Workspace')).toBeVisible();
});

test('app環境から他テナントのワークスペースにアクセス不可', async ({ page }) => {
  // app環境からtomテナントのワークスペースにアクセス → 403
  // ...
});
```

---

## デプロイルール

| 環境 | デプロイ方法 | トリガー |
|------|-------------|----------|
| dev | 手動デプロイ | `vercel --prod` (foundersdirect-dev) |
| app（本番） | 自動デプロイ | GitHub main merge |

### Vercelプロジェクト構成
```
foundersdirect (本番)
├── Domain: app.foundersdirect.jp, foundersdirect.jp
├── Branch: main
└── Auto Deploy: ON

foundersdirect-dev (開発)
├── Domain: dev.foundersdirect.jp
├── Branch: develop
└── Auto Deploy: OFF (手動)
```

---

## セキュリティ・DB分離・Cookie分離

### 環境変数分離

#### Vercel本番環境（foundersdirect）
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
FDC_SESSION_COOKIE_NAME=fdc_session
FDC_ENVIRONMENT=production
```

#### Vercel開発環境（foundersdirect-dev）
```env
NEXT_PUBLIC_SUPABASE_URL=https://yyy-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=yyy
FDC_SESSION_COOKIE_NAME=fdc_session_dev
FDC_SUPER_TENANT_MODE=true
FDC_ENVIRONMENT=development
```

### dev環境の制約
- **実データ禁止**: dev DBには本番データをコピーしない
- **テストデータのみ**: シードスクリプトで生成したデータのみ使用
- **Cookie分離**: `fdc_session_dev` で本番と干渉しない

---

## ログ・観測性

### ログ分離
```typescript
// lib/server/logger.ts 修正
import { extractSubdomain } from './subdomain';

export function createApiLogger(host: string) {
  const subdomain = extractSubdomain(host);

  return pino({
    level: subdomain === 'dev' ? 'debug' : 'info',
    base: {
      environment: subdomain,
      service: 'fdc-api',
    },
  });
}
```

### Vercel Logs フィルタ
```
environment:dev    # dev環境のログのみ
environment:app    # 本番のログのみ
```

---

## 禁止事項

| 禁止事項 | 理由 |
|----------|------|
| 本番にdevコードを混入 | 開発専用UIが一般ユーザーに見える |
| dev環境に本番DB接続 | データ漏洩・破壊リスク |
| env変数のハードコード | セキュリティ違反 |
| devでの認証バイパス本番適用 | セキュリティホール |
| Cookie名の共有 | セッション競合 |
| 本番DBのdev環境へのコピー | 個人情報漏洩リスク |

---

## チェックリスト

### 【人間】実装開始前
- [ ] Supabase devプロジェクト作成済み
- [ ] Supabase dev URL / Anon Key 取得済み
- [ ] Vercel devプロジェクト作成済み
- [ ] dev.foundersdirect.jp DNS設定済み
- [ ] Vercel dev環境変数設定済み

### 【Claude】実装時
- [ ] `lib/server/subdomain.ts` 作成
- [ ] `lib/server/tenant-routing.ts` 作成
- [ ] `components/tabs/` 構造作成
- [ ] `validation.ts` のテナント境界チェック修正
- [ ] dev専用タブコンポーネント作成
- [ ] dev環境テーマ適用

### 【共同】テスト
- [ ] ローカルで dev.localhost / app.localhost テスト
- [ ] E2Eテスト追加・実行
- [ ] エッジケーステスト実行

### 【人間】デプロイ
- [ ] develop ブランチにマージ
- [ ] Vercel dev に手動デプロイ
- [ ] dev.foundersdirect.jp で動作確認

---

## 実装タスク（Phase 15.1）

| # | タスク | 担当 | 優先度 | 状態 |
|---|--------|------|--------|------|
| 0 | Supabase devプロジェクト作成 | 人間 | P0 | 未着手 |
| 0 | Vercel devプロジェクト作成 | 人間 | P0 | 未着手 |
| 0 | DNS設定（dev.foundersdirect.jp） | 人間 | P0 | 未着手 |
| 1 | `lib/server/subdomain.ts` 作成 | Claude | P0 | 未着手 |
| 2 | `lib/server/tenant-routing.ts` 作成 | Claude | P0 | 未着手 |
| 3 | `validation.ts` テナント境界チェック修正 | Claude | P0 | 未着手 |
| 4 | `components/tabs/` 構造作成 | Claude | P1 | 未着手 |
| 5 | dev専用タブコンポーネント作成 | Claude | P1 | 未着手 |
| 6 | dev専用テーマ（色変更）適用 | Claude | P1 | 未着手 |
| 7 | E2Eテスト追加 | Claude | P2 | 未着手 |
| 8 | 動作確認・修正 | 共同 | P1 | 未着手 |

---

## 次のアクション

### 人間の作業（先に実行）
1. Supabase で `foundersdirect-dev` プロジェクトを作成
2. DB URL と Anon Key を取得してこのランブックに記入
3. Vercel で `foundersdirect-dev` プロジェクトを作成
4. ドメイン `dev.foundersdirect.jp` を設定
5. 環境変数を設定
6. 「準備完了」と伝える

### Claudeの作業（人間の作業完了後）
1. 上記実装コードを適用
2. マイグレーション実行
3. テスト実行
4. develop ブランチにコミット

---

**Apply?**（人間の作業が完了したら実装を開始します）
