# Phase 1？– 将来設計タスク

> **目的**: 1,000人規模へのスケールを見据えた長期的なアーキテクチャ設計。
> **ステータス**: Planned（設計・検討段階）

## 前提条件
- Phase 14.2 + 14.3-A 完了後に着手
- ユーザー数が 100人 → 500人 以上に成長した段階で優先度上昇

---

## Section 1: データベーススケーリング

### 1.1 audit_logs パーティショニング
**優先度**: P3（長期運用で影響）
**着手条件**: audit_logs が 1GB 超過時

**設計**:
```sql
-- 月次パーティション
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 古いログのアーカイブ
-- S3 + Athena でクエリ可能に
```

**タスク**:
- [ ] パーティション設計書作成
- [ ] マイグレーションスクリプト作成
- [ ] S3アーカイブパイプライン構築
- [ ] Athenaクエリ設定

### 1.2 読み取りレプリカ導入
**優先度**: P3
**着手条件**: Supabase Pro プランへのアップグレード後

**設計**:
```typescript
// lib/server/db.ts
const readReplica = createClient(REPLICA_URL, REPLICA_KEY);
const primary = createClient(PRIMARY_URL, PRIMARY_KEY);

export function getReadClient() {
  return readReplica;
}

export function getWriteClient() {
  return primary;
}
```

**タスク**:
- [ ] Supabase read-replica 機能調査
- [ ] 読み書き分離パターン設計
- [ ] クエリルーティング実装

### 1.3 水平シャーディング検討
**優先度**: P4（1,000人超で検討）
**着手条件**: 単一DBの接続数上限に到達時

**設計方針**:
- テナント（ワークスペース）単位でDBを分割
- ルーティングレイヤーで適切なDBに振り分け

---

## Section 2: Google Calendar Incremental Sync

### 2.1 差分同期実装
**優先度**: P2（コスト削減効果大）
**着手条件**: Google API呼び出し数が月間10,000超過時

**設計**:
```typescript
// lib/google/incremental-sync.ts

interface SyncState {
  syncToken: string | null;
  lastFullSyncAt: string;
}

export async function incrementalSync(
  accessToken: string,
  state: SyncState
): Promise<{ events: CalendarEvent[]; newSyncToken: string }> {
  if (!state.syncToken) {
    // 初回はフル同期
    return fullSync(accessToken);
  }

  try {
    const response = await calendar.events.list({
      syncToken: state.syncToken,
      // ...
    });
    return {
      events: response.data.items,
      newSyncToken: response.data.nextSyncToken,
    };
  } catch (error) {
    if (error.code === 410) {
      // syncToken 無効化 → フル同期にフォールバック
      return fullSync(accessToken);
    }
    throw error;
  }
}
```

**期待効果**:
- API呼び出し: 70-90%削減
- 同期時間: 大幅短縮

**タスク**:
- [ ] Google Calendar API syncToken 仕様調査
- [ ] SyncState 永続化設計（users テーブル or 別テーブル）
- [ ] 差分同期ロジック実装
- [ ] フォールバック処理実装

---

## Section 3: AI Chat 最適化

### 3.1 プロンプト・応答キャッシュ
**優先度**: P3（コスト削減）
**着手条件**: AI Chat 利用が月間1,000回超過時

**設計**:
```typescript
// lib/server/ai-cache.ts

const AI_RESPONSE_TTL = 3600; // 1時間

export async function getCachedAIResponse(
  promptHash: string
): Promise<string | null> {
  const cacheKey = `ai_response:${promptHash}`;
  return await kv.get(cacheKey);
}

export async function cacheAIResponse(
  promptHash: string,
  response: string
): Promise<void> {
  const cacheKey = `ai_response:${promptHash}`;
  await kv.set(cacheKey, response, { ex: AI_RESPONSE_TTL });
}
```

**タスク**:
- [ ] プロンプトハッシュ設計（ユーザーコンテキスト含む）
- [ ] キャッシュ戦略設計（FAQ vs ユーザー固有）
- [ ] ヒット率モニタリング

### 3.2 軽量モデル切替
**優先度**: P4
**着手条件**: AI コストが月間予算の50%超過時

**検討項目**:
- Claude Haiku vs Sonnet のコスト比較
- プロンプト最適化によるトークン削減
- ストリーミングレスポンスの導入

---

## Section 4: CDN と画像最適化

### 4.1 静的アセットキャッシュ
**優先度**: P3
**着手条件**: 帯域コストが増加時

**設計**:
```javascript
// next.config.mjs
export default {
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=86400, immutable',
        },
      ],
    },
  ],
};
```

### 4.2 画像最適化 (WebP/AVIF)
**優先度**: P3

**タスク**:
- [ ] `next/image` 導入状況確認
- [ ] 画像アップロード時の自動変換
- [ ] Cloudflare Images 検討

---

## Section 5: オートスケーリング

### 5.1 Vercel Functions 設定最適化
**優先度**: P3
**着手条件**: 同時接続数が100超過時

**設計**:
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### 5.2 将来的な Kubernetes 移行
**優先度**: P5（1,000人超で検討）

**検討項目**:
- Ingress + HPA による自動スケール
- Pod 配置戦略
- コスト試算

---

## Section 6: 高度なモニタリング

### 6.1 分散トレーシング
**優先度**: P3
**着手条件**: 複雑な障害調査が頻発時

**選択肢**:
- OpenTelemetry + Jaeger
- Datadog APM
- Vercel Observability

### 6.2 カスタムダッシュボード
**優先度**: P4

**メトリクス**:
- 同時接続数
- キャッシュヒット率
- DB接続プール使用率
- API レイテンシ P95/P99

---

## Section 7: Background Sync 並列化（元 Phase 15-C）

### 7.1 同期ワーカーの並列実行
**優先度**: P2（スケール対応）
**着手条件**: 以下のいずれかを満たした場合

| メトリクス | 閾値 | 確認方法 |
|-----------|------|----------|
| Google連携ONのテナント数 | **≥ 30** | `SELECT COUNT(DISTINCT tenant_id) FROM users WHERE google_api_enabled = true` |
| Cron Worker平均処理時間 | **≥ 45秒** | Vercel Functions Logs |
| Cron Workerタイムアウト回数 | **≥ 3回/月** | Vercel Deployment Logs |
| 同期対象イベント件数/日 | **≥ 500件** | audit_logs 集計 |

**現状アーキテクチャ**:
```
Cron (2分毎) → ジョブ取得（最大5件）→ for loop で順次処理
```

**目標アーキテクチャ**:
```typescript
// app/api/cron/sync-worker/route.ts

// ジョブ一覧取得
const jobs = await fetchPendingSyncJobs();

// 並列実行（最大N件同時）
const results = await Promise.allSettled(
  jobs.slice(0, PARALLEL_LIMIT).map(runSyncJob)
);

// 個別の成功/失敗をログに記録（他テナントに影響しない）
```

**設計ポイント**:
1. **単位ジョブ定義**: 1テナント×1ワークスペースを最小単位
2. **並列実行**: `Promise.allSettled` で5〜10件同時実行
3. **冪等性保証**: 二重実行しても整合性が壊れない設計
4. **エラー分離**: 1テナント失敗しても他テナントは継続

**タスク**:
- [ ] 現行フロー棚卸し（`app/api/cron/sync-worker/route.ts`）
- [ ] ジョブ抽象化（`lib/server/sync-jobs.ts`）
- [ ] 並列実行レイヤ追加
- [ ] 同期状態テーブル設計（処理中フラグ/最終実行時刻）
- [ ] ログ・メトリクス整備

---

## 優先度マトリクス

| 優先度 | タスク | 着手条件 |
|--------|-------|---------|
| P2 | Google Calendar Incremental Sync | API呼び出し 10,000/月 超過 |
| P2 | **Background Sync 並列化** | テナント数 30+、Cron 45秒+、タイムアウト 3回/月+ |
| P3 | audit_logs パーティショニング | データ 1GB 超過 |
| P3 | AI プロンプトキャッシュ | AI 利用 1,000/月 超過 |
| P3 | CDN/画像最適化 | 帯域コスト増加 |
| P3 | 読み取りレプリカ | Supabase Pro 移行後 |
| P3 | Vercel Functions 最適化 | 同時接続 100+ |
| P4 | 軽量AIモデル切替 | AI コスト予算50%超過 |
| P4 | 分散トレーシング | 障害調査頻発 |
| P5 | 水平シャーディング | ユーザー 1,000+ |
| P5 | Kubernetes 移行 | ユーザー 1,000+ |

---

## 参考リンク

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [Supabase Read Replicas](https://supabase.com/docs/guides/platform/read-replicas)
- [Google Calendar API Sync](https://developers.google.com/calendar/api/guides/sync)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [OpenTelemetry](https://opentelemetry.io/)

---

*Last Updated: 2025-12-05*
*Phase: Future Design (Phase 15-C 移管含む)*
