# Phase 9.94-D: 品質プラットフォーム強化ワークストリーム

**作成日:** 2025-11-25
**親ランブック:** `docs/PHASE9.94-POLISH-RUNBOOK.md`
**担当:** ____
**期間:** Day 1-5

---

## 1. 目的

CI/CD パイプラインを強化し、**Phase 10/11/12 まで使い続ける品質基盤**を構築する。

### 1.1 短期目標（Phase 9.94）
- CI 自動実行 + PR ブロック
- Visual Regression 常設化
- 技術負債レポート自動化

### 1.2 中長期視野（Phase 10/11/12）

| Phase | 機能 | 品質基盤での対応 |
|-------|------|----------------|
| **10** | TODO（4象限 + Elastic Habits） | E2Eテスト雛形、パフォーマンス計測基準 |
| **11** | Action Map（戦術レイヤー） | ツリー構造テスト、進捗計算ロジックテスト |
| **12** | OKR（戦略レイヤー） | 三層連携テスト、ロールアップ計算テスト |

---

## 2. 必読ドキュメント

| ドキュメント | パス | 確認 |
|-------------|------|------|
| **Phase 9.94 メインランブック** | `docs/PHASE9.94-POLISH-RUNBOOK.md` | [ ] |
| **Phase 10 ランブック** | `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` | [ ] |
| **Phase 11 ランブック** | `docs/PHASE11-ACTION-MAP-RUNBOOK.md` | [ ] |
| **Phase 12 ランブック** | `docs/PHASE12-OKR-RUNBOOK.md` | [ ] |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | [ ] |
| **技術負債インベントリ** | `docs/TECH-DEBT-INVENTORY.md` | [ ] |

---

## 3. 現状と目標

### 3.1 Phase 9.94 スコープ

| 項目 | 現状 | 目標 |
|------|------|------|
| ビルド/Lint | 手動実行 | **CI 自動実行 + PR ブロック** |
| バンドルサイズ | スクリプトのみ | **CI 閾値チェック + PR コメント** |
| Visual Regression | 任意実行 | **CI 必須 + 5%超で PR ブロック** |
| 技術負債レポート | なし | **PR 自動コメント** |
| Lighthouse CI | なし | **スコア記録 + PR コメント** |
| エラートラッキング | なし | **Sentry 導入検討** |

### 3.2 Phase 10/11/12 拡張要件

| 項目 | Phase 10 | Phase 11 | Phase 12 |
|------|---------|---------|---------|
| **E2E テスト** | TODO CRUD | Action Map CRUD | OKR CRUD + 連携 |
| **パフォーマンス基準** | 4象限ボード P95 < 1.2s | Action Map タブ P95 < 1.5s | OKR ダッシュボード P95 < 2.0s |
| **データサイズ監視** | workspace_data < 225KB | workspace_data < 200KB | workspace_data < 250KB |
| **VRT 対象ページ** | /todo | /action-map | /okr |
| **ユニットテスト** | Elastic Habits 計算 | 進捗ロールアップ計算 | KR 達成率計算 |

---

## 4. タスク一覧

### 4.1 Phase 9.94 必須タスク

| # | タスク | 期日 | 完了判定 | 優先度 | 完了 |
|---|--------|------|---------|--------|------|
| D-01 | GitHub Actions ワークフロー作成 | Day 1 | `.github/workflows/quality-gate.yml` | 最高 | [ ] |
| D-02 | テスト認証バイパス実装 | Day 1 | CI でログイン可能 | 最高 | [ ] |
| D-03 | 技術負債スキャナー作成 | Day 1 | `scripts/report-tech-debt.cjs` | 高 | [ ] |
| D-04 | バンドルサイズチェッカー強化 | Day 2 | 閾値チェック + エラーハンドリング | 高 | [ ] |
| D-05 | Visual Regression テスト整備 | Day 2 | 認証込みで動作 | 高 | [ ] |
| D-06 | Lighthouse CI 導入 | Day 3 | スコア記録 + PR コメント | 中 | [ ] |
| D-07 | ロールバック手順書作成 | Day 2 | 手順ドキュメント | 中 | [ ] |
| D-08 | Sentry 導入検討 | Day 4 | 導入可否判断 | 低 | [ ] |
| D-09 | デプロイ警告のCI検出 | Day 3 | 警告をPRコメントに表示 | 中 | [ ] |

### 4.2 Phase 10/11/12 先行準備タスク

| # | タスク | 期日 | 完了判定 | Phase | 完了 |
|---|--------|------|---------|-------|------|
| D-10 | E2E テスト基盤・雛形作成 | Day 3 | `tests/e2e/` 構造確立 | 10-12 | [ ] |
| D-11 | パフォーマンス計測スクリプト | Day 4 | P95 計測 + CI 連携 | 10-12 | [ ] |
| D-12 | workspace_data サイズ監視 | Day 4 | 250KB 閾値チェック | 10-12 | [ ] |
| D-13 | ユニットテスト基盤整備 | Day 3 | Vitest 設定完了 | 10-12 | [ ] |
| D-14 | テストデータファクトリ作成 | Day 4 | 共通テストデータ生成 | 10-12 | [ ] |
| D-15 | CI 高速化（キャッシュ最適化） | Day 5 | 実行時間 20% 削減 | 10-12 | [ ] |

---

## 5. 実装詳細

### 5.1 D-01: GitHub Actions ワークフロー作成

**ファイル:** `.github/workflows/quality-gate.yml`

```yaml
name: Quality Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  NODE_VERSION: '22'
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
        id: lint
        run: |
          npm run lint 2>&1 | tee lint-output.txt
          echo "warnings=$(grep -c 'warning' lint-output.txt || echo 0)" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Build
        id: build
        run: |
          npm run build 2>&1 | tee build-output.txt
          grep -i "warn" build-output.txt > build-warnings.txt || true
          echo "warning_count=$(wc -l < build-warnings.txt | tr -d ' ')" >> $GITHUB_OUTPUT
        continue-on-error: false

      - name: Check legacy imports
        run: npm run check:legacy

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            .next/
            lint-output.txt
            build-output.txt
            build-warnings.txt
          retention-days: 1

      - name: Comment warnings on PR
        if: github.event_name == 'pull_request' && steps.lint.outputs.warnings != '0'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const lintOutput = fs.readFileSync('lint-output.txt', 'utf8');
            const warningCount = '${{ steps.lint.outputs.warnings }}';
            const lines = lintOutput.split('\n');
            const warningLines = lines.filter(l => l.includes('warning')).slice(0, 20);

            const body = `## ⚠️ Lint Warnings: ${warningCount} 件

<details>
<summary>詳細を表示（上位20件）</summary>

\`\`\`
${warningLines.join('\n')}
\`\`\`

</details>

> 警告はビルドをブロックしませんが、削減を目指しています。
`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

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
          path: ./
      - name: Check bundle size
        id: bundle
        run: |
          node scripts/check-bundle-size.cjs 2>&1 | tee bundle-report.txt
          if [ $? -eq 0 ]; then
            echo "status=success" >> $GITHUB_OUTPUT
          else
            echo "status=failure" >> $GITHUB_OUTPUT
          fi
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
            const status = '${{ steps.bundle.outputs.status }}';
            const emoji = status === 'success' ? '✅' : '⚠️';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ${emoji} Bundle Size Report\n\`\`\`\n${report}\n\`\`\``
            });
      - name: Fail if threshold exceeded
        if: steps.bundle.outputs.status == 'failure'
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
          path: ./
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
            if (report && report.trim()) {
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
          path: ./
      - name: Start server
        run: npm run start &
        env:
          PORT: 3000
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      - name: Run Lighthouse
        id: lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/login
          configPath: ./lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true

  # ===============================
  # Job 6: ユニットテスト (Phase 10+ 準備)
  # ===============================
  unit-tests:
    name: Unit Tests
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
      - name: Run unit tests
        run: npm run test:unit --if-present
        continue-on-error: true

  # ===============================
  # Job 7: E2E テスト (Phase 10+ 準備)
  # ===============================
  e2e-tests:
    name: E2E Tests
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
          path: ./
      - name: Start server
        run: npm run start &
        env:
          PORT: 3000
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      - name: Run E2E tests
        run: npm run test:e2e --if-present
        env:
          TEST_USER_EMAIL: ${{ env.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ env.TEST_USER_PASSWORD }}
        continue-on-error: true
```

### 5.2 D-10: E2E テスト基盤・雛形作成

**ディレクトリ構造（Phase 10/11/12 対応）:**

```
tests/
├── e2e/
│   ├── auth.setup.ts           # 認証セットアップ
│   ├── visual-regression.spec.ts
│   ├── smoke.spec.ts           # スモークテスト（全Phase共通）
│   ├── phase10/                # Phase 10 TODO テスト
│   │   ├── todo-crud.spec.ts
│   │   ├── todo-board.spec.ts
│   │   └── elastic-habits.spec.ts
│   ├── phase11/                # Phase 11 Action Map テスト
│   │   ├── action-map-crud.spec.ts
│   │   ├── action-item-tree.spec.ts
│   │   └── progress-rollup.spec.ts
│   └── phase12/                # Phase 12 OKR テスト
│       ├── okr-crud.spec.ts
│       ├── kr-progress.spec.ts
│       └── full-integration.spec.ts
├── unit/
│   ├── lib/
│   │   ├── types/
│   │   │   └── todo.test.ts
│   │   └── core/
│   │       └── validator.test.ts
│   ├── phase10/                # Phase 10 ユニットテスト
│   │   ├── elastic-habits.test.ts
│   │   └── streak-calculator.test.ts
│   ├── phase11/                # Phase 11 ユニットテスト
│   │   └── progress-calculator.test.ts
│   └── phase12/                # Phase 12 ユニットテスト
│       └── kr-calculator.test.ts
├── fixtures/                   # テストデータ
│   ├── users.ts
│   ├── workspaces.ts
│   ├── todos.ts
│   ├── action-maps.ts
│   └── okrs.ts
└── .auth/
    └── user.json              # 認証状態（gitignore）
```

**スモークテスト雛形:**

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

/**
 * スモークテスト
 * 各 Phase で主要ページが正常に読み込まれることを確認
 */
test.describe('Smoke Tests', () => {
  // 既存ページ
  test('Dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1, [data-testid="dashboard-title"]')).toBeVisible();
  });

  test('Leads page loads', async ({ page }) => {
    await page.goto('/leads');
    await expect(page).toHaveURL(/leads/);
  });

  test('Clients page loads', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/clients/);
  });

  // Phase 10: TODO
  test.skip('TODO page loads', async ({ page }) => {
    // Phase 10 で実装後に有効化
    await page.goto('/todo');
    await expect(page).toHaveURL(/todo/);
    await expect(page.locator('[data-testid="todo-board"]')).toBeVisible();
  });

  // Phase 11: Action Map
  test.skip('Action Map page loads', async ({ page }) => {
    // Phase 11 で実装後に有効化
    await page.goto('/action-map');
    await expect(page).toHaveURL(/action-map/);
  });

  // Phase 12: OKR
  test.skip('OKR page loads', async ({ page }) => {
    // Phase 12 で実装後に有効化
    await page.goto('/okr');
    await expect(page).toHaveURL(/okr/);
  });
});
```

**Phase 10 E2E テスト雛形:**

```typescript
// tests/e2e/phase10/todo-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 10: TODO CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo');
  });

  test('can create a new task', async ({ page }) => {
    // TODO: Phase 10 で実装
    test.skip();
  });

  test('can edit an existing task', async ({ page }) => {
    test.skip();
  });

  test('can delete a task', async ({ page }) => {
    test.skip();
  });

  test('can drag task between quadrants', async ({ page }) => {
    test.skip();
  });
});

// tests/e2e/phase10/elastic-habits.spec.ts
test.describe('Phase 10: Elastic Habits', () => {
  test('can select ume level', async ({ page }) => {
    test.skip();
  });

  test('can select take level', async ({ page }) => {
    test.skip();
  });

  test('can select matsu level', async ({ page }) => {
    test.skip();
  });

  test('streak counter increments on completion', async ({ page }) => {
    test.skip();
  });
});
```

### 5.3 D-11: パフォーマンス計測スクリプト

**ファイル:** `scripts/check-performance.cjs`

```javascript
#!/usr/bin/env node
/**
 * パフォーマンス計測スクリプト
 *
 * Phase 10/11/12 のパフォーマンス基準を満たしているか確認
 */

const { execSync } = require('child_process');
const fs = require('fs');

// ===============================
// パフォーマンス基準（Phase 別）
// ===============================
const THRESHOLDS = {
  // Phase 10
  'todo-board': { p95: 1200, name: '4象限ボード表示' },
  'todo-create': { p95: 800, name: 'TODO作成' },

  // Phase 11
  'action-map-tab': { p95: 1500, name: 'Action Map タブ表示' },
  'action-item-calc': { p95: 100, name: 'Action Item 進捗計算' },

  // Phase 12
  'okr-dashboard': { p95: 2000, name: 'OKR ダッシュボード表示' },
  'kr-rollup': { p95: 200, name: 'KR 達成率計算' },

  // 共通
  'page-load': { p95: 3000, name: 'ページ読み込み' },
};

// ===============================
// Lighthouse からパフォーマンスデータを取得
// ===============================
function runLighthouse(url) {
  try {
    const result = execSync(
      `npx lighthouse ${url} --output=json --quiet`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(result);
  } catch (error) {
    console.error(`Lighthouse 実行エラー: ${error.message}`);
    return null;
  }
}

// ===============================
// レポート生成
// ===============================
function generateReport(results) {
  let report = '## ⚡ Performance Report\n\n';
  report += '| 指標 | 計測値 | 基準 (P95) | 状態 |\n';
  report += '|------|--------|-----------|------|\n';

  for (const [key, threshold] of Object.entries(THRESHOLDS)) {
    const value = results[key] || 'N/A';
    const status = value !== 'N/A' && value <= threshold.p95 ? '✅' : '❌';
    report += `| ${threshold.name} | ${value}ms | ${threshold.p95}ms | ${status} |\n`;
  }

  return report;
}

// ===============================
// メイン（Phase 10+ で有効化）
// ===============================
console.log('⚡ パフォーマンス計測スクリプト');
console.log('※ Phase 10 以降で本格運用開始\n');

// 現時点では基盤のみ準備
console.log('基準値定義:');
for (const [key, threshold] of Object.entries(THRESHOLDS)) {
  console.log(`  - ${threshold.name}: P95 < ${threshold.p95}ms`);
}

console.log('\n✅ パフォーマンス計測基盤準備完了');
```

### 5.4 D-12: workspace_data サイズ監視

**ファイル:** `scripts/check-data-size.cjs`

```javascript
#!/usr/bin/env node
/**
 * workspace_data サイズ監視スクリプト
 *
 * Phase 10/11/12 の容量制限:
 * - Phase 10 完了時: < 225KB
 * - Phase 11 完了時: < 200KB（推奨）
 * - Phase 12 完了時: < 250KB（ハード上限）
 */

const fs = require('fs');
const path = require('path');

// ===============================
// 容量制限（Phase 別）
// ===============================
const SIZE_LIMITS = {
  phase10: 225 * 1024,  // 225KB
  phase11: 200 * 1024,  // 200KB（推奨）
  phase12: 250 * 1024,  // 250KB（ハード上限）
  current: 250 * 1024,  // 現在の上限
};

// ===============================
// サンプルデータからサイズ推定
// ===============================
function estimateDataSize() {
  // 実際の workspace_data は DB から取得する必要があるため、
  // ここではサンプルデータのサイズを計算

  const sampleData = {
    leads: Array(50).fill({ id: 'uuid', name: 'Lead Name', status: 'new' }),
    clients: Array(20).fill({ id: 'uuid', name: 'Client Name' }),
    todos: Array(100).fill({
      id: 'uuid',
      title: 'Task Title',
      suit: 'heart',
      status: 'not_started',
      updatedAt: Date.now(),
    }),
    actionMaps: Array(10).fill({
      id: 'uuid',
      title: 'Action Map',
      items: Array(20).fill({ id: 'uuid', title: 'Item' }),
    }),
    okrs: Array(5).fill({
      id: 'uuid',
      objective: 'Objective',
      keyResults: Array(3).fill({ id: 'uuid', title: 'KR' }),
    }),
  };

  const jsonString = JSON.stringify(sampleData);
  return Buffer.byteLength(jsonString, 'utf8');
}

// ===============================
// レポート生成
// ===============================
function generateReport(currentSize) {
  const currentKB = Math.round(currentSize / 1024);
  const limitKB = Math.round(SIZE_LIMITS.current / 1024);
  const usage = Math.round((currentSize / SIZE_LIMITS.current) * 100);

  let report = '## 📊 workspace_data サイズレポート\n\n';
  report += `| 項目 | 値 |\n`;
  report += `|------|----|\n`;
  report += `| 推定サイズ | ${currentKB} KB |\n`;
  report += `| 上限 | ${limitKB} KB |\n`;
  report += `| 使用率 | ${usage}% |\n\n`;

  report += '### Phase 別上限\n\n';
  report += '| Phase | 上限 | 状態 |\n';
  report += '|-------|------|------|\n';

  for (const [phase, limit] of Object.entries(SIZE_LIMITS)) {
    if (phase === 'current') continue;
    const limitKB = Math.round(limit / 1024);
    const status = currentSize <= limit ? '✅' : '⚠️';
    report += `| ${phase} | ${limitKB} KB | ${status} |\n`;
  }

  return report;
}

// ===============================
// メイン
// ===============================
console.log('📊 workspace_data サイズ監視\n');

const estimatedSize = estimateDataSize();
console.log(`推定サイズ: ${Math.round(estimatedSize / 1024)} KB`);
console.log(`上限: ${Math.round(SIZE_LIMITS.current / 1024)} KB`);
console.log(`使用率: ${Math.round((estimatedSize / SIZE_LIMITS.current) * 100)}%\n`);

if (estimatedSize > SIZE_LIMITS.current) {
  console.log('❌ 容量上限を超過しています');
  process.exit(1);
} else if (estimatedSize > SIZE_LIMITS.current * 0.8) {
  console.log('⚠️ 容量上限の 80% を超えています');
} else {
  console.log('✅ 容量は正常範囲内です');
}
```

### 5.5 D-13: ユニットテスト基盤整備（Vitest）

**ファイル:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'app/**/*.tsx'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**ファイル:** `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';

// グローバルモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
```

**Phase 10 ユニットテスト雛形:**

```typescript
// tests/unit/phase10/streak-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStreak } from '@/lib/types/todo';

describe('calculateStreak', () => {
  it('returns 0 when lastCompletedAt is undefined', () => {
    const task = { id: '1', title: 'Test', suit: 'heart', status: 'not_started', updatedAt: Date.now(), createdAt: Date.now() };
    expect(calculateStreak(task as any)).toBe(0);
  });

  it('maintains streak when completed yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const task = {
      id: '1',
      title: 'Test',
      suit: 'heart',
      status: 'done',
      streakCount: 5,
      lastCompletedAt: yesterday.toISOString(),
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    expect(calculateStreak(task as any)).toBe(5);
  });

  it('resets streak when gap is more than 1 day', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const task = {
      id: '1',
      title: 'Test',
      suit: 'heart',
      status: 'done',
      streakCount: 10,
      lastCompletedAt: threeDaysAgo.toISOString(),
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    expect(calculateStreak(task as any)).toBe(0);
  });
});
```

### 5.6 D-14: テストデータファクトリ

**ファイル:** `tests/fixtures/factory.ts`

```typescript
/**
 * テストデータファクトリ
 *
 * Phase 10/11/12 で使用する共通テストデータ生成
 */

import type { Task, Suit, ElasticLevel } from '@/lib/types/todo';

let idCounter = 0;

function generateId(): string {
  return `test-${++idCounter}`;
}

// ===============================
// Phase 10: Task
// ===============================
export function createTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: generateId(),
    title: 'Test Task',
    suit: 'heart',
    status: 'not_started',
    updatedAt: now,
    createdAt: now,
    ...overrides,
  };
}

export function createElasticHabitTask(level: ElasticLevel): Task {
  return createTask({
    isElasticHabit: true,
    elasticLevel: level,
    suit: 'heart',
    streakCount: 0,
  });
}

// ===============================
// Phase 11: Action Map
// ===============================
export interface ActionItem {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'done';
  assigneeId?: string;
  dueDate?: string;
  linkedTaskIds: string[];
}

export interface ActionMap {
  id: string;
  title: string;
  goal: string;
  items: ActionItem[];
}

export function createActionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: generateId(),
    title: 'Test Action Item',
    status: 'not_started',
    linkedTaskIds: [],
    ...overrides,
  };
}

export function createActionMap(overrides: Partial<ActionMap> = {}): ActionMap {
  return {
    id: generateId(),
    title: 'Test Action Map',
    goal: 'Q1 目標達成',
    items: [createActionItem()],
    ...overrides,
  };
}

// ===============================
// Phase 12: OKR
// ===============================
export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  linkedActionMapIds: string[];
}

export interface Objective {
  id: string;
  title: string;
  period: string;
  keyResults: KeyResult[];
}

export function createKeyResult(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: generateId(),
    title: 'Test KR',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    linkedActionMapIds: [],
    ...overrides,
  };
}

export function createObjective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: generateId(),
    title: 'Test Objective',
    period: '2025-Q1',
    keyResults: [createKeyResult()],
    ...overrides,
  };
}

// ===============================
// 統合テストデータ
// ===============================
export function createFullHierarchy() {
  const task1 = createTask({ title: '毎日30分読書' });
  const task2 = createTask({ title: '週次レポート作成' });

  const actionItem = createActionItem({
    title: 'リード獲得10件',
    linkedTaskIds: [task1.id, task2.id],
  });

  const actionMap = createActionMap({
    title: 'Q1 営業計画',
    items: [actionItem],
  });

  const keyResult = createKeyResult({
    title: '新規リード50件獲得',
    linkedActionMapIds: [actionMap.id],
  });

  const objective = createObjective({
    title: '営業力強化',
    keyResults: [keyResult],
  });

  return { tasks: [task1, task2], actionMap, objective };
}
```

---

## 6. 依存関係

### 6.1 このワークストリームが他の WS に提供するもの

| 提供先 | 提供内容 | 提供日 |
|--------|---------|--------|
| WS-A | Lighthouse CI 基盤 | Day 3 |
| WS-B | アクセシビリティスコア記録 | Day 3 |
| WS-C | 技術負債レポート | Day 1 |

### 6.2 Phase 10/11/12 への引き継ぎ

| Phase | 引き継ぎ内容 |
|-------|-------------|
| Phase 10 | E2E テスト雛形（`tests/e2e/phase10/`）、ユニットテスト基盤、パフォーマンス計測スクリプト |
| Phase 11 | Action Map テスト雛形、進捗計算テスト、テストデータファクトリ |
| Phase 12 | OKR テスト雛形、三層連携テスト、統合テストデータ |

---

## 7. 完了条件（DOD）

### 7.1 Phase 9.94 必須

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | CI ワークフローが PR で自動実行 | テスト PR 作成 | [ ] |
| 2 | ビルド失敗時に PR がブロック | 意図的失敗テスト | [ ] |
| 3 | バンドルサイズが PR にコメント | PR 確認 | [ ] |
| 4 | Visual Regression が認証込みで動作 | CI ログ確認 | [ ] |
| 5 | 技術負債レポートが PR にコメント | PR 確認 | [ ] |
| 6 | Lighthouse スコアが PR にコメント | PR 確認 | [ ] |
| 7 | ロールバック手順書が存在 | ドキュメント確認 | [ ] |
| 8 | デプロイ警告が PR にコメント | PR 確認 | [ ] |

### 7.2 Phase 10/11/12 準備

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 9 | E2E テストディレクトリ構造が作成 | `tests/e2e/phase10/` 存在確認 | [ ] |
| 10 | Vitest 設定が完了 | `npm run test:unit` 実行可能 | [ ] |
| 11 | テストデータファクトリが作成 | `tests/fixtures/factory.ts` 存在確認 | [ ] |
| 12 | パフォーマンス計測スクリプトが作成 | `scripts/check-performance.cjs` 存在確認 | [ ] |
| 13 | workspace_data サイズ監視が作成 | `scripts/check-data-size.cjs` 存在確認 | [ ] |

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

## 9. ロールバック手順

**ファイル:** `docs/CI-ROLLBACK-GUIDE.md` として別途作成

（詳細は前版を参照）

---

**最終更新:** 2025-11-25
**Phase 対応:** 9.94（即時）、10/11/12（先行準備）
