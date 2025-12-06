# Phase 14.3 – 即時実装タスク

> **目的**: Phase 14.2 の残タスクと、すぐに着手可能な改善を完了する。

## 前提条件
- Phase 14.2 実装完了済み（セッション/ワークスペースキャッシュ、非同期同期）
- 同時ユーザー数: 20人 → 100人 対応済み

---

## Task 1: Phase 14.2 残タスク完了

### 1.1 useGoogleTasksSync フック更新
**優先度**: P1（非同期同期UIサポート）

```typescript
// lib/hooks/useGoogleTasksSync.ts を更新

export function useGoogleTasksSync() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [result, setResult] = useState<SyncResult | null>(null);

  const startSync = async (tasks: Task[], syncToCalendar = true) => {
    setSyncStatus('queued');
    const response = await fetch('/api/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, syncToCalendar }),
    });
    const data = await response.json();

    if (data.status === 'queued') {
      setJobId(data.jobId);
    } else {
      // 同期モード（非同期無効時）
      setSyncStatus(data.success ? 'completed' : 'failed');
      setResult(data);
    }
  };

  // ポーリングでステータス確認
  useEffect(() => {
    if (!jobId || syncStatus === 'completed' || syncStatus === 'failed') return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/google/sync?jobId=${jobId}`);
      const job = await response.json();
      setSyncStatus(job.status);

      if (job.status === 'completed' || job.status === 'failed') {
        setResult(job.result);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, syncStatus]);

  return { startSync, syncStatus, result, jobId };
}
```

**チェックリスト**:
- [ ] `lib/hooks/useGoogleTasksSync.ts` 更新
- [ ] 型定義追加 (`SyncResult` 等)
- [ ] 既存の同期呼び出し箇所を更新

### 1.2 同期ステータスUI追加
**優先度**: P1

```tsx
// app/_components/todo/SyncStatusIndicator.tsx (新規)

export function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  const statusConfig = {
    idle: { icon: '⏸️', text: '待機中', color: 'gray' },
    queued: { icon: '⏳', text: 'キュー待ち', color: 'yellow' },
    processing: { icon: '🔄', text: '同期中...', color: 'blue' },
    completed: { icon: '✅', text: '完了', color: 'green' },
    failed: { icon: '❌', text: '失敗', color: 'red' },
  };
  // ...
}
```

**チェックリスト**:
- [ ] `SyncStatusIndicator` コンポーネント作成
- [ ] TodoHeader等に同期ステータス表示を追加
- [ ] 同期失敗時のリトライUI

---

## Task 2: モニタリング基盤

### 2.1 キャッシュヒット率ログ
**優先度**: P2

```typescript
// lib/server/metrics.ts (新規)

export function recordCacheMetric(
  cacheType: 'session' | 'workspace',
  hit: boolean,
  durationMs: number
) {
  console.log(JSON.stringify({
    type: 'cache_metric',
    cacheType,
    hit,
    durationMs,
    timestamp: new Date().toISOString(),
  }));
}

// 使用例（session-cache.ts）
const cached = await store.get(cacheKey);
recordCacheMetric('session', !!cached, Date.now() - start);
```

**チェックリスト**:
- [ ] `lib/server/metrics.ts` 新規作成
- [ ] セッションキャッシュにメトリクス追加
- [ ] ワークスペースキャッシュにメトリクス追加
- [ ] 同期ジョブにメトリクス追加

### 2.2 Vercel Analytics 統合
**優先度**: P3

```typescript
// next.config.mjs
export default {
  // ...
  experimental: {
    instrumentationHook: true,
  },
};

// instrumentation.ts (新規)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // サーバーサイドメトリクス初期化
  }
}
```

---

## Task 3: エラーハンドリング強化

### 3.1 キャッシュフォールバック改善
**優先度**: P2

```typescript
// lib/server/session-cache.ts の改善

export async function getCachedSession(token: string): Promise<CachedSession | null> {
  // 環境変数でキャッシュ無効化
  if (process.env.DISABLE_SESSION_CACHE === 'true') {
    return null;
  }

  try {
    const store = getSessionCacheStore();
    const cached = await store.get(`session:${token}`);
    if (cached) {
      recordCacheMetric('session', true, 0);
      return JSON.parse(cached);
    }
    recordCacheMetric('session', false, 0);
    return null;
  } catch (error) {
    // KVエラー時はサイレントフォールバック（DBから取得）
    console.warn('[SessionCache] Get failed, falling back to DB:', error);
    return null;
  }
}
```

**チェックリスト**:
- [ ] キャッシュエラー時のフォールバック確認
- [ ] エラーログの構造化
- [ ] アラート閾値の設定

---

## 実装チェックリスト

### 即時対応（Phase 14.3-A）
- [x] **1.1** useAsyncGoogleSync フック作成 ✅ 2024-11-30
  - `lib/hooks/useAsyncGoogleSync.ts` 新規作成
  - 非同期ジョブのポーリング対応
- [x] **1.2** 同期ステータスUI追加 ✅ 2024-11-30
  - `app/_components/common/SyncStatusIndicator.tsx` 新規作成
  - コンパクト/フルモード対応
- [x] **2.1** キャッシュヒット率ログ追加 ✅ 2024-11-30
  - `lib/server/metrics.ts` 新規作成
  - セッションキャッシュ/ワークスペースキャッシュにメトリクス統合
- [ ] **3.1** キャッシュフォールバック改善（既存実装で対応済み）

### 短期対応（Phase 14.3-B）
- [x] **2.2** Vercel Analytics 統合 ✅ 2024-11-30
  - `@vercel/analytics`, `@vercel/speed-insights` 導入
  - `app/layout.tsx` に統合
- [x] **2.3** システムメトリクスダッシュボード ✅ 2024-11-30
  - `app/api/admin/system-metrics/route.ts` 新規作成
  - `app/_components/admin/sa-dashboard/SystemMetrics.tsx` 新規作成
  - SAダッシュボードにメトリクス表示追加
- [x] **2.4** 単体テスト追加 ✅ 2024-11-30
  - `lib/server/__tests__/metrics.test.ts` 新規作成
  - `lib/server/__tests__/session-cache.test.ts` 新規作成
- [ ] E2Eテストで動作確認

---

## 期待効果

| 改善項目 | Before | After |
|---------|--------|-------|
| 同期UI体験 | ブロッキング表示なし | ステータス表示あり |
| 障害検知 | ログ手動確認 | メトリクス自動収集 |
| キャッシュ障害対応 | 手動ロールバック | 自動フォールバック |

---

*Last Updated: 2024-11-30*
*Phase: 14.3-A (Immediate)*
