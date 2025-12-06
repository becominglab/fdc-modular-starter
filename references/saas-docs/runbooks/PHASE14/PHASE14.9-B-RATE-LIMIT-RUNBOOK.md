# Phase 14.9-B: レート制限＆サイズ制限 Runbook

## 概要

Phase 14.9-B では、監査報告書で特定された「NOW（1-2週間）」優先度の項目を実装しました。

## 実装内容

### T1. Google Sync API レート制限（CRITICAL）

**ファイル**: `app/api/google/sync/route.ts`

**設定**:
- 制限単位: ユーザーID
- 上限: 10 req/min
- ウィンドウ: 60秒

**理由**:
Google API はユーザー単位でクォータが設定されており、連続リクエストによるクォータ枯渇を防ぐため。

### T2. Google Tasks API レート制限（CRITICAL）

**ファイル**: `app/api/google/tasks/route.ts`

**設定**:
- 制限単位: ユーザーID
- 上限: 20 req/min
- ウィンドウ: 60秒
- 対象: GET, POST, PATCH, DELETE すべてのメソッド

**理由**:
Tasks API は CRUD 操作が多いため、Sync/Calendars より緩めの制限を設定。
共有ヘルパー関数 `checkGoogleTasksRateLimit()` で全メソッド統一的に制限。

### T3. Google Calendars API レート制限（HIGH）

**ファイル**: `app/api/google/calendars/route.ts`

**設定**:
- 制限単位: ユーザーID
- 上限: 10 req/min
- ウィンドウ: 60秒

**理由**:
カレンダー一覧取得は頻繁に呼ばれないため、Sync と同等の制限。

### T4. Cron Worker maxDuration 延長（HIGH）

**ファイル**: `app/api/cron/sync-worker/route.ts`

**変更**:
- 変更前: `maxDuration = 60`（60秒）
- 変更後: `maxDuration = 300`（300秒 / 5分）

**理由**:
- 1ジョブあたり最大5件のタスクを処理
- Google API レイテンシ: Tasks API 200-500ms, Calendar API 300-800ms
- 1タスクあたり最大 2 API呼び出し（Tasks + Calendar）
- 実測値（P95）: 1ジョブ 30-45秒、5ジョブで 150-225秒
- 安全マージン込みで 300秒を設定

**Vercel制限**:
| プラン | maxDuration |
|--------|-------------|
| Hobby | 10秒 |
| Pro | 300秒 |
| Enterprise | 900秒 |

### T5. AI Chat コンテキストサイズ制限（P1）

**ファイル**: `app/api/ai/chat/route.ts`

**設定**:
- コンテキスト上限: 5000文字
- メッセージ上限: 2000文字

**エラーコード**:
- `CONTEXT_TOO_LARGE`: コンテキストが5000文字超過
- `MESSAGE_TOO_LARGE`: メッセージが2000文字超過

**理由**:
- GPT-4o-mini のコンテキストウィンドウ: 128K tokens
- 日本語 1文字 ≈ 1-2 tokens
- 5000文字 × 2 = 10,000 tokens（システムプロンプト + 応答分を残す）
- コスト制御: 大量コンテキストによるトークン消費を防ぐ
- レスポンス品質: 過大なコンテキストは応答精度を低下させる

## レート制限レスポンス形式

すべてのレート制限エラーは以下の形式で返されます:

```json
{
  "error": "レート制限に達しました。1分後に再試行してください。",
  "code": "RATE_LIMIT_EXCEEDED",
  "resetAt": 1701734400000
}
```

**HTTPヘッダー**:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701734400000
```

## 監視・アラート

レート制限超過時はログに以下の警告が出力されます:

```
[Google Sync] Rate limit exceeded { userId: 123, current: 11, limit: 10 }
[Google Tasks] Rate limit exceeded { userId: 123, method: 'GET', current: 21, limit: 20 }
[ai/chat] Context size exceeded { workspaceId: '456', contextSize: 6000, maxSize: 5000 }
```

## ロールバック手順

問題が発生した場合、以下の手順でロールバック:

1. レート制限を無効化する場合:
   - 各ファイルの `checkRateLimit()` 呼び出しをコメントアウト

2. maxDuration を戻す場合:
   ```typescript
   export const maxDuration = 60; // ロールバック
   ```

3. サイズ制限を無効化する場合:
   - `MAX_CONTEXT_SIZE` を非常に大きな値に設定（例: 1000000）

## テスト方法

### レート制限テスト

```bash
# 連続リクエストでレート制限を発火
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/google/sync \
    -H "Cookie: fdc_session=xxx" \
    -H "Content-Type: application/json" \
    -d '{"tasks":[]}'
  echo ""
done
```

### サイズ制限テスト

```bash
# 大きなコンテキストで400エラーを確認
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Cookie: fdc_session=xxx" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","workspaceId":"1","context":"'$(python3 -c "print('a'*6000)"))'"}'
```

## 関連ドキュメント

- [Phase 14.6.7 Security Hotfix](./PHASE14.6.7-SECURITY-HOTFIX-RUNBOOK.md)
- [Rate Limit Implementation](../architecture/rate-limit.md)
