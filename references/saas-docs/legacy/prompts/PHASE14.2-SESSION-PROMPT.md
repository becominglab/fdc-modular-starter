# Phase 14.2 スケーラビリティ改善 - セッション開始プロンプト

以下をコピーして新しいClaudeセッションに貼り付けてください。

---

## プロンプト

```
# Phase 14.2 スケーラビリティ改善の実装

## コンテキスト
Founders Direct Cockpit (FDC) のスケーラビリティ改善を行います。
現在の同時利用可能人数は約20人で、100人まで対応できるよう改善します。

## ランブック
`docs/runbooks/PHASE14.2-SCALABILITY-RUNBOOK.md` を参照してください。

## 技術スタック
- Next.js 15 + React 19
- Supabase (PostgreSQL/Neon) - RLS不使用
- Vercel KV (Upstash Redis) - レート制限実装済み
- Google OAuth + Cookie Session

## 現状の主要ファイル
- `lib/server/auth.ts` - 認証・セッション管理
- `lib/server/db.ts` - Supabase接続（globalThisシングルトン）
- `lib/server/rate-limit.ts` - レート制限（Vercel KV実装済み）
- `app/api/google/sync/route.ts` - Google同期（現在同期処理）

## 実装対象

### Phase 1（1-2週間）- クイックウィン
1. **セッションキャッシュの導入**
   - `lib/server/session-cache.ts` 新規作成
   - Vercel KVでセッション情報をキャッシュ
   - `lib/server/auth.ts` を更新してキャッシュを使用

2. **Supabase接続設定の最適化**
   - `lib/server/db.ts` にタイムアウト設定追加

3. **エンドポイント別レート制限**
   - `lib/server/rate-limit-config.ts` 新規作成

### Phase 2（3-4週間）- 中期最適化
1. **Google API同期の非同期化**
   - `lib/server/sync-queue.ts` 新規作成
   - `app/api/google/sync/route.ts` を非同期ジョブキュー方式に変更
   - Vercel Cron または クライアントポーリングで処理

2. **workspace_dataキャッシュ**
   - `lib/server/workspace-cache.ts` 新規作成
   - `app/api/workspaces/[workspaceId]/data/route.ts` を更新

## 実装方針
- 既存のVercel KV実装（rate-limit.ts）のパターンを踏襲
- フェイルオープン設計（キャッシュ失敗時はDBフォールバック）
- 環境変数でキャッシュ無効化可能にする

## 開始タスク
Phase 1.1 のセッションキャッシュ実装から開始してください。
まず `lib/server/session-cache.ts` を作成し、既存の `lib/server/rate-limit.ts` のVercel KV実装パターンを参考にしてください。
```

---

## 使い方

1. 新しいClaudeセッションを開始
2. 上記プロンプトをコピー＆ペースト
3. Claudeが実装を開始

## 注意事項

- Phase 3は次期対応として保留（ランブック参照）
- 実装後は必ずテスト実行 (`npm run test:unit`, `npm run test:e2e`)
- 変更はこまめにコミット
