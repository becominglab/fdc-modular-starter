# Phase 14.3 – スケーラビリティ設計書 (Design Runbook)

> **NOTE**: このファイルは概要のみ。詳細は以下を参照：
> - **即時実装**: [`PHASE14.3-IMMEDIATE-TASKS.md`](./PHASE14.3-IMMEDIATE-TASKS.md)
> - **将来設計**: [`PHASE14.3-FUTURE-DESIGN.md`](./PHASE14.3-FUTURE-DESIGN.md)

## 目的
- 同時利用可能ユーザー数を **20 → 100 人** に拡張し、将来的に 1,000 人規模へスケールできるアーキテクチャを設計する。
- 現在実装済みの **Phase 1/2**（セッションキャッシュ、レート制限、Supabase 接続最適化、Google 同期非同期化、workspace データキャッシュ） を踏まえて、長期的な拡張ポイントを明確化する。

## ドキュメント構成

| ファイル | 内容 | ステータス |
|---------|------|----------|
| `PHASE14.2-SCALABILITY-RUNBOOK.md` | Phase 1/2 実装詳細 | ✅ 完了 |
| `PHASE14.3-IMMEDIATE-TASKS.md` | 即時実装タスク（残タスク、モニタリング） | 🚧 対応中 |
| `PHASE14.3-FUTURE-DESIGN.md` | 将来設計（DB分割、差分同期、AI最適化等） | 📋 Planned |

---

## 即時実装タスク (Phase 14.3-A)

Phase 14.2 の残タスクと、すぐに着手可能な改善。

| タスク | 優先度 | 内容 |
|-------|--------|------|
| useGoogleTasksSync 更新 | P1 | 非同期同期のフック対応 |
| 同期ステータスUI | P1 | ジョブ状態の可視化 |
| キャッシュメトリクス | P2 | ヒット率ログ収集 |
| フォールバック改善 | P2 | キャッシュ障害時の自動復旧 |

**詳細**: [`PHASE14.3-IMMEDIATE-TASKS.md`](./PHASE14.3-IMMEDIATE-TASKS.md)

---

## 将来設計タスク (Phase 14.3-B)

1,000人規模へのスケールを見据えた長期設計。

| セクション | 優先度 | 着手条件 |
|-----------|--------|---------|
| Google Calendar 差分同期 | P2 | API呼び出し 10,000/月 超過 |
| audit_logs パーティショニング | P3 | データ 1GB 超過 |
| AI プロンプトキャッシュ | P3 | AI利用 1,000/月 超過 |
| 読み取りレプリカ | P3 | Supabase Pro 移行後 |
| CDN/画像最適化 | P3 | 帯域コスト増加 |
| 水平シャーディング | P5 | ユーザー 1,000+ |
| Kubernetes 移行 | P5 | ユーザー 1,000+ |

**詳細**: [`PHASE14.3-FUTURE-DESIGN.md`](./PHASE14.3-FUTURE-DESIGN.md)

---

## 技術的注意点（実装時に必ず確認）

### 1. Supabase タイムアウト ✅ 実装済み
`x-connection-timeout` ヘッダーは実際のタイムアウトにならない。`AbortController` で制御。

```ts
// lib/server/db.ts で実装済み
global: {
  fetch: (url, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
  },
},
```

### 2. KV キューラッパー ✅ 実装済み
`lib/server/sync-queue.ts` で `addToKVList` / `getFromKVList` 相当を実装。

### 3. Cron 認証 ✅ 実装済み
Vercel は自動的に `CRON_SECRET` を使用。エンドポイント側で検証。

```ts
// app/api/cron/sync-worker/route.ts で実装済み
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 4. ロールバックフラグ ✅ 実装済み
```bash
DISABLE_SESSION_CACHE=true    # セッションキャッシュ無効化
DISABLE_WORKSPACE_CACHE=true  # ワークスペースキャッシュ無効化
SYNC_ASYNC_MODE=true          # 非同期同期有効化
```

---

## 参考リンク

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [Next.js Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Google Calendar API Sync](https://developers.google.com/calendar/api/guides/sync)

---

*Last Updated: 2024-11-30*
*Phase: 14.3*
