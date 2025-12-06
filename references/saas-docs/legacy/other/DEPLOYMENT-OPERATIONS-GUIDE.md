# 🚀 Founders Direct - デプロイ運用ガイド（再発防止版）

**Version:** 1.0
**Last Updated:** 2025-11-17
**Purpose:** デプロイ時の典型的な問題と再発防止のための運用ルール

---

## 📋 目次

1. [概要](#概要)
2. [今回発生した問題と解決策](#今回発生した問題と解決策)
3. [再発防止の運用ルール](#再発防止の運用ルール)
4. [デプロイフロー（標準手順）](#デプロイフロー標準手順)
5. [緊急時の対応手順](#緊急時の対応手順)
6. [チェックリスト](#チェックリスト)

---

## 概要

本ドキュメントは、Founders Direct Modular / Founders Direct Cockpit のデプロイにおいて発生した問題を記録し、再発防止のための運用ルールを定めたものです。

### 対象環境

- **Vercel**: 本番環境（Production）、プレビュー環境（Preview）
- **Node.js**: 22.x
- **プラン**: Hobby → Pro（推奨）
- **Git**: GitHub リポジトリ

---

## 今回発生した問題と解決策

### 問題 1: Runtime 設定ミス

#### 🔴 症状

```
Error: Node.js version mismatch
Expected: 22.x
Found: 20.x (default)
```

デプロイ時に Node.js のバージョンが意図しないバージョン（20.x など古いバージョン）になり、依存関係の不整合やビルドエラーが発生。

#### 🔍 原因

`package.json` の `engines.node` が正しく設定されていなかった、または Vercel がデフォルトの Node.js バージョン（20.x など古いバージョン）を使用していた。

#### ✅ 解決策

以下の2箇所で Node バージョンを明示：

**1. package.json の engines フィールド:**
```json
{
  "engines": {
    "node": "22.x"
  }
}
```

**2. vercel.json の build.env:**
```json
{
  "build": {
    "env": {
      "NODE_VERSION": "22"
    }
  }
}
```

**注意:** `functions.runtime` の指定は不要です。Vercel は `package.json` の `engines` を優先的に参照します。

#### 📝 再発防止策

- [ ] `package.json` の `engines.node` を `22.x` に設定する
- [ ] `vercel.json` の `build.env.NODE_VERSION` を `22` に設定する
- [ ] デプロイ前に両方の設定を確認する

---

### 問題 2: Git Author 設定不正

#### 🔴 症状

```
error: unable to auto-detect email address (got 'user@hostname.(none)')

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```

Git コミット時に author identity が設定されていないため、コミットが失敗。

#### 🔍 原因

ローカル環境で Git の `user.name` と `user.email` が設定されていなかった。

#### ✅ 解決策

Git の author 設定を行う：

```bash
git config user.name "Takao Mochizuki"
git config user.email "mochizuki@5dmgmt.com"

# グローバル設定（すべてのリポジトリに適用）
git config --global user.name "Takao Mochizuki"
git config --global user.email "mochizuki@5dmgmt.com"
```

#### 📝 再発防止策

- [ ] 開発環境セットアップ時に Git 設定を必ず確認する
- [ ] `.claude/commands/check-git-config.sh` を作成し、定期的にチェック
- [ ] 新規メンバーのオンボーディング時に Git 設定を必須化

---

### 問題 3: Hobby プランの Functions 制限

#### 🔴 症状

```
Error: Function Exceeded Maximum Duration of 10 seconds
```

API エンドポイント（特に `/api/reports/export` や `/api/analyze`）が10秒以内に完了せず、タイムアウトエラー。

#### 🔍 原因

Vercel の **Hobby プラン**では、Serverless Functions の実行時間が **10秒** に制限されている。Pro プランでは60秒まで延長可能。

#### ✅ 解決策（短期）

1. **処理の最適化**:
   - N+1 クエリの解消（Prisma の `include` / `select` を活用）
   - 重い処理を分割（バッチ処理、ページネーション）
   - キャッシュの活用（Redis / Upstash）

2. **vercel.json の設定**:
   ```json
   {
     "functions": {
       "api/**/*.ts": {
         "maxDuration": 10  // Hobby プランの上限
       }
     }
   }
   ```

#### ✅ 解決策（長期）

**Pro プランへのアップグレード**（推奨）:

| 項目 | Hobby | Pro |
|------|-------|-----|
| Functions 実行時間 | 10秒 | 60秒（デフォルト）、最大900秒 |
| 月額料金 | $0 | $20/月 |
| カスタムドメイン | 制限あり | 無制限 |
| 環境変数暗号化 | なし | あり |

#### 📝 再発防止策

- [ ] 重い処理は10秒以内に完了するよう最適化
- [ ] パフォーマンス基準（Performance Specification v1.0）を遵守
- [ ] 処理時間のモニタリング（Vercel Analytics）
- [ ] 長時間処理はバックグラウンドジョブ化（将来的に検討）

---

### 問題 4: @vercel/node モジュールの不在

#### 🔴 症状

```
Error: Cannot find module '@vercel/node'
```

TypeScript の型チェックやビルド時に `@vercel/node` が見つからずエラー。

#### 🔍 原因

`api/reports/*.ts` で使用している `VercelRequest` / `VercelResponse` 型が `@vercel/node` に依存しているが、`devDependencies` にインストールされていなかった。

#### ✅ 解決策

```bash
npm install --save-dev @vercel/node
```

#### 📝 再発防止策

- [ ] `package.json` の `devDependencies` に `@vercel/node` を含める
- [ ] `npm install` 後に `npm run type-check` を実行
- [ ] CI/CD パイプラインに型チェックを組み込む

---

### 問題 5: 環境変数の不整合

#### 🔴 症状

```
Error: MASTER_ENCRYPTION_KEY is not defined
Error: JWT_SECRET is not defined
```

本番環境で環境変数が設定されておらず、アプリケーションが起動しない。

#### 🔍 原因

- `.env.example` と `.env.local` の変数が一致していない
- Vercel Dashboard で環境変数が設定されていない
- 環境変数の追加後、再デプロイを忘れた

#### ✅ 解決策

1. **環境変数の一覧化**:
   - [`VERCEL-ENV-CHECKLIST.md`](./VERCEL-ENV-CHECKLIST.md) を作成
   - 必須環境変数を明確化

2. **Vercel Dashboard での設定**:
   ```bash
   vercel env ls  # 設定済み環境変数の確認
   vercel env pull .env.production  # 本番環境変数の取得
   ```

3. **設定後の再デプロイ**:
   ```bash
   vercel --prod --force  # 強制再デプロイ
   ```

#### 📝 再発防止策

- [ ] `.env.example` を常に最新の状態に保つ
- [ ] デプロイ前に `VERCEL-ENV-CHECKLIST.md` を確認
- [ ] 環境変数変更時は必ず再デプロイ
- [ ] 環境変数の検証スクリプトを作成（`scripts/validate-env.sh`）

---

## 再発防止の運用ルール

### ルール 1: デプロイ前の必須チェック

デプロイ前に以下のチェックリストを**必ず**実行する：

```bash
# 1. 型チェック
npm run type-check

# 2. テスト実行
npm test

# 3. ビルド確認
npm run build

# 4. Git 設定確認
git config user.name
git config user.email

# 5. 環境変数確認
vercel env ls

# 6. vercel.json と package.json の Node バージョン確認
cat vercel.json | grep -E "NODE_VERSION"
cat package.json | grep -E "engines"
```

### ルール 2: 環境変数管理の標準化

- **開発環境**: `.env.local`（Git管理外）
- **本番環境**: Vercel Dashboard で設定
- **テンプレート**: `.env.example`（Git管理対象）

**厳守事項**:
- `.env.local` は絶対にコミットしない
- 環境変数追加時は `.env.example` も更新
- シークレットキーは `openssl rand -base64 32` で生成

### ルール 3: Git 操作の標準化

#### コミット前

```bash
# 1. Git 設定確認
git config user.name
git config user.email

# 2. 変更内容の確認
git status
git diff

# 3. ステージング
git add <files>

# 4. コミット（Claude Code の標準フォーマット）
git commit -m "$(cat <<'EOF'
<コミットメッセージ>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### ルール 4: デプロイフローの標準化

#### 標準デプロイフロー

1. **ローカルでのテスト**
   ```bash
   npm run type-check && npm test && npm run build
   ```

2. **Git コミット・プッシュ**
   ```bash
   git add .
   git commit -m "..."
   git push
   ```

3. **Preview デプロイ確認**
   - Pull Request を作成
   - Vercel が自動的に Preview デプロイを作成
   - Preview URL で動作確認

4. **Production デプロイ**
   ```bash
   vercel --prod
   ```

5. **デプロイ後検証**
   ```bash
   vercel logs --prod | tail -50
   vercel logs --prod | grep -i error
   ```

### ルール 5: トラブル発生時の対応

#### エスカレーションフロー

```
エラー発生
    ↓
ログ確認（vercel logs）
    ↓
既知の問題か？
    ├─ Yes → DEPLOYMENT-OPERATIONS-GUIDE.md の解決策を実施
    └─ No  → ロールバック + 詳細調査
```

#### ロールバック手順

```bash
# 1. 前回のデプロイメントIDを確認
vercel ls

# 2. 前回のデプロイメントに切り戻し
vercel rollback <deployment-id>

# 3. 確認
vercel logs --prod | tail -20
```

---

## デプロイフロー（標準手順）

### Phase 1: 事前準備

```bash
# 1. 最新のコードを取得
git pull origin main

# 2. 依存関係のインストール
npm install

# 3. 環境変数の確認
cp .env.example .env.local
# .env.local に実際の値を設定
```

### Phase 2: ローカルテスト

```bash
# 1. 型チェック
npm run type-check

# 2. E2E テスト
npm test

# 3. ビルド
npm run build
```

### Phase 3: コミット・プッシュ

```bash
# 1. Git 設定確認
git config user.name
git config user.email

# 2. ステージング
git add .

# 3. コミット
git commit -m "..."

# 4. プッシュ
git push origin main
```

### Phase 4: Preview デプロイ（推奨）

```bash
# Pull Request を作成し、Preview デプロイで動作確認
gh pr create --title "..." --body "..."
```

### Phase 5: Production デプロイ

```bash
# 1. デプロイ実行
vercel --prod

# 2. ログ確認
vercel logs --prod | tail -50

# 3. エラーチェック
vercel logs --prod | grep -i error

# 4. 動作確認
open https://app.foundersdirect.com
```

### Phase 6: デプロイ後検証

- [ ] ログインが成功する
- [ ] Dashboard が正常に表示される
- [ ] 主要機能が動作する（Workspace切替、データCRUD）
- [ ] エラーログが記録されていない
- [ ] Vercel Analytics でエラー率を確認

---

## 緊急時の対応手順

### ケース 1: 本番環境がダウン

```bash
# 1. 即座にロールバック
vercel rollback <previous-deployment-id>

# 2. エラーログ確認
vercel logs --prod | grep -i error

# 3. 管理者に報告
# security@5dmgmt.com
```

### ケース 2: データベース接続エラー

```bash
# 1. 環境変数確認
vercel env pull .env.production
grep DATABASE_URL .env.production

# 2. Vercel Postgres ステータス確認
# https://vercel.com/dashboard > Storage > Postgres

# 3. 接続テスト
psql $DATABASE_URL -c "SELECT 1"
```

### ケース 3: 環境変数エラー

```bash
# 1. Vercel Dashboard で環境変数を確認・修正

# 2. 強制再デプロイ
vercel --prod --force

# 3. ログ確認
vercel logs --prod | tail -50
```

---

## チェックリスト

### デプロイ前チェックリスト

- [ ] `npm run type-check` が成功する
- [ ] `npm test` が成功する
- [ ] `npm run build` が成功する
- [ ] `git config user.name` / `user.email` が設定されている
- [ ] `package.json` の `engines.node` が `20.x` に設定されている
- [ ] 環境変数が `VERCEL-ENV-CHECKLIST.md` に従って設定されている
- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] コミットメッセージが明確である

### デプロイ後チェックリスト

- [ ] デプロイが成功した（緑色のチェックマーク）
- [ ] `vercel logs --prod` にエラーがない
- [ ] 本番環境でログインが成功する
- [ ] Dashboard が正常に表示される
- [ ] 主要機能が動作する
- [ ] Vercel Analytics でエラー率が 0% である

---

## 参考ドキュメント

- [`VERCEL-ENV-CHECKLIST.md`](./VERCEL-ENV-CHECKLIST.md) - 環境変数チェックリスト
- [`SECURITY.md`](./SECURITY.md) - セキュリティポリシー
- [`PHASE9-ENCRYPTION-AND-API-RUNBOOK.md`](./PHASE9-ENCRYPTION-AND-API-RUNBOOK.md) - Phase 9 RUNBOOK
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub CLI Documentation](https://cli.github.com/)

---

**このドキュメントは、デプロイ問題が発生するたびに更新してください。**

**最終更新日:** 2025-11-17
**次回レビュー予定:** 2026-02-17
