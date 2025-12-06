# Phase 9.94 デバッグガイド - 2025-11-26 朝

**作成日:** 2025-11-25 深夜
**対象:** GitHub Actions Quality Gate CI 失敗

---

## 1. 現状サマリー

### 1.1 CI 失敗状況（スクリーンショットより）

| # | コミット | ステータス | 経過時間 |
|---|---------|-----------|---------|
| 1 | `fix: バッククォートをcharCodeで動的生成に変更` | In Progress | now |
| 2 | `fix: update package-lock.json and fix unit test` | In Progress | 2 min |
| 3 | `fix: YAML syntax error in quality-gate.yml` | **Failure** | 7 min |
| 4 | `feat: Phase 9.94-A パフォーマンス最適化完了` | **Failure** | 11 min |
| 5 | 複数のマージコミット | **Failure** | 19-37 min |

### 1.2 ローカルビルド状況（正常）

```
✅ npm run type-check  - PASS（エラー 0）
✅ npm run build       - PASS（警告のみ）
✅ npm run check:legacy - PASS（レガシーインポートなし）
❓ npm run test:unit   - vitest コマンドが見つからない
⚠️ npm run lint       - 警告 60件程度（エラーなし）
```

---

## 2. 推定される CI 失敗原因

### 2.1 優先度：高

#### 原因 A: vitest 依存関係の問題

**症状:**
- ローカルで `npm run test:unit` を実行すると `vitest: command not found`
- CI の `unit-tests` ジョブが失敗する可能性

**原因:**
- `vitest` が `devDependencies` に追加されているが、`npm ci` 後にパスが通っていない
- または vitest のバージョン (`^3.2.4`) が存在しない可能性

**確認方法:**
```bash
# 1. package.json の vitest バージョン確認
grep vitest package.json

# 2. npm レジストリでバージョン確認
npm view vitest versions | tail -10

# 3. ローカルで再インストール
rm -rf node_modules package-lock.json
npm install
npm run test:unit
```

**修正方法:**
```bash
# 正しいバージョンをインストール
npm install --save-dev vitest@latest
```

#### 原因 B: YAML 構文エラー（修正済み？）

**コミット履歴:**
- `fix: YAML syntax error in quality-gate.yml` が Failure
- その後の修正コミットが In Progress

**確認方法:**
```bash
# YAML 構文検証
npx yaml-lint .github/workflows/quality-gate.yml
```

### 2.2 優先度：中

#### 原因 C: バッククォート文字の問題

**コミット:** `fix: バッククォートをcharCodeで動的生成に変更`

**推定される問題:**
- GitHub Actions の YAML 内でバッククォート (`) を使用
- シェルスクリプト内での文字列処理に問題

**確認方法:**
```bash
# ワークフローファイル内のバッククォート確認
grep -n '`' .github/workflows/quality-gate.yml
```

#### 原因 D: GitHub Secrets の未設定

**症状:**
- Visual Regression テストが認証できない
- E2E テストが失敗

**確認方法:**
GitHub リポジトリ → Settings → Secrets and variables → Actions で以下を確認:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

### 2.3 優先度：低

#### 原因 E: Playwright ブラウザキャッシュの問題

**症状:**
- Visual Regression / E2E テストのタイムアウト

**確認方法:**
CI ログで以下を確認:
```
Cache Playwright browsers
Install Playwright Browsers
```

---

## 3. デバッグ手順（明日朝イチ）

### Step 1: CI ログの詳細確認（5分）

1. GitHub Actions → 失敗したワークフロー → 詳細ログを確認
2. 失敗しているジョブを特定:
   - `build-and-lint`
   - `bundle-size`
   - `visual-regression`
   - `lighthouse`
   - `unit-tests`
   - `e2e-tests`
   - `tech-debt-report`

### Step 2: vitest 依存関係の修正（10分）

```bash
cd /Users/5dmgmt/プラグイン/foundersdirect

# 1. vitest の正しいバージョン確認
npm view vitest versions | tail -5

# 2. 最新の安定版をインストール
npm install --save-dev vitest@^2.1.0 @vitejs/plugin-react@^4.0.0

# 3. ローカルテスト実行
npm run test:unit

# 4. 成功したらコミット
git add package.json package-lock.json
git commit -m "fix: correct vitest version"
git push
```

### Step 3: ワークフローファイルの修正（10分）

```bash
# 1. YAML 構文検証
npx yaml-lint .github/workflows/quality-gate.yml

# 2. バッククォート問題の確認
grep -n '`' .github/workflows/quality-gate.yml

# 3. 修正が必要な場合、heredoc または printf を使用
```

**修正例（バッククォート問題）:**
```yaml
# Before（問題あり）
run: |
  echo "fence=\`\`\`" >> $GITHUB_OUTPUT

# After（修正済み）
run: |
  fence=$(printf '\x60\x60\x60')
  echo "fence=$fence" >> $GITHUB_OUTPUT
```

### Step 4: GitHub Secrets の確認（5分）

1. GitHub → Settings → Secrets and variables → Actions
2. 以下の Secrets が設定されていることを確認:
   - `TEST_USER_EMAIL` - テスト用メールアドレス
   - `TEST_USER_PASSWORD` - テスト用パスワード
3. 未設定の場合は追加

### Step 5: 修正コミット & プッシュ（5分）

```bash
# 全ての修正を確認
npm run type-check
npm run build
npm run test:unit

# コミット
git add -A
git commit -m "fix: resolve CI failures - vitest version and YAML syntax"
git push
```

### Step 6: CI 結果の監視（10分）

1. GitHub Actions で新しいワークフローの進行を確認
2. 各ジョブの成功/失敗をチェック
3. 失敗した場合は Step 1 に戻る

---

## 4. 参考情報

### 4.1 関連ファイル

| ファイル | 説明 |
|---------|------|
| `.github/workflows/quality-gate.yml` | CI ワークフロー定義 |
| `package.json` | 依存関係定義 |
| `vitest.config.ts` | Vitest 設定 |
| `playwright.ci.config.ts` | Playwright CI 設定 |
| `lighthouserc.json` | Lighthouse CI 設定 |

### 4.2 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| Phase 9.94-D 完了レポート | `docs/PHASE9.94-D-COMPLETE.md` |
| CI ロールバック手順 | `docs/CI-ROLLBACK-GUIDE.md` |
| Phase 9.94 メインランブック | `docs/PHASE9.94-POLISH-RUNBOOK.md` |

### 4.3 ロールバック手順（緊急時）

```bash
# 1. 直前の動作コミットに戻す
git log --oneline -10
git revert HEAD

# 2. または CI を一時無効化
# .github/workflows/quality-gate.yml の先頭に追加:
# on:
#   workflow_dispatch:  # 手動実行のみ
```

---

## 5. Phase 9.94 完了に向けた残タスク

### 5.1 CI 修正後の確認事項

| # | 確認項目 | 担当 | ステータス |
|---|---------|------|-----------|
| 1 | `build-and-lint` ジョブ成功 | - | 待機中 |
| 2 | `bundle-size` ジョブ成功 | - | 待機中 |
| 3 | `visual-regression` ジョブ成功 | - | 待機中 |
| 4 | `lighthouse` ジョブ成功 | - | 待機中 |
| 5 | `unit-tests` ジョブ成功 | - | 待機中 |
| 6 | `e2e-tests` ジョブ成功 | - | 待機中 |

### 5.2 Phase 10 開始条件

Phase 9.94 が完了し、以下を満たしたら Phase 10 を開始:

- [ ] 全 CI ジョブが PASS
- [ ] Lighthouse Performance 85+ (目標 90+)
- [ ] `npm run build` 警告 0
- [ ] 技術負債: FIXME/HACK 0件

---

**作成者:** Claude Code
**次回更新:** CI 修正完了後
