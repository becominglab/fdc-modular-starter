# テストマニュアル（FDC E2Eテスト）

> 最終更新: 2025-12-02
> バージョン: v2.8.7（Phase 14.6 完了）

## 概要

FDC（Founders Direct Cockpit）のE2Eテストは **Playwright** を使用し、3つの権限ロール（OWNER, ADMIN, MEMBER）で全機能をテストします。Phase 14.6 完了により、CSVインポート/エクスポート、レポートライン、可視性/権限機能、CSP検証のテストも追加されています。

## クイックスタート

### 前提条件

- Node.js 22.x
- npm 10.x
- ローカル開発サーバーが起動していること

### テスト実行コマンド

```bash
# 1. 開発サーバーを起動
npm run dev

# 2. 全テストを実行（別ターミナルで）
npx playwright test

# 3. 特定のテストファイルのみ実行
npx playwright test tests/e2e/auth.spec.ts

# 4. 特定の権限ロールのみ実行
npx playwright test --project=OWNER-chromium

# 5. UIモードでテストを実行（デバッグ用）
npx playwright test --ui

# 6. テストレポートを表示
npx playwright show-report
```

## テスト構成

### 権限ロール（プロジェクト）

| プロジェクト | 権限 | 説明 |
|-------------|------|------|
| OWNER-chromium | OWNER | ワークスペース所有者（全機能アクセス可） |
| ADMIN-chromium | ADMIN | 管理者（ほとんどの機能にアクセス可） |
| MEMBER-chromium | MEMBER | メンバー（基本機能のみ） |

### テストファイル一覧

| ファイル | テスト数 | 内容 |
|---------|---------|------|
| `auth.spec.ts` | 11 | 認証・ログイン・ログアウト・セッション維持 |
| `leads.spec.ts` | 14 | 見込み客管理・追加・編集・削除・フィルタ |
| `all-features.spec.ts` | 37 | 全タブナビゲーション・全機能アクセス確認 |
| `form-save.spec.ts` | 21 | 全フォーム入力・保存・データ永続化 |
| `todo.spec.ts` | 6 | TODO追加・完了・フィルタリング |
| `templates.spec.ts` | 5 | テンプレート追加・表示 |
| `reports.spec.ts` | 4 | レポート表示・CSV出力 |
| `workspace.spec.ts` | 5 | ワークスペース権限・リソースアクセス |
| `sa-comprehensive.spec.ts` | 7 | SAダッシュボード・管理者設定 |
| `visual-regression.spec.ts` | 17 | ビジュアルリグレッション（デスクトップ/タブレット/モバイル） |
| `api-analyze.spec.ts` | - | API分析テスト |
| `smoke.spec.ts` | - | スモークテスト |

**合計: 420+テスト（3権限 × 140+テスト/権限）**

## テスト詳細

### 1. 認証テスト（auth.spec.ts）

```
describe('認証機能')
├── ログインフロー @auth
│   ├── ログインボタンが表示される
│   ├── ログインフローが正常に動作する
│   └── 未認証ユーザーはダッシュボードにリダイレクトされる
├── ログアウト機能 @auth
│   ├── ログアウトボタンが表示される
│   └── ログアウト後はログインページにリダイレクトされる
└── セッション維持 @auth
    ├── Cookie にセッションが保存される
    └── リロード後もセッションが維持される
```

### 2. 見込み客管理テスト（leads.spec.ts）

```
describe('見込み客管理機能')
├── Leadsページが正常に表示される
├── 新規見込み客を追加できる（モーダル表示、フォーム入力、保存）
├── 見込み客の詳細を編集できる
├── ステータスを変更できる
├── 見込み客を削除できる
├── 検索・フィルタ機能が動作する
└── ページネーションが動作する
```

### 3. 全機能テスト（all-features.spec.ts）

```
describe('全機能テスト')
├── ダッシュボード
│   ├── KPIカードが表示される
│   ├── ファネルチャートが表示される
│   └── 各セクションが表示される
├── MVV・OKR
│   ├── Mission/Vision/Valuesが表示される
│   └── OKRセクションが表示される
├── ブランド指針
│   ├── プロフィールセクションが表示される
│   └── ブランドガイドラインが表示される
├── リーンキャンバス
│   ├── 9要素が表示される
│   └── 顧客の本質セクションが表示される
├── TODO管理
│   ├── TODO一覧が表示される
│   └── フィルタが動作する
├── 見込み客管理
│   └── 一覧またはカンバンが表示される
├── 既存客管理
│   └── 一覧が表示される
├── 失注管理
│   └── 失注一覧が表示される
├── Zoom会議
│   └── スクリプトセクションが表示される
├── テンプレート集
│   └── テンプレート一覧が表示される
├── レポート
│   └── レポートセクションが表示される
├── 設定
│   └── 設定フォームが表示される
├── 管理者設定
│   └── 管理者向け設定が表示される（OWNER/ADMINのみ）
├── SAダッシュボード
│   └── SA専用ダッシュボードが表示される（SAのみ）
└── 全タブナビゲーション
    └── 全タブの切り替えが正常に動作する
```

### 4. フォーム保存テスト（form-save.spec.ts）

```
describe('フォーム入力・保存テスト')
├── MVV・OKRフォーム入力・保存
│   ├── MVV・OKRタブに切り替えられる
│   ├── MVVを編集・保存できる
│   └── OKRを編集・保存できる
├── ブランド指針フォーム入力・保存
│   ├── ブランド指針タブに切り替えられる
│   ├── プロフィールを編集・保存できる
│   └── ブランドガイドラインを編集・保存できる
├── リーンキャンバスフォーム入力・保存
│   ├── リーンキャンバスタブに切り替えられる
│   ├── 顧客の本質を編集・保存できる
│   └── リーンキャンバス9要素を編集・保存できる
├── 見込み客追加フォーム入力・保存
│   ├── 見込み客を追加できる
│   └── 見込み客一覧が表示される
├── 既存客追加フォーム入力・保存
│   ├── 既存客ページが表示される
│   └── 既存客追加ボタンが表示される
├── TODO追加・完了
│   ├── TODO管理タブが表示される
│   └── TODO追加入力フィールドが表示される
├── Zoomスクリプト入力・保存
│   ├── Zoomスクリプトタブが表示される
│   └── Zoomスクリプト編集フォームがある
├── テンプレート入力・保存
│   ├── テンプレートタブが表示される
│   └── テンプレート追加ボタンがある
├── 設定フォーム入力・保存
│   ├── 設定ページが表示される
│   └── 設定タブに切り替えられる
├── 全ボタン動作確認
│   ├── ダッシュボードの全ボタンがクリック可能
│   └── 見込み客ページの全ボタンがクリック可能
└── データ永続化確認
    └── ページリロード後もデータが保持される
```

### 5. ビジュアルリグレッションテスト（visual-regression.spec.ts）

```
describe('Visual Regression')
├── Desktop (1440px)
│   ├── ダッシュボードタブ
│   ├── MVV・OKRタブ
│   ├── ブランド指針タブ
│   ├── リーンキャンバスタブ
│   ├── TODO管理タブ
│   ├── 見込み客管理タブ
│   ├── 既存客管理タブ
│   ├── 失注管理タブ
│   ├── テンプレート集タブ
│   ├── レポートタブ
│   ├── 設定タブ
│   ├── 管理者設定タブ
│   └── SAダッシュボード
├── Tablet (768px)
│   ├── ダッシュボードタブ
│   └── タブナビゲーション
└── Mobile (375px)
    ├── ダッシュボードタブ
    ├── タブナビゲーション
    └── KPIカード（縦並び）
```

## テスト結果の確認

### 最新テスト結果（2025-12-02）

| プロジェクト | パス | スキップ | 失敗 |
|-------------|------|----------|------|
| OWNER-chromium | 140+ | 75 | 0 |
| ADMIN-chromium | 140+ | 75 | 0 |
| MEMBER-chromium | 140+ | 75 | 0 |
| **合計** | **420+** | **225** | **0** |

※ Phase 14で追加されたCSVインポート/エクスポート、レポートライン、可視性/権限のテストを含む

### テストレポートの確認

```bash
# HTMLレポートを開く
npx playwright show-report

# 失敗したテストのスクリーンショット確認
ls test-results/
```

## デバッグ方法

### 1. UIモードでデバッグ

```bash
npx playwright test --ui
```

### 2. ヘッドフルモードで実行

```bash
npx playwright test --headed
```

### 3. 特定のテストのみ実行

```bash
# テスト名でフィルタ
npx playwright test -g "ログイン"

# タグでフィルタ
npx playwright test --grep @auth
```

### 4. トレースを有効化

```bash
npx playwright test --trace on
```

### 5. スクリーンショット・動画の保存

`playwright.config.ts` で設定済み:
- 失敗時にスクリーンショットを保存
- 失敗時に動画を保存
- トレースを保存

## CI/CD統合

### GitHub Actions

`.github/workflows/quality-gate.yml` でE2Eテストが自動実行されます:

```yaml
- name: Run E2E tests
  run: npx playwright test
  env:
    PLAYWRIGHT_BASE_URL: http://localhost:3000
```

## よくある問題と解決方法

### 1. サーバーが起動していない

```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```

**解決方法**: `npm run dev` でサーバーを起動

### 2. セレクタが見つからない

```
Error: locator.click: Timeout 30000ms exceeded
```

**解決方法**:
- `--ui` モードでDOM構造を確認
- `page.waitForSelector()` を追加
- タイムアウトを延長

### 3. 認証が失敗する

```
Error: Authentication failed
```

**解決方法**:
- `.env.local` の認証設定を確認
- `tests/.auth/` のセッションファイルを削除して再生成

## カスタムテストの追加

### 新しいテストファイルの作成

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { login, switchToTab } from './utils';

test.describe('新機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('機能が動作する', async ({ page }) => {
    await page.goto('/dashboard');
    await switchToTab(page, 'my-feature');
    await expect(page.locator('h2')).toContainText('新機能');
  });
});
```

### ユーティリティ関数（tests/e2e/utils.ts）

```typescript
// ログイン
await login(page);

// タブ切り替え
await switchToTab(page, 'mvv-okr');

// モーダルを開く
await openModal(page, 'add-lead');

// フォーム入力
await fillForm(page, {
  name: 'テスト',
  email: 'test@example.com'
});
```

## 関連ドキュメント

- [開発ガイド](./DEVELOPMENT.md)
- [アーキテクチャ概要](./FDC-ARCHITECTURE-OVERVIEW.md)
- [セキュリティガイド](./SECURITY.md)
