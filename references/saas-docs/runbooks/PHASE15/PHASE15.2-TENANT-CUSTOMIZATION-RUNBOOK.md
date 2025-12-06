# Phase 15.2: テナントカスタマイズ ランブック

## 概要

本ランブックは、マルチテナント環境におけるタブ/機能カスタマイズのルールと手順を定義する。

**最重要原則: APPのコードには触らない**

---

## デフォルト動作（重要）

### 何も指示がなければ = 全体対応（APP共通）

| 指示 | 対応方法 |
|------|---------|
| 「OKRタブを改善して」 | → APP共通の `OKRTabSection.tsx` を修正 |
| 「ダッシュボードに機能追加して」 | → APP共通の `DashboardTabSection.tsx` を修正 |
| 「バグを修正して」 | → APP共通コードを修正 |

### カスタム対応が必要な場合 = 明示的に指示

| 指示 | 対応方法 |
|------|---------|
| 「**TOM用に**ダッシュボードを作って」 | → `custom/tom/DashboardTabTom.tsx` を作成 |
| 「**ACME専用の**OKRタブが必要」 | → `custom/acme/OKRTabAcme.tsx` を作成 |
| 「**このテナントだけ**表示を変えて」 | → カスタムタブを作成 |

### プロンプト例

```
❌ NG: 「OKRタブを改善して」でTOM専用ファイルを作成
✅ OK: 「OKRタブを改善して」でAPP共通を修正

❌ NG: 「TOM用にダッシュボードを作って」でAPP共通を修正
✅ OK: 「TOM用にダッシュボードを作って」でcustom/tom/に作成
```

### Claudeへの指示テンプレート

**全体対応（デフォルト）**
```
OKRタブの進捗バーを改善してください。
```

**カスタム対応（明示的に指定）**
```
TOM専用のダッシュボードタブを作成してください。
※ PHASE15.2-TENANT-CUSTOMIZATION-RUNBOOK.md のルールに従ってください。
```

---

## 設計思想

### アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP（ベースライン・唯一の真実）                │
│  ┌─────────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ダッシュボード│ │OKR │ │TODO │ │見込客│ │顧客 │ │設定 │ ...     │
│  └─────────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│       ↑         ↑       ↑       ↑       ↑       ↑              │
│     共通      共通    共通    共通    共通    共通              │
│                                                                 │
│  ※ 全ての機能開発・バグ修正はここで行う                          │
│  ※ APPが常に最新・最完全な状態を維持                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 継承
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TOM（カスタムテナント例）                      │
│  ┌─────────┐ ┌─────┐ ┌─────┐                                   │
│  │ダッシュボード│ │OKR │ │設定 │                                   │
│  │  TOM専用  │ │共通 │ │共通 │  ← features で他タブ OFF          │
│  └────┬────┘ └─────┘ └─────┘                                   │
│       │                                                         │
│       └── 差し替えコンポーネント（このタブだけ別実装）             │
│                                                                 │
│  ※ 共通タブはAPPと同じコードを使用                               │
│  ※ 専用タブのみ別コンポーネントで差し替え                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## カスタマイズの3つのレベル

### Level 1: 表示/非表示（推奨）

**方法**: テナントの `features` フラグで制御

```json
// tenants テーブルの features カラム
{
  "enableOKR": true,
  "enableTodo": false,      // TODO タブを非表示
  "enableLeads": false,     // 見込客・顧客タブを非表示
  "enableMVV": true,
  "enableOrgChart": true,
  "enableActionMap": false,
  "enableScripts": false,
  "enableReports": true
}
```

**対応するフラグ一覧** (`tabConfig.ts`):

| タブID | フィーチャーフラグ |
|--------|------------------|
| okr | enableOKR |
| todo | enableTodo |
| org-chart | enableOrgChart |
| prospects | enableLeads |
| customers | enableLeads |
| mvv | enableMVV |
| action-map | enableActionMap |
| scripts | enableScripts |
| reports | enableReports |

**手順**:
1. SA権限で `/api/admin/tenants` を PATCH
2. または Supabase Dashboard から直接 `features` カラムを編集

---

### Level 2: ラベル変更（将来実装予定）

**方法**: テナントの `tab_labels` で制御

```json
// tenants テーブルの tab_labels カラム（将来）
{
  "okr": "目標管理",
  "todo": "タスク",
  "prospects": "リード"
}
```

**注意**: コードの変更は不要。データのみで対応。

---

### Level 3: タブ差し替え（最終手段）

**方法**: 専用コンポーネントを作成し、差し替え設定に追加

**使用条件**:
- Level 1, 2 では対応不可能な場合のみ
- UIの根本的な変更が必要な場合
- 顧客固有のビジネスロジックが必要な場合

---

## タブ差し替えの実装手順

### Step 1: 専用コンポーネントの作成

**配置場所**: `app/(app)/dashboard/components/custom/[tenant]/`

```
app/(app)/dashboard/components/
├── custom/
│   └── tom/
│       ├── DashboardTabTom.tsx    # TOM専用ダッシュボード
│       └── index.ts               # エクスポート
├── DashboardTabSection.tsx        # APP共通（触らない）
├── OKRTabSection.tsx              # APP共通（触らない）
└── ...
```

**命名規則**: `{TabName}Tab{TenantName}.tsx`
- 例: `DashboardTabTom.tsx`, `OKRTabAcme.tsx`

### Step 2: 専用コンポーネントの実装

```typescript
// app/(app)/dashboard/components/custom/tom/DashboardTabTom.tsx

/**
 * TOM専用ダッシュボードタブ
 *
 * 【重要】このファイルはTOM専用です。
 * APP共通のDashboardTabSection.tsxには触らないでください。
 *
 * 共通ロジックが必要な場合は、共通hooksを使用してください。
 * - useDerivedWorkspaceData()
 * - useWorkspaceData()
 * - etc.
 */

'use client';

import { useDerivedWorkspaceData } from '@/lib/hooks/useDerivedWorkspaceData';
// ... TOM専用の実装

export function DashboardTabTom() {
  const { stats, leads, todos } = useDerivedWorkspaceData();

  return (
    <div>
      {/* TOM専用のUI */}
    </div>
  );
}
```

### Step 3: 差し替え設定の登録

```typescript
// app/(app)/dashboard/components/customTabRegistry.ts

/**
 * テナント別タブ差し替えレジストリ
 *
 * 【ルール】
 * - ここに登録されたタブのみ差し替えが適用される
 * - 登録がないタブは自動的にAPP共通を使用
 * - APP共通コンポーネントは絶対に修正しない
 */

import type { ComponentType } from 'react';

// 遅延ロード用の型
type LazyTabComponent = () => Promise<{ default: ComponentType<TabProps> }>;

// テナント別の差し替えマップ
// key: テナントsubdomain
// value: { tabId: 遅延ロード関数 }
export const CUSTOM_TAB_REGISTRY: Record<string, Record<string, LazyTabComponent>> = {
  'tom': {
    'dashboard': () => import('./custom/tom/DashboardTabTom').then(m => ({ default: m.DashboardTabTom })),
  },
  // 他のテナントを追加する場合はここに追記
  // 'acme': {
  //   'okr': () => import('./custom/acme/OKRTabAcme'),
  // },
};

/**
 * 指定されたテナント・タブIDの差し替えコンポーネントを取得
 * @returns 差し替えがあればLazy関数、なければnull
 */
export function getCustomTabLoader(
  tenantSubdomain: string,
  tabId: string
): LazyTabComponent | null {
  return CUSTOM_TAB_REGISTRY[tenantSubdomain]?.[tabId] ?? null;
}
```

### Step 4: TabContents での読み込み

```typescript
// TabContents.tsx 内で差し替えを適用
import { getCustomTabLoader } from './customTabRegistry';
import { useTenantOptional } from '@/lib/contexts/TenantContext';

// コンポーネント内
const tenant = useTenantOptional();
const customLoader = tenant ? getCustomTabLoader(tenant.subdomain, activeTab) : null;

// カスタムがあれば使用、なければ共通を使用
if (customLoader) {
  const CustomTab = lazy(customLoader);
  return <Suspense fallback={<Loading />}><CustomTab {...props} /></Suspense>;
}
// 共通タブを表示
```

---

## 禁止事項（絶対NG）

### 1. APP共通コンポーネントの修正

```typescript
// ❌ NG: 共通ファイルにテナント分岐を入れる
// app/(app)/dashboard/components/DashboardTabSection.tsx
if (tenant.subdomain === 'tom') {
  return <TomSpecificUI />;  // ← 絶対ダメ
}
```

### 2. 共通hooksへのテナント固有ロジック追加

```typescript
// ❌ NG: 共通hookにテナント分岐を入れる
// lib/hooks/useDerivedWorkspaceData.ts
if (tenant === 'tom') {
  // TOM専用の計算ロジック  // ← 絶対ダメ
}
```

### 3. 共通型定義の拡張

```typescript
// ❌ NG: 共通型にテナント固有フィールドを追加
// lib/types/workspace.ts
interface WorkspaceData {
  tomSpecificField?: string;  // ← 絶対ダメ
}
```

---

## 許可事項（OK）

### 1. 専用ディレクトリ内でのカスタマイズ

```typescript
// ✅ OK: custom/tom/ 配下で自由に実装
// app/(app)/dashboard/components/custom/tom/DashboardTabTom.tsx
export function DashboardTabTom() {
  // TOM専用のUI・ロジック
}
```

### 2. 共通hooksの利用

```typescript
// ✅ OK: 専用コンポーネントから共通hooksを使用
import { useDerivedWorkspaceData } from '@/lib/hooks/useDerivedWorkspaceData';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';

export function DashboardTabTom() {
  const { stats } = useDerivedWorkspaceData();  // 共通データを取得
  // TOM専用の表示ロジック
}
```

### 3. 新しいテナント専用hooksの作成

```typescript
// ✅ OK: テナント専用のhookを作成（共通には触らない）
// lib/hooks/custom/tom/useTomDashboard.ts
export function useTomDashboard() {
  const base = useDerivedWorkspaceData();
  // TOM専用の追加計算
  return { ...base, tomSpecificData };
}
```

---

## レビューチェックリスト

PRレビュー時に以下を確認:

- [ ] APP共通コンポーネント（`components/*.tsx`）に変更がないか
- [ ] 共通hooks（`lib/hooks/*.ts`）に変更がないか
- [ ] 共通型定義（`lib/types/*.ts`）に変更がないか
- [ ] カスタムコンポーネントは `custom/[tenant]/` 配下に配置されているか
- [ ] `customTabRegistry.ts` に正しく登録されているか
- [ ] テナント固有のロジックが共通コードに漏れていないか

---

## トラブルシューティング

### Q: APP に新機能を追加したい

**A**: 通常通りAPP共通コンポーネントに追加。全テナントに自動反映される。
カスタムタブを持つテナントには反映されないが、それは想定通り。

### Q: カスタムタブにもAPPの新機能を入れたい

**A**: カスタムタブ側で個別に実装。共通hooksを使えば最小限の実装で済む。

### Q: 新しいテナントを追加したい

**A**:
1. `tenants` テーブルにレコード追加
2. `features` で表示/非表示を設定
3. 必要なら `customTabRegistry.ts` に差し替え登録

### Q: カスタムタブを廃止してAPP共通に戻したい

**A**: `customTabRegistry.ts` から該当エントリを削除するだけ。

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app/(app)/dashboard/components/tabConfig.ts` | タブ定義・フィーチャーフラグ対応 |
| `app/(app)/dashboard/components/TabContents.tsx` | タブ表示の分岐 |
| `app/(app)/dashboard/components/customTabRegistry.ts` | 差し替え登録 |
| `app/(app)/dashboard/components/custom/` | テナント専用コンポーネント |
| `lib/contexts/TenantContext.tsx` | テナント情報提供 |

---

## 更新履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-12-04 | 1.0 | 初版作成 |
| 2025-12-05 | 1.1 | 実装状況確認、完了確認 |

---

## 実装確認（2025-12-05 更新）

### 実装ファイル確認状況

| ファイル | 役割 | 確認状況 |
|---------|------|----------|
| `app/(app)/dashboard/components/customTabRegistry.ts` | テナント別タブ差し替えレジストリ | ✅ 82行 |
| `app/(app)/dashboard/components/tabConfig.ts` | タブ定義・フィーチャーフラグ対応 | ✅ |
| `app/(app)/dashboard/components/TabContents.tsx` | タブ表示の分岐 | ✅ |
| `lib/contexts/TenantContext.tsx` | テナント情報提供 | ✅ |

**ステータス**: ✅ 基盤実装完了（テナント専用タブは必要に応じて追加）
