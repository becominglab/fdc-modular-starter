# CI ロールバック手順書

**作成日:** 2025-11-25
**Phase:** 9.94-D
**目的:** CI/CD パイプラインで問題が発生した場合の復旧手順

---

## 1. 緊急時のワークフロー無効化

### 1.1 GitHub Actions を完全に無効化

**状況:** CI が完全に壊れて全ての PR がブロックされている場合

1. GitHub リポジトリ → **Settings** → **Actions** → **General**
2. 「Actions permissions」で「Disable Actions」を選択
3. 「Save」をクリック

**復旧後:**
1. 同じ画面で「Allow all actions and reusable workflows」を選択
2. 「Save」をクリック

### 1.2 特定のワークフローファイルを削除

```bash
# 一時的に quality-gate.yml を削除するコミット
git rm .github/workflows/quality-gate.yml
git commit -m "chore: temporarily disable CI workflow"
git push
```

**復旧:**
```bash
git revert HEAD
git push
```

---

## 2. 特定のジョブを一時的に無効化

### 2.1 ワークフローファイル内で無効化

`.github/workflows/quality-gate.yml` を編集:

```yaml
# 例: visual-regression ジョブを無効化
visual-regression:
  if: false  # この行を追加して無効化
  name: Visual Regression
  runs-on: ubuntu-latest
  # ...
```

### 2.2 よく使う無効化パターン

```yaml
# 特定のジョブを完全にスキップ
job-name:
  if: false

# PR のみでスキップ
job-name:
  if: github.event_name != 'pull_request'

# 特定のブランチでスキップ
job-name:
  if: github.ref != 'refs/heads/main'
```

---

## 3. ブランチ保護ルールの緩和

### 3.1 ステータスチェック要件を無効化

**状況:** CI が壊れて PR をマージできない場合

1. GitHub リポジトリ → **Settings** → **Branches**
2. **main** ブランチの保護ルールを編集（Edit）
3. 「Require status checks to pass before merging」のチェックを外す
4. 「Save changes」をクリック

**復旧後:**
1. 同じ画面で「Require status checks to pass before merging」を有効化
2. 必要なステータスチェックを選択:
   - `Build & Lint`
   - `Bundle Size Check`
3. 「Save changes」をクリック

### 3.2 管理者のマージ許可

ブランチ保護を緩和せずに緊急マージする場合:

1. 「Allow specified actors to bypass required pull requests」を有効化
2. 管理者アカウントを追加
3. 管理者がマージを実行

---

## 4. ジョブ別のトラブルシューティング

### 4.1 build-and-lint ジョブ

**よくある問題:**
- `npm ci` の失敗（依存関係の問題）
- `type-check` の失敗（型エラー）
- `lint` の失敗（ESLint エラー）

**解決策:**
```bash
# ローカルで確認
npm ci
npm run type-check
npm run lint
npm run build
```

### 4.2 bundle-size ジョブ

**よくある問題:**
- バンドルサイズが閾値超過

**解決策:**
1. `scripts/check-bundle-size.cjs` の閾値を一時的に緩和
2. または `continue-on-error: true` を追加して警告のみにする

```yaml
bundle-size:
  steps:
    - name: Check bundle size
      continue-on-error: true  # エラーでも続行
```

### 4.3 visual-regression ジョブ

**よくある問題:**
- スナップショットの差異検出
- 認証の失敗
- タイムアウト

**解決策:**
1. スナップショットを更新:
   ```bash
   npm run test:visual:update
   git add tests/e2e/*.png
   git commit -m "chore: update visual regression snapshots"
   ```

2. 許容差異を緩和:
   ```typescript
   // tests/e2e/visual-regression.spec.ts
   threshold: 0.10,  // 5% → 10% に緩和
   ```

### 4.4 lighthouse ジョブ

**よくある問題:**
- スコアが閾値未満
- サーバー起動の失敗

**解決策:**
1. `lighthouserc.json` の閾値を緩和:
   ```json
   "categories:performance": ["warn", { "minScore": 0.5 }]
   ```

2. タイムアウトを延長:
   ```yaml
   - name: Wait for server
     run: npx wait-on http://localhost:3000 --timeout 120000
   ```

### 4.5 tech-debt-report ジョブ

**よくある問題:**
- スクリプト実行エラー

**解決策:**
- このジョブは PR コメントのみなので、`continue-on-error: true` で問題なし

---

## 5. 復旧後の確認

### 5.1 ローカルでの事前確認

CI を再有効化する前に、ローカルで以下を確認:

```bash
# 全てのチェックを実行
npm ci
npm run type-check
npm run lint
npm run build
npm run check:bundle
npm run check:legacy
```

### 5.2 テスト PR の作成

```bash
# テスト用ブランチを作成
git checkout -b ci-test
echo "# CI Test" >> README.md
git add .
git commit -m "chore: CI recovery test"
git push -u origin ci-test
```

1. PR を作成して CI が正常に動作することを確認
2. 全てのジョブが成功したら PR をクローズ
3. ブランチを削除

### 5.3 ブランチ保護ルールの再有効化

1. **Settings** → **Branches** → **main** → **Edit**
2. 「Require status checks to pass before merging」を有効化
3. 必要なチェックを選択
4. 「Save changes」

---

## 6. 連絡先とエスカレーション

| 状況 | 対応 | 連絡先 |
|------|------|--------|
| CI が壊れて PR がマージできない | ブランチ保護を緩和 | 管理者 |
| ビルドが失敗し続ける | 依存関係の確認 | 開発者 |
| スナップショットの大量差異 | デザイン変更の確認 | デザイナー/開発者 |
| Lighthouse スコア低下 | パフォーマンス調査 | 開発者 |

---

## 7. 予防措置

### 7.1 ローカルでの事前チェック

コミット前に以下を実行する習慣をつける:

```bash
npm run type-check && npm run lint && npm run build
```

### 7.2 Git hooks の設定（推奨）

`.husky/pre-commit`:
```bash
#!/bin/sh
npm run type-check
npm run lint
```

### 7.3 定期的なスナップショット更新

Visual Regression テストのスナップショットは、UI 変更時に更新が必要:

```bash
npm run test:visual:update
```

---

**最終更新:** 2025-11-25
