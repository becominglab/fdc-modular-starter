# Phase 9.93-C: UI検証 & Visual Regression

**最終更新:** 2025-11-25
**ステータス:** 待機中（Phase 9.92 完了後に開始）
**並列ワークストリーム:** C（4並列中）
**依存関係:** なし（A, B と並列実行可能）

---

## 必読ドキュメント（作業開始前に必ず確認）

| ドキュメント | パス | 確認項目 |
|-------------|------|---------|
| **グランドガイド** | `docs/FDC-GRAND-GUIDE.md` | UI/UX 方針、ガラスモーフィズム設計 |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | React 実装ルール、DOM 操作禁止 |
| **統括ランブック** | `docs/PHASE9.93-BUGFIX-RUNBOOK.md` | Phase 9.93 全体の DOD、UI 差異の定義 |

---

## 0. ワークストリーム概要

### 0.1 目的

旧 UI との完全一致を検証し、差異を修正する。Visual Regression Test を導入して継続的な品質保証を実現する。

### 0.2 スコープ

| タスクID | タスク名 | 内容 |
|---------|---------|------|
| UI-01 | ベースライン作成 | 旧 UI のスクリーンショット撮影 |
| UI-02 | 差異検出 | 新旧比較、差異リスト作成 |
| UI-03 | 差異修正 | CSS/コンポーネント修正 |
| UI-04 | Visual Regression 導入 | Playwright スナップショットテスト |
| UI-05 | CI 自動化 | Visual Regression の CI 組み込み |

### 0.3 完了条件（DOD）

- [ ] すべてのタブが旧 UI と 95% 以上一致
- [ ] Visual Regression Test が 9 スナップショット（3画面×3ビューポート）で Pass
- [ ] CI で差異検出時に PR がブロックされる
- [ ] コンソールに警告・エラーが出ない

---

## 1. UI-01: ベースライン作成

### 1.1 目的

比較対象となる旧 UI のスクリーンショットを撮影・保存する。

### 1.2 旧 UI の起動方法

```bash
# 旧 UI がある場合
cd archive/phase9-legacy-root
npx serve .  # または python -m http.server 8080

# 旧 UI がない場合は、本番環境のスクリーンショットを使用
```

### 1.3 撮影対象

| # | 画面 | パス | ビューポート |
|---|------|------|-------------|
| 1 | ダッシュボード | `/dashboard` | 1440×900, 768×1024, 375×667 |
| 2 | 見込み客 | `/leads` | 1440×900, 768×1024, 375×667 |
| 3 | 既存客 | `/clients` | 1440×900, 768×1024, 375×667 |
| 4 | MVV・OKR | `/mvv` | 1440×900 |
| 5 | ブランド指針 | `/brand` | 1440×900 |
| 6 | リーンキャンバス | `/lean` | 1440×900 |
| 7 | TODO | `/todo` | 1440×900 |
| 8 | Zoom | `/zoom` | 1440×900 |
| 9 | テンプレート | `/templates` | 1440×900 |
| 10 | レポート | `/reports` | 1440×900 |

### 1.4 スクリーンショット保存先

```
docs/ui-baseline/
├── desktop/
│   ├── dashboard.png
│   ├── leads.png
│   ├── clients.png
│   └── ...
├── tablet/
│   ├── dashboard.png
│   └── ...
└── mobile/
    ├── dashboard.png
    └── ...
```

### 1.5 撮影手順（手動）

1. Chrome DevTools を開く
2. デバイスツールバーで適切なビューポートを設定
3. 「Capture full size screenshot」を実行
4. `docs/ui-baseline/` に保存

---

## 2. UI-02: 差異検出

### 2.1 比較ツール

- **オンライン**: [diffchecker.com/image-diff](https://www.diffchecker.com/image-diff/)
- **CLI**: ImageMagick `compare` コマンド
- **自動化**: Playwright Visual Comparison

### 2.2 比較手順

```bash
# ImageMagick を使用した比較（インストール: brew install imagemagick）
compare -metric AE \
  docs/ui-baseline/desktop/dashboard.png \
  docs/ui-current/desktop/dashboard.png \
  docs/ui-diff/desktop/dashboard-diff.png
```

### 2.3 差異記録テンプレート

**`docs/UI-DIFF-LOG.md` を作成:**

```markdown
# UI 差異ログ

## 検出日: YYYY-MM-DD

### ダッシュボード

| # | 要素 | 差異内容 | 重要度 | ステータス |
|---|------|---------|--------|-----------|
| 1 | KPI カード | 角丸が 8px（正: 12px） | 高 | 修正済み |
| 2 | ファネル | 色が #00B8C5（正: #00B8C4） | 低 | 未対応 |

### 見込み客

| # | 要素 | 差異内容 | 重要度 | ステータス |
|---|------|---------|--------|-----------|
| 1 | ... | ... | ... | ... |

（以下、各画面ごとに記載）
```

---

## 3. UI-03: 差異修正

### 3.1 修正優先度

| 重要度 | 基準 | 対応 |
|--------|------|------|
| 高 | レイアウト崩れ、機能に影響 | Phase 9.93 で必須修正 |
| 中 | 色・サイズの顕著な違い | Phase 9.93 で修正 |
| 低 | 微細な差異（1px 未満） | Phase 10 以降で対応可 |

### 3.2 よくある差異と修正方法

#### 角丸の差異

```css
/* 旧 UI */
border-radius: 12px;

/* 修正: globals.css の変数を使用 */
border-radius: var(--radius-lg);  /* 12px */
```

#### 色の差異

```css
/* CSS 変数を確認 */
:root {
  --primary: #00B8C4;  /* 正しい値か確認 */
}

/* コンポーネントで使用 */
background: var(--primary);
```

#### 余白の差異

```css
/* 旧 UI の値を確認して適用 */
padding: 16px 24px;
margin-bottom: 24px;
```

### 3.3 修正チェックリスト

| # | 画面 | 差異数 | 修正完了 | 残差異 |
|---|------|--------|---------|--------|
| 1 | ダッシュボード | ___ | [ ] | ___ |
| 2 | 見込み客 | ___ | [ ] | ___ |
| 3 | 既存客 | ___ | [ ] | ___ |
| 4 | MVV・OKR | ___ | [ ] | ___ |
| 5 | ブランド指針 | ___ | [ ] | ___ |
| 6 | リーンキャンバス | ___ | [ ] | ___ |
| 7 | TODO | ___ | [ ] | ___ |
| 8 | Zoom | ___ | [ ] | ___ |
| 9 | テンプレート | ___ | [ ] | ___ |
| 10 | レポート | ___ | [ ] | ___ |

---

## 4. UI-04: Visual Regression 導入

### 4.1 目的

UI 差異を自動検出し、継続的な品質保証を実現する。

### 4.2 Playwright 設定

**playwright.config.ts に追加:**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... 既存設定

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,  // 5% 以下の差異を許容
      threshold: 0.2,           // ピクセル単位の閾値
    },
  },

  // スナップショット保存先
  snapshotDir: './tests/e2e/snapshots',
});
```

### 4.3 テストファイル作成

**tests/e2e/visual-regression.spec.ts:**

```typescript
import { test, expect } from '@playwright/test';

// ビューポート定義
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

// 主要画面定義
const pages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'leads', path: '/leads' },
  { name: 'clients', path: '/clients' },
];

// 認証ヘルパー
async function login(page: any) {
  // テスト用認証処理（環境に応じて調整）
  await page.goto('/login');
  // ... 認証処理
}

// Visual Regression テスト
test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const viewport of viewports) {
    for (const targetPage of pages) {
      test(`${targetPage.name} - ${viewport.name}`, async ({ page }) => {
        // ビューポート設定
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        // ページ遷移
        await page.goto(targetPage.path);

        // ネットワーク完了を待機
        await page.waitForLoadState('networkidle');

        // 動的コンテンツの安定を待機
        await page.waitForTimeout(500);

        // スクリーンショット比較
        await expect(page).toHaveScreenshot(
          `${targetPage.name}-${viewport.name}.png`,
          {
            // 動的コンテンツをマスク
            mask: [
              page.locator('[data-testid="dynamic-date"]'),
              page.locator('[data-testid="dynamic-count"]'),
              page.locator('.animate-spin'),  // ローディング
            ],
          }
        );
      });
    }
  }
});
```

### 4.4 ベースライン作成

```bash
# 初回: ベースラインスナップショットを作成
npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots

# スナップショットをコミット
git add tests/e2e/snapshots/
git commit -m "feat: add visual regression baseline snapshots"
```

### 4.5 テスト実行

```bash
# 通常実行（差異検出）
npx playwright test tests/e2e/visual-regression.spec.ts

# 差異がある場合、レポートを確認
npx playwright show-report
```

---

## 5. UI-05: CI 自動化

### 5.1 目的

PR 時に Visual Regression を自動実行し、差異があればブロックする。

### 5.2 package.json への追加

```json
{
  "scripts": {
    "test:visual": "playwright test tests/e2e/visual-regression.spec.ts",
    "test:visual:update": "playwright test tests/e2e/visual-regression.spec.ts --update-snapshots"
  }
}
```

### 5.3 GitHub Actions

**.github/workflows/visual-regression.yml:**

```yaml
name: Visual Regression

on:
  pull_request:
    branches: [main]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run Visual Regression Tests
        run: npm run test:visual

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: test-results/
          retention-days: 7
```

### 5.4 差異発生時のワークフロー

1. PR で Visual Regression テストが Fail
2. CI が diff 画像をアーティファクトとしてアップロード
3. 開発者が diff を確認
4. **意図した変更の場合**: `npm run test:visual:update` でベースライン更新
5. **意図しない変更の場合**: CSS/コンポーネントを修正

---

## 6. 実行順序

```
1. UI-01 ベースライン作成（1時間）
   ↓
2. UI-02 差異検出（2時間）
   ↓
3. UI-03 差異修正（4〜8時間）← 差異数による
   ↓
4. UI-04 Visual Regression 導入（2時間）
   ↓
5. UI-05 CI 自動化（1時間）
   ↓
6. 最終検証（1時間）
```

**合計推定時間:** 10〜15時間

---

## 7. 完了チェックリスト

| # | 項目 | 確認 |
|---|------|------|
| 1 | 旧 UI のベースライン画像が保存されている | [ ] |
| 2 | `docs/UI-DIFF-LOG.md` が作成されている | [ ] |
| 3 | 高・中重要度の差異がすべて修正されている | [ ] |
| 4 | `tests/e2e/visual-regression.spec.ts` が存在する | [ ] |
| 5 | ベースラインスナップショットがコミットされている | [ ] |
| 6 | `npm run test:visual` が Pass | [ ] |
| 7 | CI で Visual Regression が動作している | [ ] |
| 8 | 全画面でコンソールエラーが 0 件 | [ ] |
| 9 | レスポンシブ（3ビューポート）が正常 | [ ] |

---

## 8. トラブルシューティング

### 8.1 スナップショットが一致しない

**原因**: 動的コンテンツ（日付、件数、アニメーション）

**対処**:
```typescript
// マスク対象を追加
mask: [
  page.locator('[data-testid="dynamic-date"]'),
  page.locator('.loading-spinner'),
]
```

### 8.2 フォントレンダリングの差異

**原因**: OS 間でフォントレンダリングが異なる

**対処**:
- CI と同じ OS（Ubuntu）でベースラインを作成
- または `threshold` を緩和（0.3 など）

### 8.3 アニメーション中のキャプチャ

**原因**: CSS アニメーションが完了していない

**対処**:
```typescript
// アニメーション完了を待機
await page.waitForTimeout(1000);
// または特定のアニメーション完了を待機
await page.waitForSelector('.card', { state: 'visible' });
```

---

## 9. 次のワークストリームへの引き継ぎ

### 9.1 他ワークストリームへの影響

| ワークストリーム | 影響 |
|----------------|------|
| A（レガシー隔離） | なし |
| B（パフォーマンス） | コード分割後の UI 確認が必要 |
| D（UAT・ゲート） | Visual Regression Pass が前提条件 |

### 9.2 完了報告フォーマット

```markdown
## Phase 9.93-C 完了報告

**完了日時:** YYYY-MM-DD HH:MM
**担当:** [名前]

### UI 差異修正結果

| 画面 | 検出差異 | 修正完了 | 残差異（低） |
|------|---------|---------|-------------|
| ダッシュボード | ___ | ___ | ___ |
| 見込み客 | ___ | ___ | ___ |
| ... | ... | ... | ... |

### Visual Regression

- スナップショット数: ___
- テスト結果: Pass / Fail

### 実施内容
- [x] ベースライン作成
- [x] 差異検出・修正
- [x] Visual Regression 導入
- [x] CI 自動化

### 作成ドキュメント/ファイル
- `docs/UI-DIFF-LOG.md`
- `tests/e2e/visual-regression.spec.ts`
- `tests/e2e/snapshots/`

### 残課題
- （低重要度の差異があれば記載）
```

---

**次のドキュメント:** `PHASE9.93-D-UAT-GATE.md`
