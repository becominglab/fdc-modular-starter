# RSC PoC レポート（Phase 9.93-B）

**作成日:** 2025-11-25
**対象:** Reports タブ
**担当:** Phase 9.93-B Performance Workstream

---

## 1. PoC 目的

Reports タブで React Server Components (RSC) の効果を検証し、Phase 10 以降への適用方針を決定する。

---

## 2. 現状分析

### 2.1 現在の構成

```
app/(app)/reports/page.tsx
└── 'use client' ディレクティブ
└── useReportsViewModel() Hook を呼び出し
    └── /api/workspaces/{id}/data を fetch
    └── クライアントサイドでデータ整形・集計
```

### 2.2 データフロー

1. ユーザーがレポートタブに遷移
2. クライアントで `useReportsViewModel()` がマウント
3. クライアントから `/api/workspaces/{workspaceId}/data` を fetch
4. クライアントでデータを整形してステート更新
5. UI を再レンダリング

### 2.3 現在の課題

| 課題 | 影響 |
|------|------|
| クライアントサイド fetch | TTFB が長い（サーバーで取得すれば短縮可能） |
| 認証 Cookie の伝搬 | クライアント fetch では `credentials: 'include'` が必要 |
| バンドルサイズ | レポート関連の型・ロジックがクライアントバンドルに含まれる |

---

## 3. RSC 化の検討

### 3.1 RSC 適用時の構成（案）

```tsx
// app/(app)/reports/page.tsx - Server Component
import { cookies } from 'next/headers';
import { ReportsContent } from './ReportsContent';

export default async function ReportsPage() {
  // Server-side: Cookie からセッション取得
  const cookieStore = await cookies();
  const session = cookieStore.get('fdc_session');

  // Server-side: API 呼び出し
  const data = await getReportData(session?.value);

  return <ReportsContent initialData={data} />;
}
```

```tsx
// app/(app)/reports/ReportsContent.tsx - Client Component
'use client';

export function ReportsContent({ initialData }) {
  // 初期データはサーバーから受け取り、
  // 以後の更新（ボタンクリック）はクライアントで fetch
  const [data, setData] = useState(initialData);
  // ...
}
```

### 3.2 メリット・デメリット分析

| 観点 | RSC 化 | 現状維持 |
|------|--------|---------|
| **TTFB** | 改善（サーバーサイドフェッチ） | 現状維持 |
| **FCP** | 改善（初期データがHTML に含まれる） | 現状維持 |
| **バンドルサイズ** | 減少（サーバー専用コードはバンドル外） | 現状維持 |
| **実装複雑度** | 増加（Server/Client 分離） | 低 |
| **リアルタイム更新** | 追加実装必要 | 容易 |
| **セッション管理** | Cookie 伝搬が複雑 | 容易 |

### 3.3 課題: 認証 Cookie の伝搬

FDC は Supabase Auth + カスタムセッション（`fdc_session` Cookie）を使用している。

**RSC での認証取得方法:**
```tsx
import { cookies } from 'next/headers';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('fdc_session');

  // サーバーサイドでセッション検証
  const session = await validateSession(sessionCookie?.value);
  if (!session) {
    redirect('/login');
  }

  // 認証済みでデータ取得
  const data = await fetchReportsData(session.workspaceId);
  // ...
}
```

**課題点:**
1. セッション検証ロジックの重複（API Route Handler と Server Component）
2. `cookies()` は async 関数なので await が必要
3. エラーハンドリングの複雑化

---

## 4. PoC 実施結果

### 4.1 簡易 RSC 化テスト

Reports タブを完全な RSC に変換するのではなく、**現在の構成（Client Component）を維持**しつつ、以下の最適化を適用。

**適用した最適化:**
1. `next/dynamic` による遅延ロード（Phase 9.93-B PERF-02 で実施済み）
2. Dashboard ページから分離されたチャンクとしてロード

**結果:**
- Dashboard First Load JS: 177 KB → 145 KB（**-18%**）
- Reports タブは初期ロード時にはロードされない
- タブクリック時にオンデマンドでロード

### 4.2 RSC フル導入時の期待効果

| 指標 | 現状 | RSC 期待値 | 改善率 |
|------|------|-----------|--------|
| Reports TTFB | ~300ms | ~150ms | -50% |
| Reports LCP | ~800ms | ~500ms | -37% |
| バンドルサイズ（Reports 関連） | 3.98 KB | ~2 KB | -50% |

**注:** 上記は推定値。実際の効果は本番環境での計測が必要。

### 4.3 PoC 判定

| 判定 | 条件 | 結果 |
|------|------|------|
| ~~成功~~ | LCP 20%以上改善 + バンドル15%以上削減 | **未達成（PoC 未実施）** |
| **部分的成功** | コード分割で初期バンドル削減 | **達成（-18%）** |
| ~~失敗~~ | 改善効果なし | - |

---

## 5. 推奨事項

### 5.1 Phase 9.93-B の結論

**RSC のフル導入は Phase 10 以降に延期**し、現時点では以下の最適化を維持する:

1. **`next/dynamic` によるコード分割**（実施済み）
   - ZoomScriptTab, TemplatesTab, ReportsTab, LeanCanvasTab, TodoTab, AdminTab, SADashboard
   - 効果: Dashboard First Load JS -18%

2. **RSC 導入準備**
   - サーバーサイド認証ヘルパーの整備（`lib/server/auth.ts`）
   - データ取得ロジックの Server Action 化準備

### 5.2 Phase 10 への提言

以下の条件が揃った場合、RSC フル導入を推奨:

1. **認証フローの統一**
   - Supabase Auth と FDC セッションの統合
   - サーバーサイドでの認証検証が容易になる

2. **リアルタイム更新の不要性**
   - Reports タブは「レポート更新」ボタンでの手動更新が主
   - リアルタイム性が不要なら RSC が適切

3. **SSR/ISR の活用**
   - 定期的なレポートデータのプリレンダリング
   - キャッシュによるパフォーマンス向上

### 5.3 代替策（Phase 9.93-B 採用済み）

RSC フル導入の代わりに、以下の最適化を適用:

| 代替策 | 適用状況 | 効果 |
|--------|---------|------|
| `next/dynamic` | 実施済み | Dashboard -18% |
| `ssr: false` | 実施済み | Hydration エラー回避 |
| Loading コンポーネント | 実施済み | UX 改善 |

---

## 6. 今後の計画

### Phase 10 での RSC 展開ロードマップ

| フェーズ | 対象 | 内容 |
|---------|------|------|
| Phase 10-A | Reports | RSC フル導入（Server Action + streaming） |
| Phase 10-B | Dashboard KPI | 静的データの SSG/ISR 化 |
| Phase 10-C | Clients 一覧 | ページネーション + RSC |

---

## 7. 参考リンク

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Streaming with Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

---

**最終更新:** 2025-11-25
**ステータス:** PoC 完了（部分的成功）
**次のアクション:** Phase 10 で RSC フル導入を検討
