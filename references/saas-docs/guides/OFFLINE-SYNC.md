# Offline / Sync Strategy Guide

**最終更新:** 2025-12-02
**バージョン:** v1.1（Phase 14.35 対応）

Phase 10〜14 の TODO & Elastic Habits + OKR + ActionMap のための同期戦略ガイド。

## 1. 概要

FoundersDirect のオフライン/同期機能は以下の3段階で実装予定：

| Phase | 機能 | 優先度 | 状態 |
|-------|------|--------|------|
| Phase 10.1 | オンライン前提（現行通り） | - | ✅ 完了 |
| Phase 10.2 | Service Worker + 楽観的UI | High | 🔜 計画中 |
| Phase 10.3 | IndexedDB + バックグラウンド同期 | Medium | 🔜 計画中 |

## 2. 現行アーキテクチャ（Phase 10.1）

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Client    │────▶│   Next.js API     │────▶│   Postgres   │
│  (React)    │◀────│   /api/workspaces │◀────│  (Supabase)  │
└─────────────┘     └───────────────────┘     └──────────────┘
```

### 現行フロー

1. **読み込み（Read）**
   - `useWorkspace` フック → `/api/workspaces/[id]/data` → DB
   - 成功時: `AppData` をステートに保存
   - 失敗時: エラー表示、リトライボタン

2. **書き込み（Write）**
   - 楽観的UI更新 → API PUT リクエスト → DB
   - 成功時: 完了（ステートは既に更新済み）
   - 失敗時: ロールバック（`refetch()`）

## 3. Phase 10.2: Service Worker + 楽観的UI

### 目標

- オフライン時も読み取りアクセス可能
- 一時的なネットワーク断でもUXを維持
- 更新時の競合検知

### アーキテクチャ

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Client    │────▶│   Service Worker  │────▶│   Network    │
│  (React)    │◀────│   (sw.js)         │◀────│   (API)      │
└─────────────┘     └─────────┬─────────┘     └──────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Cache Storage   │
                    │   (Read Only)     │
                    └───────────────────┘
```

### 実装方針

1. **Service Worker 登録**
   ```typescript
   // app/layout.tsx or lib/sw-register.ts
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js');
   }
   ```

2. **キャッシュ戦略**
   - API レスポンス: Network First, Cache Fallback
   - 静的アセット: Cache First
   - TTL: 5分（workspace_data）

3. **競合検知**
   - `version` フィールドによる楽観的ロック
   - 競合時: ユーザーに選択UI表示

### ファイル構成

```
public/
└── sw.js                    # Service Worker 本体

lib/
├── sw-register.ts           # SW 登録
└── cache-strategy.ts        # キャッシュ戦略ロジック
```

## 4. Phase 10.3: IndexedDB + バックグラウンド同期

### 目標

- 完全オフライン対応（読み書き両方）
- バックグラウンドでの自動同期
- 複数デバイス間の整合性

### アーキテクチャ

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Client    │────▶│   Sync Manager    │────▶│   Network    │
│  (React)    │◀────│                   │◀────│   (API)      │
└─────────────┘     └─────────┬─────────┘     └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌───────────────┐   ┌───────────────┐
          │   IndexedDB   │   │ Pending Queue │
          │   (Tasks)     │   │ (Mutations)   │
          └───────────────┘   └───────────────┘
```

### IndexedDB スキーマ

```typescript
// lib/db/idb-schema.ts

interface IDBSchema {
  tasks: {
    key: string;           // task.id
    value: Task;
    indexes: {
      'by-suit': Suit;
      'by-status': TaskStatus;
      'by-updated': number;
    };
  };

  pendingMutations: {
    key: number;           // autoIncrement
    value: {
      type: 'create' | 'update' | 'delete';
      entity: 'task';
      payload: unknown;
      createdAt: number;
      retryCount: number;
    };
  };

  syncMeta: {
    key: string;           // 'lastSyncAt', 'serverVersion'
    value: number | string;
  };
}
```

### 同期戦略

1. **オンライン時**
   - 変更即時反映 → 成功したら pendingMutations から削除
   - 5分ごとにフル同期

2. **オフライン時**
   - IndexedDB に書き込み
   - pendingMutations キューに追加
   - オンライン復帰時にキュー処理

3. **競合解決**
   - Last Write Wins（LWW）をベースに
   - `updatedAt` と `serverVersion` で判定
   - 重大な競合はユーザーに通知

### Background Sync API

```typescript
// sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  const db = await openDB('foundersdirect', 1);
  const mutations = await db.getAll('pendingMutations');

  for (const mutation of mutations) {
    try {
      await applyMutation(mutation);
      await db.delete('pendingMutations', mutation.id);
    } catch (error) {
      if (mutation.retryCount >= 3) {
        // 失敗通知
        await notifyUser('同期に失敗しました');
      }
      mutation.retryCount++;
      await db.put('pendingMutations', mutation);
    }
  }
}
```

## 5. 移行計画

### Phase 10.1 → 10.2

1. Service Worker 導入（既存機能に影響なし）
2. キャッシュ戦略実装
3. オフライン検知UI追加
4. テスト & 段階的ロールアウト

### Phase 10.2 → 10.3

1. IndexedDB スキーマ定義
2. 既存データの初回同期ロジック
3. Mutation キュー実装
4. Background Sync 実装
5. 競合解決UI
6. 負荷テスト & ロールアウト

## 6. オフライン状態の検知

```typescript
// lib/hooks/useOnlineStatus.ts

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

## 7. エラーハンドリング

### ネットワークエラー時

1. リトライ（最大3回、エクスポネンシャルバックオフ）
2. オフラインバナー表示
3. 読み取り: キャッシュから提供
4. 書き込み: 保留キューに追加

### 競合エラー時（HTTP 409）

1. 最新データを取得
2. ローカル変更とマージ可能か判定
3. マージ不可能な場合: ユーザーに選択UI

## 8. テスト戦略

### 単体テスト

- IndexedDB 操作（idb ライブラリ使用）
- Mutation キューの FIFO 順序
- 競合検知ロジック

### 統合テスト

- オフライン→オンライン遷移
- 複数タブ間の整合性
- Service Worker のキャッシュ戦略

### E2E テスト

- Playwright + ネットワーク制御
- オフライン状態でのUI操作
- 同期完了の確認

## 9. 参考資料

- [Service Worker API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Service_Worker_API)
- [IndexedDB API - MDN](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [idb - IndexedDB wrapper](https://github.com/jakearchibald/idb)

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-02 | v1.1 Phase 14.35 対応（状態カラム追加） |
| 2025-11-27 | v1.0 初版作成（Phase 9.94-C） |
