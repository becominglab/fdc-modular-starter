# Phase 8-8: E2E Testing（本番環境統合テスト）計画書

**Version:** 1.0 (Draft)
**作成日:** 2025-11-14
**担当:** Claude Code
**フェーズ:** Phase 8-8（本番環境統合テスト）

---

## 📋 目次

1. [概要](#概要)
2. [テスト目的](#テスト目的)
3. [テスト範囲](#テスト範囲)
4. [テスト環境](#テスト環境)
5. [テストケース](#テストケース)
6. [実施手順](#実施手順)
7. [成功基準](#成功基準)
8. [リスクと対策](#リスクと対策)

---

## 概要

Phase 8-7 では RLS（Row Level Security）および暗号化基盤の適用が完了しました。
Phase 8-8 では、これらの機能が本番環境で正常に動作することを確認するため、包括的なE2Eテストを実施します。

**Phase 8-7 で未検証だった項目:**
- ❌ Vercel本番環境の環境変数設定
- ❌ 実際のユーザーデータでの動作確認
- ❌ 暗号化/復号の動作確認
- ❌ RLSアクセス制限の動作確認
- ❌ API レベルの統合テスト
- ❌ パフォーマンステスト
- ❌ セキュリティテスト

これらの項目を Phase 8-8 で網羅的にテストします。

---

## テスト目的

### 主要目的

1. **認証・認可の動作確認**
   - Google OAuth 認証フロー
   - JWT トークン発行・検証
   - RBAC（ロールベースアクセス制御）
   - RLS（行レベルセキュリティ）

2. **ワークスペース機能の動作確認**
   - ワークスペース作成・切替
   - メンバー管理（追加・削除・ロール変更）
   - 監査ログ記録

3. **暗号化機能の動作確認**
   - AES-256-GCM による暗号化・復号
   - ワークスペース鍵の生成・管理
   - データの暗号化保存

4. **レポート機能の動作確認**
   - ロール別レポート生成（EXEC / MANAGER / MEMBER）
   - Cross-Workspace レポート（EXEC専用）
   - CSVエクスポート

5. **パフォーマンス確認**
   - API レスポンス時間
   - 暗号化・復号処理時間
   - 大量データの処理性能

6. **セキュリティ確認**
   - XSS / CSRF 対策
   - SQL インジェクション対策
   - レート制限
   - RLS によるデータ分離

---

## テスト範囲

### テスト対象（✅ = 実装済み、❌ = 未実装）

#### 1. 認証フロー
- ✅ 基本ログイン（テストモード）- `auth.spec.ts`
- ❌ Google OAuth フロー（本番）
- ❌ JWT トークン発行・検証
- ❌ セッション維持・リフレッシュ

#### 2. ワークスペース管理
- ⚠️ ワークスペース作成（スキップ中）- `workspace.spec.ts`
- ⚠️ ワークスペース切替（スキップ中）
- ⚠️ メンバー管理（スキップ中）
- ⚠️ 監査ログ（スキップ中）

#### 3. データ暗号化
- ❌ ワークスペース鍵生成
- ❌ データ暗号化保存
- ❌ データ復号取得
- ❌ 鍵ローテーション

#### 4. RLS ポリシー
- ❌ ユーザー自身のデータのみ閲覧可能
- ❌ 他ユーザーのデータへのアクセス拒否
- ❌ 管理者権限による全データアクセス
- ❌ ワークスペース単位のデータ分離

#### 5. レポート機能
- ⚠️ ロール別レポート（スキップ中）- `reports.spec.ts`
- ❌ Cross-Workspace レポート
- ❌ CSVエクスポート

#### 6. パフォーマンス
- ❌ API レスポンス時間測定
- ❌ 暗号化・復号処理時間測定
- ❌ 大量データ処理

#### 7. セキュリティ
- ❌ XSS 対策確認
- ❌ CSRF 対策確認
- ❌ SQL インジェクション対策確認
- ❌ レート制限確認

---

## テスト環境

### テスト環境の種類

| 環境 | 用途 | URL | DB |
|------|------|-----|-----|
| ローカル開発環境 | 開発・デバッグ | http://localhost:8888 | TEST_DATABASE_URL |
| Vercel Preview | PR レビュー・統合テスト | https://xxx.vercel.app | DATABASE_URL (本番) |
| Vercel Production | 本番環境 | https://app.foundersdirect.jp | DATABASE_URL (本番) |

### 環境変数

**必須環境変数:**
```bash
# データベース
DATABASE_URL="postgresql://..."           # 本番DB
TEST_DATABASE_URL="postgresql://..."      # テスト用DB

# 暗号化
MASTER_ENCRYPTION_KEY="..."               # AES-256用32バイト鍵（Base64）

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Vercel
VERCEL_OIDC_TOKEN="..."
```

### テスト用データ

**テストユーザー:**
- EXEC: `exec@test.founderdirect.jp`
- MANAGER: `manager@test.founderdirect.jp`
- MEMBER: `member@test.founderdirect.jp`

**テストワークスペース:**
- Workspace ID: `ws-test-1`
- 名前: "Test Workspace"

---

## テストケース

### 1. 認証フロー（Phase 8-8-1）

#### 1.1 Google OAuth フロー（本番）

**テストファイル:** `tests/e2e/phase-8-8/auth-production.spec.ts`

**テストケース:**
1. Google OAuth ログインボタンをクリック
2. Google 認証画面が表示される
3. 認証後、アプリケーションにリダイレクト
4. JWT トークンが localStorage に保存される
5. メインアプリケーションが表示される

#### 1.2 JWT トークン検証

**テストケース:**
1. 有効な JWT トークンでAPI呼び出し → 成功
2. 無効な JWT トークンでAPI呼び出し → 401エラー
3. 期限切れトークンでAPI呼び出し → 401エラー
4. トークンなしでAPI呼び出し → 401エラー

### 2. ワークスペース管理（Phase 8-8-2）

#### 2.1 ワークスペース作成

**テストファイル:** `tests/e2e/phase-8-8/workspace-creation.spec.ts`

**テストケース:**
1. 新規ワークスペース作成
2. ワークスペース鍵が自動生成される
3. ワークスペースがDBに保存される
4. 作成者がオーナーとして登録される
5. 監査ログに記録される

#### 2.2 ワークスペース切替

**テストケース:**
1. 複数ワークスペースに所属するユーザーでログイン
2. ワークスペース切替
3. データが切り替わる
4. 現在のワークスペースIDが localStorage に保存される

#### 2.3 メンバー管理

**テストケース:**
1. メンバー追加（owner/admin権限）
2. メンバー一覧取得
3. ロール変更（owner/admin権限）
4. メンバー削除（owner/admin権限）
5. 権限のないユーザーによる操作 → 403エラー

### 3. データ暗号化（Phase 8-8-3）

#### 3.1 暗号化保存

**テストファイル:** `tests/e2e/phase-8-8/encryption.spec.ts`

**テストケース:**
1. ワークスペースデータを保存
2. DBに暗号化されたデータが保存される
3. 平文データがDBに存在しないことを確認
4. `workspace_keys` テーブルに鍵が保存される

#### 3.2 復号取得

**テストケース:**
1. 暗号化されたデータを取得
2. 正しく復号される
3. 元のデータと一致する

#### 3.3 鍵ローテーション

**テストケース:**
1. ワークスペース鍵をローテーション
2. 既存データが新しい鍵で再暗号化される
3. データが正しく復号できる

### 4. RLS ポリシー（Phase 8-8-4）

#### 4.1 ユーザー自身のデータのみ閲覧可能

**テストファイル:** `tests/e2e/phase-8-8/rls-policies.spec.ts`

**テストケース:**
1. ユーザーAでログイン
2. ユーザーA所属のワークスペースデータを取得 → 成功
3. ユーザーB所属のワークスペースデータを取得 → 空配列
4. 他ユーザーのメンバー情報を取得 → 空配列

#### 4.2 管理者権限

**テストケース:**
1. FDC管理者（global_role = 'fdc_admin'）でログイン
2. すべてのワークスペースデータにアクセス可能
3. すべてのユーザー情報にアクセス可能

#### 4.3 ワークスペース単位のデータ分離

**テストケース:**
1. Workspace A のメンバーでログイン
2. Workspace A のデータを取得 → 成功
3. Workspace B のデータを取得 → 空配列 / 403エラー

### 5. レポート機能（Phase 8-8-5）

#### 5.1 ロール別レポート

**テストファイル:** `tests/e2e/phase-8-8/reports.spec.ts`

**テストケース:**
1. EXEC でログイン → 全体KPI表示
2. MANAGER でログイン → チームKPI表示
3. MEMBER でログイン → 個人パフォーマンス表示
4. ロールに応じた表示切替を確認

#### 5.2 Cross-Workspace レポート

**テストケース:**
1. EXEC でログイン → Cross-Workspace レポート表示
2. MANAGER でログイン → Cross-Workspace レポートアクセス不可
3. MEMBER でログイン → Cross-Workspace レポートアクセス不可

#### 5.3 CSVエクスポート

**テストケース:**
1. レポートをCSVエクスポート
2. UTF-8 BOM付きで保存される
3. Excel で正しく開ける

### 6. パフォーマンス（Phase 8-8-6）

#### 6.1 API レスポンス時間

**テストファイル:** `tests/e2e/phase-8-8/performance.spec.ts`

**テストケース:**
1. `/api/workspaces` → 500ms以内
2. `/api/workspaces/[id]/data` → 1000ms以内
3. `/api/reports/summary` → 2000ms以内
4. `/api/audit-logs` → 500ms以内

#### 6.2 暗号化・復号処理時間

**テストケース:**
1. 1KB データの暗号化 → 50ms以内
2. 10KB データの暗号化 → 100ms以内
3. 100KB データの暗号化 → 500ms以内
4. 復号処理も同様

#### 6.3 大量データ処理

**テストケース:**
1. 100件のリードデータを取得 → 2秒以内
2. 1000件の監査ログを取得 → 3秒以内

### 7. セキュリティ（Phase 8-8-7）

#### 7.1 XSS 対策

**テストファイル:** `tests/e2e/phase-8-8/security.spec.ts`

**テストケース:**
1. XSS攻撃文字列を入力 → エスケープされる
2. `<script>` タグが実行されない

#### 7.2 CSRF 対策

**テストケース:**
1. CSRF トークンなしでPOST → 403エラー
2. 無効なCSRF トークンでPOST → 403エラー

#### 7.3 SQL インジェクション対策

**テストケース:**
1. SQLインジェクション攻撃文字列を入力 → エスケープされる
2. データベースエラーが発生しない

#### 7.4 レート制限

**テストケース:**
1. 連続60回API呼び出し → 429エラー
2. 1分待機後、再度API呼び出し → 成功

---

## 実施手順

### STEP 1: 環境準備

```bash
# 1. プロジェクトディレクトリに移動
cd /Users/5dmgmt/プラグイン/foundersdirect

# 2. 環境変数を取得
vercel env pull .env.local

# 3. 環境変数を確認
cat .env.local | grep -E "^(DATABASE_URL|TEST_DATABASE_URL|MASTER_ENCRYPTION_KEY|GOOGLE_CLIENT_ID)"

# 4. Vercel本番環境の環境変数を設定（未設定の場合）
vercel env add MASTER_ENCRYPTION_KEY
vercel env add DATABASE_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

### STEP 2: テストファイル作成

```bash
# Phase 8-8 専用テストディレクトリを作成
mkdir -p tests/e2e/phase-8-8

# テストファイルを作成（7カテゴリ）
touch tests/e2e/phase-8-8/auth-production.spec.ts
touch tests/e2e/phase-8-8/workspace-creation.spec.ts
touch tests/e2e/phase-8-8/encryption.spec.ts
touch tests/e2e/phase-8-8/rls-policies.spec.ts
touch tests/e2e/phase-8-8/reports.spec.ts
touch tests/e2e/phase-8-8/performance.spec.ts
touch tests/e2e/phase-8-8/security.spec.ts
```

### STEP 3: ローカル環境でテスト実行

```bash
# 1. ビルド
npm run build

# 2. 型チェック
npm run type-check

# 3. E2Eテスト実行（ローカル）
npm test

# 4. 特定のテストのみ実行
npx playwright test tests/e2e/phase-8-8/
```

### STEP 4: Vercel Preview環境でテスト実行

```bash
# 1. ブランチをプッシュ
git checkout -b phase-8-8-testing
git add .
git commit -m "Phase 8-8: E2E Testing implementation"
git push origin phase-8-8-testing

# 2. Vercel Preview URLを確認
vercel inspect <deployment-url>

# 3. Preview環境に対してテスト実行
TEST_BASE_URL=<preview-url> npm test
```

### STEP 5: Vercel Production環境でテスト実行

```bash
# 1. 本番環境へデプロイ
vercel --prod

# 2. 本番環境に対してテスト実行（慎重に）
TEST_BASE_URL=https://app.foundersdirect.jp npm test tests/e2e/phase-8-8/
```

---

## 成功基準

### DOD（Definition of Done）

- [ ] **すべてのテストが成功**（100% Pass Rate）
- [ ] **RLS が正しく機能**（他ユーザーデータへのアクセス拒否）
- [ ] **暗号化・復号が正常動作**（データ一致確認）
- [ ] **パフォーマンス基準を満たす**（API: 500ms以内、暗号化: 50ms以内）
- [ ] **セキュリティ対策が機能**（XSS/CSRF/SQL Injection）
- [ ] **本番環境で正常動作**（Vercel Production）
- [ ] **Phase 8-8 実装レポート作成**（`DOCS/PAST/Phase-8-8-Implementation-Report.md`）

### テストカバレッジ目標

| カテゴリ | 目標カバレッジ |
|---------|--------------|
| 認証フロー | 90% |
| ワークスペース管理 | 90% |
| データ暗号化 | 100% |
| RLS ポリシー | 100% |
| レポート機能 | 80% |
| パフォーマンス | 80% |
| セキュリティ | 90% |

---

## リスクと対策

### リスク1: Vercel環境変数が未設定

**影響:** 本番環境でテストが実行できない

**対策:**
- Phase 8-8 開始前に環境変数を設定
- `vercel env add` コマンドで設定
- 設定後、アプリケーションを再デプロイ

### リスク2: 本番DBにデータが存在しない

**影響:** 実際のデータでのテストができない

**対策:**
- テスト用ユーザーを作成
- テスト用ワークスペースを作成
- テストデータを投入

### リスク3: Google OAuth テストが困難

**影響:** 本番OAuth認証のテストができない

**対策:**
- テストモードで基本機能を確認
- 手動で本番OAuth認証を確認
- Playwright の認証ヘルパーを使用

### リスク4: パフォーマンス低下

**影響:** レスポンス時間が基準を超える

**対策:**
- インデックスの最適化
- クエリの最適化
- キャッシュ戦略の見直し

### リスク5: RLS ポリシーの不具合

**影響:** データ漏洩のリスク

**対策:**
- Phase 8-7 で RLS 検証済み
- 複数ユーザーでのテストを実施
- 監査ログで操作を記録

---

## まとめ

Phase 8-8 では、Phase 8-7 で未検証だった以下の項目を網羅的にテストします:

1. ✅ **認証・認可の動作確認**（Google OAuth、JWT、RBAC、RLS）
2. ✅ **ワークスペース機能の動作確認**（作成・切替・メンバー管理・監査ログ）
3. ✅ **暗号化機能の動作確認**（AES-256-GCM、鍵管理、データ暗号化）
4. ✅ **レポート機能の動作確認**（ロール別レポート、Cross-Workspace、CSVエクスポート）
5. ✅ **パフォーマンス確認**（API、暗号化、大量データ）
6. ✅ **セキュリティ確認**（XSS、CSRF、SQL Injection、レート制限、RLS）

これにより、Phase 8 全体の完了が確定し、Phase 9 への移行準備が整います。

---

**作成者:** Claude Code
**作成日:** 2025-11-14
**次回更新予定:** テスト実施後
