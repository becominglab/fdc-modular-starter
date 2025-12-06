# Phase 9.9-A 引き継ぎドキュメント

## 現在の状況（2025-11-24）

### ✅ 完了したこと

1. **Grand Guide 更新**
   - `docs/FDC-GRAND-GUIDE.md` に Phase 9.9 セクション追加完了

2. **Phase 9.9 ランブック作成**
   - `docs/PHASE9.9-BUGFIX-LEADS-RUNBOOK.md` 作成完了

3. **Sidebar コンポーネント実装**
   - `app/_components/Sidebar.tsx` 作成完了
   - Settings/Admin/SA タブの表示ロジック実装済み

4. **認証済みレイアウト実装**
   - `app/(app)/layout.tsx` 作成完了
   - Sidebar とログアウトボタンを統合

5. **各ページ実装**
   - `app/(app)/dashboard/page.tsx` - ダッシュボード
   - `app/(app)/settings/page.tsx` - 設定画面
   - `app/(app)/leads/page.tsx` - リード管理（準備中）
   - `app/(app)/clients/page.tsx` - 既存客管理（準備中）
   - `app/(app)/admin/sa/page.tsx` - SAダッシュボード（準備中）

6. **Supabase 設定修正**
   - Redirect URLs を正しく設定完了
   - Google OAuth コールバックが動作するように修正

7. **ビルド・型チェック**
   - `npm run type-check` - PASS
   - `npm run build` - PASS

8. **Google OAuth ログイン成功**
   - ログインフローが動作確認済み

### ❌ 未完了・問題点

1. **設定タブが表示されない**
   - ログイン後、Sidebar の「設定」タブが表示されない
   - 原因: 不明（要調査）
   - 推測: 旧構造（`index.html`）が表示されている可能性

2. **旧構造が残存**
   - `/Users/5dmgmt/プラグイン/foundersdirect/index.html` が残っている
   - `js/` ディレクトリの旧コードが残っている
   - `/` にアクセスすると旧構造が表示される

3. **Admin Seed 未実行**
   - `scripts/seed-admin.ts` は準備完了
   - admin@example.com に `fdc_admin` 権限を付与する必要あり
   - 実行コマンド: `npx tsx scripts/seed-admin.ts`

## 次にやるべきこと（Phase 9.9-A 完了）

### 優先度: 高（即座に実施）

1. **アクセスURLの確認**
   - ユーザーがどのURLにアクセスしているか確認
   - `/` → 旧構造が表示される
   - `/dashboard` → 新しいSidebarが表示される

2. **旧構造のクリーンアップ（Phase 9.91）**
   - `index.html` を削除または archive へ移動
   - `js/` ディレクトリを archive へ移動
   - `/` にアクセスした時に `/dashboard` へリダイレクト

3. **Admin Seed スクリプト実行**
   ```bash
   cd "/Users/5dmgmt/プラグイン/foundersdirect"
   npx tsx scripts/seed-admin.ts
   ```

4. **動作確認**
   - `/dashboard` にアクセスして Sidebar 表示確認
   - 設定タブをクリックして `/settings` に遷移確認
   - ログアウトボタンの動作確認
   - 管理者・SAタブの表示確認（mochizuki のみ）

### 優先度: 中（Phase 9.9-A 完了後）

5. **Phase 9.9-B: リードステータス刷新**
   - 4ステータス制（未接触/反応あり/商談中/成約）への移行
   - 失注タブの実装

6. **Phase 9.9-C: 成約 → 既存客 移行フロー**
   - WON 時の自動コピー処理
   - 契約日管理

7. **Phase 9.9-D: SAガバナンス**
   - SAダッシュボード実装
   - 3-2-1 権限階層ルール実装

## 技術的な詳細

### 変更ファイル一覧

**新規作成**:
- `app/_components/Sidebar.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/settings/page.tsx`
- `app/(app)/leads/page.tsx`
- `app/(app)/clients/page.tsx`
- `app/(app)/admin/sa/page.tsx`
- `docs/PHASE9.9-BUGFIX-LEADS-RUNBOOK.md`
- `docs/PHASE9.9-A-HANDOFF.md`（本ファイル）

**更新**:
- `docs/FDC-GRAND-GUIDE.md`
- `app/(app)/dashboard/page.tsx`
- `lib/server/supabase.ts` - 遅延初期化パターン
- `app/api/auth/google/route.ts` - PKCE フロー対応
- `app/api/auth/callback/route.ts` - デバッグログ追加

### 環境変数

必要な環境変数（`.env.local`）:
- `NEXT_PUBLIC_SUPABASE_URL` または `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `MASTER_ENCRYPTION_KEY`
- `JWT_SECRET`

### Supabase 設定

**URL Configuration**:
- Site URL: `https://app.foundersdirect.jp`
- Redirect URLs:
  - `https://xxx-project-ref.supabase.co/auth/v1/callback`
  - `https://app.foundersdirect.jp`
  - `http://localhost:3000`

**Providers**:
- Google OAuth 有効化済み
- Client ID: `xxx-xxx...`

### サーバー起動コマンド

```bash
cd "/Users/5dmgmt/プラグイン/foundersdirect"
npm run dev
```

アクセスURL:
- 開発: `http://localhost:3000/dashboard`
- 本番: `https://app.foundersdirect.jp/dashboard`

## トラブルシューティング

### 問題: 設定タブが表示されない

**原因候補**:
1. 旧構造（`index.html`）にアクセスしている
2. `/` にアクセスしている（新構造は `/dashboard`）
3. Sidebar コンポーネントが読み込まれていない

**解決方法**:
1. `/dashboard` に直接アクセス
2. 旧構造をクリーンアップ（Phase 9.91）
3. ブラウザのキャッシュをクリア

### 問題: ログインループ

**原因**: Cookie が正しく設定されていない

**解決方法**:
1. ブラウザの Cookie を確認（`fdc_session`）
2. `.env.local` の環境変数確認
3. Supabase Redirect URLs 確認

### 問題: Admin タブが表示されない

**原因**: `global_role` が `fdc_admin` ではない

**解決方法**:
```bash
npx tsx scripts/seed-admin.ts
```

## Phase 9.9-A 完了の定義（DOD）

- [ ] `/dashboard` にアクセスして Sidebar が表示される
- [ ] 設定タブが全ユーザーに表示される
- [ ] ログアウトボタンが動作する
- [ ] admin@example.com に `fdc_admin` 権限が付与される
- [ ] 管理者・SAタブが mochizuki のみに表示される
- [ ] `npm run type-check` が成功
- [ ] `npm run build` が成功

## 次の開発者へ

Phase 9.9-A は **ほぼ完了**していますが、以下の確認が必要です：

1. **ユーザーが `/dashboard` にアクセスしているか確認**
2. **旧構造（`index.html`）のクリーンアップ実施**
3. **Admin Seed スクリプト実行**

これらが完了すれば、Phase 9.9-B（リード管理刷新）へ進めます。

---

**Last Updated**: 2025-11-24
**Status**: Phase 9.9-A ほぼ完了（設定タブ表示の最終確認待ち）
**Next**: 旧構造クリーンアップ → Phase 9.9-B
