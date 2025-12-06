# Phase 9.94 ランブック：品質強化 & Phase 10 準備

**作成日:** 2025-11-25
**ステータス:** 待機中（Phase 9.93-D Gate 通過後に開始）
**構成:** 4つの並行ワークストリーム（A/B/C/D）

---

## 0. Phase 9.93 終了ゲート（9.94 開始条件）

Phase 9.94 を開始する前に、以下の条件を**すべて**満たすこと：

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | `npm run build` がエラー 0 で成功 | CI または手動実行 | [ ] |
| 2 | `npm run type-check` がエラー 0 で成功 | CI または手動実行 | [ ] |
| 3 | `npm run lint` が警告のみ（エラー 0） | CI または手動実行 | [ ] |
| 4 | `npm run check:legacy` がエラー 0 | CI または手動実行 | [ ] |
| 5 | Tech-Debt Inventory 高重要度 100% 解消 | `docs/TECH-DEBT-INVENTORY.md` 確認 | [ ] |
| 6 | PERFORMANCE-BASELINE.md に基準値記入済み | ドキュメント確認 | [ ] |

**ゲート通過日:** ____-__-__
**承認者:** __________

---

## 1. Phase 9.94 概要

### 1.1 位置づけ

```
Phase 9.93  → バグ修正 & 整合性確保（UI/ロジック/パフォーマンス）
Phase 9.94  → 【本フェーズ】品質強化 & Phase 10 準備 ← ★ここ
Phase 10    → TODO機能本格実装（Eisenhower Matrix + Elastic Habits）
```

### 1.2 4ワークストリーム構成

| WS | 名称 | 目的 | 担当枠 |
|----|------|------|--------|
| **A** | パフォーマンス & 最適化 | Lighthouse 90+、RSC本格導入、バンドル最適化 | 1名 |
| **B** | UX向上 | IA再編、アクセシビリティ、モバイル最適化 | 1名 |
| **C** | 拡張/新機能準備 | Phase 10 先行準備、ドメインモデル、API型精緻化 | 1名 |
| **D** | 品質プラットフォーム強化 | CI自動化、モニタリング、VRT常設化 | 1名 |

**並行実行ルール:**
- 各ワークストリームは独立して進行可能
- 依存関係がある場合は明記（例: D の CI 完成後に A のパフォーマンス計測を自動化）
- 毎日のスタンドアップで進捗共有

### 1.3 スケジュール

| マイルストーン | 目標日 | 内容 |
|--------------|--------|------|
| Phase 9.93 Gate 通過 | Day 0 | 開始条件確認 |
| WS 各初期セットアップ | Day 1 | 環境・ブランチ準備 |
| WS-D CI 基盤完成 | Day 2 | 他 WS が依存 |
| 中間レビュー | Day 3 | 進捗確認・調整 |
| 全 WS 完了 | Day 5 | DOD 確認 |
| Phase 10 開始 | Day 6 | ハンドオフ |

---

## 2. 必読ドキュメント（全ワークストリーム共通）

| ドキュメント | パス | 確認項目 |
|-------------|------|---------|
| **グランドガイド** | `docs/FDC-GRAND-GUIDE.md` | プロジェクト全体方針 |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | コーディング規約 |
| **技術負債** | `docs/TECH-DEBT-INVENTORY.md` | 残存する技術負債 |
| **パフォーマンス基準** | `docs/PERFORMANCE-BASELINE.md` | 基準値・目標値 |
| **RSC PoC** | `docs/RSC-POC-REPORT.md` | RSC 導入方針 |
| **CSS 移行** | `docs/CSS-MIGRATION-DECISION.md` | CSS Modules 方針 |
| **Phase 10 ランブック** | `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` | 次フェーズ要件 |

---

## 3. WS-A: パフォーマンス & 最適化

### 3.1 目的

Lighthouse Performance 90+ を達成し、RSC 本格導入の基盤を構築する。

### 3.2 現状と目標

| 指標 | Phase 9.93 実績 | Phase 9.94 目標 | 閾値（CI） | 根拠 |
|------|----------------|----------------|-----------|------|
| Dashboard First Load JS | 145 KB | **120 KB** | 130 KB | 実績から15%削減目標 |
| 共有チャンク合計 | 102 KB | **95 KB** | 100 KB | 100KB以下が業界標準 |
| 合計静的チャンク | 1.2 MB | **1.0 MB** | 1.1 MB | 1MB以下が理想 |
| Lighthouse Performance | 未計測（推定70） | **90+** | 85 | Core Web Vitals 基準 |
| LCP | 未計測 | **< 2.0s** | 2.5s | Good 判定基準 |
| FCP | 未計測 | **< 1.5s** | 1.8s | Good 判定基準 |

### 3.3 タスク一覧

| # | タスク | 担当 | 期日 | 完了判定 | 完了 |
|---|--------|------|------|---------|------|
| A-01 | Lighthouse 初回計測（本番ビルド） | - | Day 1 | 全ページのスコア記録 | [ ] |
| A-02 | RSC 本格導入: Reports ページ | - | Day 2-3 | TTFB 30%改善 | [ ] |
| A-03 | RSC 本格導入: Dashboard KPI | - | Day 3-4 | SSG/ISR 適用 | [ ] |
| A-04 | next/image 置換（3箇所） | - | Day 2 | `no-img-element` 警告 0 | [ ] |
| A-05 | 未使用 CSS 削除 | - | Day 2 | globals.css 600行以下 | [ ] |
| A-06 | フォント最適化（next/font） | - | Day 3 | FOUT 解消 | [ ] |
| A-07 | Lighthouse 最終計測 | - | Day 5 | Performance 90+ | [ ] |

### 3.4 RSC 導入詳細

**3.4.1 Reports ページ RSC 化**

```tsx
// app/(app)/reports/page.tsx - Server Component
import { cookies } from 'next/headers';
import { ReportsContent } from './ReportsContent';
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

**3.4.2 認証ヘルパー（共通化）**

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

  const validated = await validateSession(session.value);
  if (!validated) {
    redirect('/login');
  }

  return validated;
}
```

### 3.5 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | Lighthouse Performance 90+ | `npm run lighthouse` | [ ] |
| 2 | Dashboard First Load JS ≤ 130KB | ビルド出力確認 | [ ] |
| 3 | Reports ページが RSC で動作 | ページ読み込み確認 | [ ] |
| 4 | `no-img-element` 警告 0件 | `npm run lint` | [ ] |
| 5 | LCP < 2.5s | Lighthouse レポート | [ ] |

---

## 4. WS-B: UX向上

### 4.1 目的

アクセシビリティ基準を満たし、モバイル体験を最適化する。

### 4.2 現状と目標

| 指標 | 現状 | 目標 | 根拠 |
|------|------|------|------|
| Lighthouse Accessibility | 未計測 | **95+** | WCAG 2.1 AA 準拠 |
| モバイル対応 | 基本対応 | **完全対応** | 全ページレスポンシブ |
| キーボード操作 | 部分対応 | **完全対応** | Tab/Enter で全操作可能 |
| スクリーンリーダー | 未対応 | **基本対応** | aria-label 付与 |

### 4.3 タスク一覧

| # | タスク | 担当 | 期日 | 完了判定 | 完了 |
|---|--------|------|------|---------|------|
| B-01 | Accessibility 監査（axe DevTools） | - | Day 1 | 問題点リスト作成 | [ ] |
| B-02 | aria-label / role 属性追加 | - | Day 2 | 主要コンポーネント対応 | [ ] |
| B-03 | キーボードナビゲーション修正 | - | Day 2-3 | Tab 順序正常化 | [ ] |
| B-04 | カラーコントラスト修正 | - | Day 2 | WCAG AA 準拠 | [ ] |
| B-05 | モバイルブレークポイント見直し | - | Day 3 | 375px で崩れなし | [ ] |
| B-06 | タッチターゲット拡大（44px以上） | - | Day 3 | ボタン・リンク対応 | [ ] |
| B-07 | IA 再編検討資料作成 | - | Day 4 | ナビゲーション改善案 | [ ] |

### 4.4 アクセシビリティ対応詳細

**4.4.1 チェックリスト**

```markdown
## 必須対応（WCAG 2.1 AA）
- [ ] すべての画像に alt 属性
- [ ] フォーム要素に label 関連付け
- [ ] カラーコントラスト比 4.5:1 以上
- [ ] フォーカス表示が明確
- [ ] 見出しの階層構造が正しい
- [ ] リンクテキストが意味を持つ

## 推奨対応
- [ ] スキップリンク設置
- [ ] ランドマーク role 設定
- [ ] エラーメッセージの aria-live
```

**4.4.2 テスト方法**

```bash
# axe DevTools（Chrome 拡張）で手動チェック
# または
npx @axe-core/cli http://localhost:3000/dashboard
```

### 4.5 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | Lighthouse Accessibility 95+ | Lighthouse レポート | [ ] |
| 2 | axe DevTools で Critical 0件 | 手動チェック | [ ] |
| 3 | 全ページ 375px で表示崩れなし | 実機確認 | [ ] |
| 4 | キーボードのみで主要操作可能 | 手動テスト | [ ] |
| 5 | IA 改善提案書が作成されている | ドキュメント確認 | [ ] |

---

## 5. WS-C: 拡張/新機能準備

### 5.1 目的

Phase 10 で必要となるドメインモデル・API型・基盤を先行整備する。

### 5.2 Phase 10 先行準備項目

| 項目 | Phase 10 での用途 | 先行準備内容 |
|------|------------------|-------------|
| Task 型定義 | TODO 機能 | `lib/types/todo.ts` 作成 |
| Validator | データ整合性 | Zod スキーマ定義 |
| API 型精緻化 | 型安全な通信 | `any` 型の具体化 |
| オフライン戦略 | 同期処理 | 基本設計ドキュメント |
| コンポーネント骨格 | UI 実装 | `app/_components/todo/` 作成 |

### 5.3 タスク一覧

| # | タスク | 担当 | 期日 | 完了判定 | 完了 |
|---|--------|------|------|---------|------|
| C-01 | `lib/types/todo.ts` 作成 | - | Day 1 | Task, Suit, ElasticLevel 型定義 | [ ] |
| C-02 | Zod スキーマ定義 | - | Day 2 | `sanitizeAppData` 実装 | [ ] |
| C-03 | `any` 型の具体化（高優先度） | - | Day 2-3 | 高優先度 any 20件以下 | [ ] |
| C-04 | `any` 型の具体化（中優先度） | - | Day 3-4 | 中優先度 any 10件以下 | [ ] |
| C-05 | 未使用変数の削除 | - | Day 2 | `no-unused-vars` 10件以下 | [ ] |
| C-06 | React Hooks 依存配列修正 | - | Day 2 | `exhaustive-deps` 0件 | [ ] |
| C-07 | オフライン/同期戦略ドキュメント | - | Day 4 | 設計書作成 | [ ] |
| C-08 | `app/_components/todo/` 骨格作成 | - | Day 4 | ディレクトリ・index 作成 | [ ] |

### 5.4 型定義詳細

**5.4.1 lib/types/todo.ts**

```typescript
// lib/types/todo.ts
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type ElasticLevel = 'ume' | 'take' | 'matsu';
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  suit: Suit;
  startAt?: string;           // "09:00", "14:15" など
  durationMinutes?: number;   // 15の倍数推奨
  suggestedDuration?: number;
  isElasticHabit?: boolean;
  elasticLevel?: ElasticLevel;
  streakCount?: number;
  lastCompletedAt?: string;
  googleCalendarEventId?: string;
  subTasks?: SubTask[];
  status: TaskStatus;
  updatedAt: number;
  createdAt: number;
}

export const SUIT_CONFIG: Record<Suit, {
  ja: string;
  en: string;
  color: string;
  symbol: string;
}> = {
  spade:   { ja: '緊急かつ重要', en: 'Do First',      color: '#000000', symbol: '♠' },
  heart:   { ja: '重要なこと',   en: 'Schedule',      color: '#E53935', symbol: '♥' },
  diamond: { ja: '緊急なだけ',   en: 'Delegate',      color: '#FFC107', symbol: '♦' },
  club:    { ja: '未来創造',     en: 'Create Future', color: '#1976D2', symbol: '♣' },
};

export const ELASTIC_CONFIG: Record<ElasticLevel, {
  ja: string;
  defaultMinutes: number;
}> = {
  ume:   { ja: '梅（最小）', defaultMinutes: 5 },
  take:  { ja: '竹（標準）', defaultMinutes: 15 },
  matsu: { ja: '松（最大）', defaultMinutes: 30 },
};
```

**5.4.2 Zod バリデーション**

```typescript
// lib/core/validator.ts
import { z } from 'zod';

const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  suit: z.enum(['spade', 'heart', 'diamond', 'club']),
  startAt: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(5).max(480).optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).default('not_started'),
  updatedAt: z.number(),
  createdAt: z.number(),
});

export function sanitizeTask(data: unknown): Task {
  return TaskSchema.parse(data);
}

export function sanitizeAppData(data: unknown): AppData {
  // 不正データを補完しながらパース
  // ...
}
```

### 5.5 any 型修正対象

| # | ファイル | 対象箇所 | 優先度 | 対応 |
|---|---------|---------|--------|------|
| 1 | `lib/types/app-data.ts` | 224-231, 282行 | 高 | [ ] |
| 2 | `lib/types/database.ts` | 35行 | 高 | [ ] |
| 3 | `lib/hooks/useClients.ts` | 5箇所 | 高 | [ ] |
| 4 | `lib/hooks/useLeads.ts` | 3箇所 | 高 | [ ] |
| 5 | `lib/hooks/useDashboardStats.ts` | 2箇所 | 中 | [ ] |
| 6 | `lib/server/db.ts` | 3箇所 | 中 | [ ] |
| 7 | `lib/server/encryption.ts` | 3箇所 | 低 | [ ] |

### 5.6 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | `lib/types/todo.ts` が作成されている | ファイル存在確認 | [ ] |
| 2 | Zod スキーマが定義されている | ファイル存在確認 | [ ] |
| 3 | `no-explicit-any` 警告 20件以下 | `npm run lint` | [ ] |
| 4 | `no-unused-vars` 警告 10件以下 | `npm run lint` | [ ] |
| 5 | `exhaustive-deps` 警告 0件 | `npm run lint` | [ ] |
| 6 | `app/_components/todo/` が存在 | ディレクトリ確認 | [ ] |
| 7 | オフライン戦略ドキュメントが作成 | ドキュメント確認 | [ ] |

---

## 6. WS-D: 品質プラットフォーム強化

### 6.1 目的

CI/CD パイプラインを強化し、品質ゲートを自動化する。

### 6.2 現状と目標

| 項目 | 現状 | 目標 |
|------|------|------|
| ビルド/Lint | 手動実行 | CI 自動実行 + PR ブロック |
| バンドルサイズ | スクリプトのみ | CI 閾値チェック + コメント |
| Visual Regression | 任意実行 | CI 必須 + 差異ブロック |
| 技術負債レポート | なし | PR 自動コメント |
| エラートラッキング | なし | Sentry 導入検討 |
| パフォーマンス監視 | なし | Lighthouse CI 導入 |

### 6.3 タスク一覧

| # | タスク | 担当 | 期日 | 完了判定 | 完了 |
|---|--------|------|------|---------|------|
| D-01 | GitHub Actions ワークフロー作成 | - | Day 1 | `.github/workflows/quality-gate.yml` | [ ] |
| D-02 | テスト認証バイパス実装 | - | Day 1 | CI でログイン可能 | [ ] |
| D-03 | 技術負債スキャナー作成 | - | Day 1 | `scripts/report-tech-debt.cjs` | [ ] |
| D-04 | バンドルサイズチェッカー強化 | - | Day 2 | 閾値チェック + エラーハンドリング | [ ] |
| D-05 | Visual Regression テスト整備 | - | Day 2 | 認証込みで動作 | [ ] |
| D-06 | Lighthouse CI 導入 | - | Day 3 | スコア記録 + PR コメント | [ ] |
| D-07 | ロールバック手順書作成 | - | Day 2 | 手順ドキュメント | [ ] |
| D-08 | Sentry 導入検討 | - | Day 4 | 導入可否判断 | [ ] |

### 6.4 GitHub Actions ワークフロー

**6.4.1 `.github/workflows/quality-gate.yml`**

```yaml
name: Quality Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  NODE_VERSION: '22'
  # テスト用認証情報（GitHub Secrets に設定）
  TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
  TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

jobs:
  # ===============================
  # Job 1: ビルド・型チェック・Lint
  # ===============================
  build-and-lint:
    name: Build & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Check legacy imports
        run: npm run check:legacy

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 1

  # ===============================
  # Job 2: バンドルサイズチェック
  # ===============================
  bundle-size:
    name: Bundle Size Check
    runs-on: ubuntu-latest
    needs: build-and-lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Check bundle size
        id: bundle
        run: |
          npm run check:bundle 2>&1 | tee bundle-report.txt
          echo "report<<EOF" >> $GITHUB_OUTPUT
          cat bundle-report.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Comment bundle size on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const report = `${{ steps.bundle.outputs.report }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📦 Bundle Size Report\n\`\`\`\n${report}\n\`\`\``
            });

      - name: Fail if threshold exceeded
        if: steps.bundle.outcome == 'failure'
        run: exit 1

  # ===============================
  # Job 3: Visual Regression
  # ===============================
  visual-regression:
    name: Visual Regression
    runs-on: ubuntu-latest
    needs: build-and-lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Start server
        run: npm run start &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000

      - name: Run Visual Regression Tests
        run: npm run test:visual
        env:
          TEST_USER_EMAIL: ${{ env.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ env.TEST_USER_PASSWORD }}

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: test-results/
          retention-days: 7

  # ===============================
  # Job 4: 技術負債レポート
  # ===============================
  tech-debt-report:
    name: Tech Debt Report
    runs-on: ubuntu-latest
    needs: build-and-lint
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Generate tech debt report
        id: techdebt
        run: |
          node scripts/report-tech-debt.cjs 2>&1 | tee tech-debt-output.txt
          if [ -f .tech-debt-report.md ]; then
            echo "report<<EOF" >> $GITHUB_OUTPUT
            cat .tech-debt-report.md >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
          fi

      - name: Comment tech debt on PR
        uses: actions/github-script@v7
        with:
          script: |
            const report = `${{ steps.techdebt.outputs.report }}`;
            if (report) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: report
              });
            }

  # ===============================
  # Job 5: Lighthouse CI
  # ===============================
  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: build-and-lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Start server
        run: npm run start &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/login
          configPath: ./lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### 6.5 テスト認証バイパス

**6.5.1 CI 用テストユーザー設定**

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // 環境変数からテストユーザー情報取得
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('[type="submit"]');

  // ログイン成功を確認
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
```

**6.5.2 Playwright 設定**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    // 認証セットアップ
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    // 認証済みテスト
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### 6.6 技術負債スキャナー

**6.6.1 `scripts/report-tech-debt.cjs`（強化版）**

```javascript
#!/usr/bin/env node
/**
 * 技術負債レポート生成スクリプト（Phase 9.94 強化版）
 *
 * エラーハンドリング強化、CI 連携対応
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['app', 'lib'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'archive', 'dist'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 検出パターン
const PATTERNS = {
  todo: /\/\/\s*TODO:?\s*(.+)/gi,
  fixme: /\/\/\s*FIXME:?\s*(.+)/gi,
  hack: /\/\/\s*HACK:?\s*(.+)/gi,
  anyType: /:\s*any\b/g,
  eslintDisable: /eslint-disable/g,
};

// エラーハンドリング付きファイル読み込み
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`⚠️ ファイル読み込みスキップ: ${filePath} (${error.message})`);
    return null;
  }
}

function scanFile(filePath) {
  const content = safeReadFile(filePath);
  if (!content) return null;

  const lines = content.split('\n');
  const results = {
    todos: [],
    fixmes: [],
    hacks: [],
    anyTypes: [],
    eslintDisables: [],
  };

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // パターンマッチング（RegExp のグローバルフラグをリセット）
    let match;

    const todoPattern = new RegExp(PATTERNS.todo.source, 'gi');
    while ((match = todoPattern.exec(line)) !== null) {
      results.todos.push({ file: filePath, line: lineNum, text: match[1].trim() });
    }

    const fixmePattern = new RegExp(PATTERNS.fixme.source, 'gi');
    while ((match = fixmePattern.exec(line)) !== null) {
      results.fixmes.push({ file: filePath, line: lineNum, text: match[1].trim() });
    }

    const hackPattern = new RegExp(PATTERNS.hack.source, 'gi');
    while ((match = hackPattern.exec(line)) !== null) {
      results.hacks.push({ file: filePath, line: lineNum, text: match[1].trim() });
    }

    if (PATTERNS.anyType.test(line)) {
      results.anyTypes.push({ file: filePath, line: lineNum });
    }

    if (PATTERNS.eslintDisable.test(line)) {
      results.eslintDisables.push({ file: filePath, line: lineNum });
    }
  });

  return results;
}

function scanDirectory(dir) {
  const allResults = {
    todos: [],
    fixmes: [],
    hacks: [],
    anyTypes: [],
    eslintDisables: [],
  };

  function walk(currentDir) {
    let files;
    try {
      files = fs.readdirSync(currentDir);
    } catch (error) {
      console.warn(`⚠️ ディレクトリ読み込みスキップ: ${currentDir} (${error.message})`);
      return;
    }

    for (const file of files) {
      const filePath = path.join(currentDir, file);

      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (error) {
        continue;
      }

      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(file)) {
          walk(filePath);
        }
      } else if (FILE_EXTENSIONS.some(ext => file.endsWith(ext))) {
        const results = scanFile(filePath);
        if (results) {
          allResults.todos.push(...results.todos);
          allResults.fixmes.push(...results.fixmes);
          allResults.hacks.push(...results.hacks);
          allResults.anyTypes.push(...results.anyTypes);
          allResults.eslintDisables.push(...results.eslintDisables);
        }
      }
    }
  }

  walk(dir);
  return allResults;
}

function generateReport(results) {
  const totalDebt =
    results.todos.length +
    results.fixmes.length +
    results.hacks.length +
    results.anyTypes.length +
    results.eslintDisables.length;

  let report = `## 🔍 技術負債レポート\n\n`;
  report += `**検出日時:** ${new Date().toISOString()}\n`;
  report += `**総負債数:** ${totalDebt} 件\n\n`;

  report += `### サマリー\n\n`;
  report += `| カテゴリ | 件数 | 重要度 | 傾向 |\n`;
  report += `|---------|------|--------|------|\n`;
  report += `| TODO | ${results.todos.length} | 中 | - |\n`;
  report += `| FIXME | ${results.fixmes.length} | 高 | ${results.fixmes.length > 0 ? '⚠️' : '✅'} |\n`;
  report += `| HACK | ${results.hacks.length} | 高 | ${results.hacks.length > 0 ? '⚠️' : '✅'} |\n`;
  report += `| any 型 | ${results.anyTypes.length} | 中 | ${results.anyTypes.length > 20 ? '⚠️' : '✅'} |\n`;
  report += `| eslint-disable | ${results.eslintDisables.length} | 低 | - |\n`;

  if (results.fixmes.length > 0) {
    report += `\n### ⚠️ FIXME (要修正)\n\n`;
    results.fixmes.slice(0, 10).forEach(item => {
      report += `- \`${item.file}:${item.line}\`: ${item.text}\n`;
    });
    if (results.fixmes.length > 10) {
      report += `- ... 他 ${results.fixmes.length - 10} 件\n`;
    }
  }

  if (results.hacks.length > 0) {
    report += `\n### 🔧 HACK (要改善)\n\n`;
    results.hacks.slice(0, 10).forEach(item => {
      report += `- \`${item.file}:${item.line}\`: ${item.text}\n`;
    });
    if (results.hacks.length > 10) {
      report += `- ... 他 ${results.hacks.length - 10} 件\n`;
    }
  }

  if (results.anyTypes.length > 0) {
    report += `\n### 📝 any 型の使用 (上位10件)\n\n`;
    results.anyTypes.slice(0, 10).forEach(item => {
      report += `- \`${item.file}:${item.line}\`\n`;
    });
    if (results.anyTypes.length > 10) {
      report += `- ... 他 ${results.anyTypes.length - 10} 件\n`;
    }
  }

  report += `\n---\n`;
  report += `*このレポートは自動生成されています。詳細は \`docs/TECH-DEBT-INVENTORY.md\` を参照してください。*\n`;

  return report;
}

// ===============================
// メイン実行
// ===============================
console.log('🔍 技術負債をスキャン中...\n');

const allResults = {
  todos: [],
  fixmes: [],
  hacks: [],
  anyTypes: [],
  eslintDisables: [],
};

for (const dir of SCAN_DIRS) {
  if (fs.existsSync(dir)) {
    console.log(`📂 スキャン中: ${dir}/`);
    const results = scanDirectory(dir);
    allResults.todos.push(...results.todos);
    allResults.fixmes.push(...results.fixmes);
    allResults.hacks.push(...results.hacks);
    allResults.anyTypes.push(...results.anyTypes);
    allResults.eslintDisables.push(...results.eslintDisables);
  } else {
    console.warn(`⚠️ ディレクトリが存在しません: ${dir}`);
  }
}

const report = generateReport(allResults);

try {
  fs.writeFileSync('.tech-debt-report.md', report);
  console.log('\n✅ レポート生成完了: .tech-debt-report.md');
} catch (error) {
  console.error(`❌ レポート書き込み失敗: ${error.message}`);
  process.exit(1);
}

console.log(`   TODO: ${allResults.todos.length} 件`);
console.log(`   FIXME: ${allResults.fixmes.length} 件`);
console.log(`   HACK: ${allResults.hacks.length} 件`);
console.log(`   any型: ${allResults.anyTypes.length} 件`);
console.log(`   eslint-disable: ${allResults.eslintDisables.length} 件`);

// FIXME または HACK が存在する場合は警告
if (allResults.fixmes.length > 0 || allResults.hacks.length > 0) {
  console.log('\n⚠️ 警告: FIXME または HACK が検出されました。早期対応を推奨します。');
}

// 正常終了
process.exit(0);
```

### 6.7 ロールバック手順

**6.7.1 CI 問題発生時のロールバック**

```markdown
## CI ロールバック手順

### 1. ワークフロー無効化（緊急時）
1. GitHub リポジトリ → Settings → Actions → General
2. 「Disable Actions」を選択
3. または、`.github/workflows/quality-gate.yml` を削除するコミット

### 2. 特定ジョブの一時無効化
ワークフローファイル内で `if: false` を追加:
```yaml
visual-regression:
  if: false  # 一時的に無効化
  name: Visual Regression
```

### 3. ブランチ保護ルールの緩和
1. Settings → Branches → main → Edit
2. 「Require status checks to pass」のチェックを外す

### 4. 復旧後の確認
1. ローカルで `npm run build && npm run lint` 成功を確認
2. テスト PR を作成して CI 動作確認
3. ブランチ保護ルールを再有効化
```

### 6.8 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | CI ワークフローが PR で自動実行 | テスト PR 作成 | [ ] |
| 2 | ビルド失敗時に PR がブロック | 意図的失敗テスト | [ ] |
| 3 | バンドルサイズが PR にコメント | PR 確認 | [ ] |
| 4 | Visual Regression が認証込みで動作 | CI ログ確認 | [ ] |
| 5 | 技術負債レポートが PR にコメント | PR 確認 | [ ] |
| 6 | Lighthouse スコアが記録される | CI アーティファクト確認 | [ ] |
| 7 | ロールバック手順書が存在 | ドキュメント確認 | [ ] |

---

## 7. ワークストリーム間の依存関係

```
                    ┌─────────────────┐
                    │   WS-D (CI基盤)  │
                    │     Day 1-2     │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  WS-A (Perf)  │ │  WS-B (UX)    │ │  WS-C (準備)  │
   │   Day 2-5     │ │   Day 2-5     │ │   Day 1-5     │
   └───────────────┘ └───────────────┘ └───────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Phase 10 開始  │
                    │      Day 6      │
                    └─────────────────┘
```

**依存ルール:**
- WS-D の CI 基盤（Day 2 完了）後、他 WS は CI を活用可能
- WS-A の Lighthouse CI は WS-D 完了後に設定
- WS-C は独立して進行可能（他 WS への依存なし）
- 全 WS 完了後に Phase 10 開始

---

## 8. リスク管理

### 8.1 リスク一覧

| # | リスク | 影響度 | 発生確率 | 対策 |
|---|--------|--------|---------|------|
| 1 | CI 認証失敗 | 高 | 中 | テストユーザー事前作成、ローカルテスト |
| 2 | Visual Regression 誤検出 | 中 | 高 | 許容閾値調整（5%→10%）、動的要素マスク |
| 3 | RSC 移行で認証エラー | 高 | 中 | 段階的移行、フォールバック実装 |
| 4 | バンドルサイズ閾値超過 | 中 | 低 | 閾値を実績+10%に設定 |
| 5 | Lighthouse スコア未達 | 中 | 中 | 段階的目標（70→80→90） |

### 8.2 エスカレーション基準

| レベル | 条件 | アクション |
|--------|------|-----------|
| 🟢 正常 | 予定通り進行 | 継続 |
| 🟡 注意 | 1日遅延 or 軽微な問題 | スタンドアップで共有 |
| 🟠 警告 | 2日遅延 or DOD 未達リスク | スコープ調整検討 |
| 🔴 危機 | 3日以上遅延 or ブロッカー | Phase 10 延期検討 |

---

## 9. 完了報告フォーマット

```markdown
## Phase 9.94 完了報告

**完了日時:** YYYY-MM-DD HH:MM
**期間:** Day 0 (開始) ～ Day 5 (完了)

### ワークストリーム別結果

#### WS-A: パフォーマンス & 最適化
| 指標 | Before | After | 目標 | 達成 |
|------|--------|-------|------|------|
| Lighthouse Performance | ___ | ___ | 90+ | [ ] |
| Dashboard First Load JS | 145 KB | ___ KB | 120 KB | [ ] |
| LCP | ___ s | ___ s | < 2.0s | [ ] |

#### WS-B: UX向上
| 指標 | Before | After | 目標 | 達成 |
|------|--------|-------|------|------|
| Lighthouse Accessibility | ___ | ___ | 95+ | [ ] |
| axe Critical | ___ | ___ | 0 | [ ] |

#### WS-C: 拡張/新機能準備
| 指標 | Before | After | 目標 | 達成 |
|------|--------|-------|------|------|
| any 型警告 | ~40 | ___ | 20以下 | [ ] |
| unused-vars 警告 | ~20 | ___ | 10以下 | [ ] |
| exhaustive-deps 警告 | 2 | ___ | 0 | [ ] |

#### WS-D: 品質プラットフォーム強化
| 項目 | 状態 |
|------|------|
| CI ワークフロー | 導入済み / 未導入 |
| バンドルサイズチェック | 導入済み / 未導入 |
| Visual Regression | 導入済み / 未導入 |
| 技術負債レポート | 導入済み / 未導入 |
| Lighthouse CI | 導入済み / 未導入 |

### 次のアクション

Phase 10 開始: `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` を参照

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 10. 参考リンク

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright Authentication](https://playwright.dev/docs/auth)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**最終更新:** 2025-11-25
**次のアクション:** Phase 9.93 Gate 通過後、4 WS 並行開始
