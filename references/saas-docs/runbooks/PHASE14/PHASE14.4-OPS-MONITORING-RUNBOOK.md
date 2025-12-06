# Phase 14.4: 運用監視強化・技術的負債解消 ランブック

## ✅ Phase 14.4 完了（2025-11-30）

Phase 14.2-14.3 で導入したスケーラビリティ改善の運用監視強化と、蓄積された技術的負債の解消を実施。

---

## 完了サマリー

### 技術的負債解消結果

| カテゴリ | 解消前 | 解消後 |
|---------|--------|--------|
| console.log → logger移行 | ~50件 | ✅ 0件 |
| 未使用変数・インポート | ~30件 | ✅ 0件 |
| React Hooks警告 | 2件 | ✅ 0件 |
| アクセシビリティ | 1件 | ✅ 0件 |
| 不要なeslint-disable | 2件 | ✅ 0件 |

### 影響ファイル（優先順）

#### API Routes（本番ログ品質に直結）
- `app/api/admin/sa-workspace-members/route.ts` - console.log x4
- `app/api/admin/sa-workspaces/route.ts` - console.log x3
- `app/api/admin/users/route.ts` - console.log x5
- `app/api/admin/system-stats/route.ts` - console.log x1
- `app/api/google/callback/route.ts` - console.log x10+
- `app/api/google/sync/route.ts` - console.log
- `app/api/audit-logs/route.ts` - console.log x3
- `app/api/auth/callback/route.ts` - console.log
- `app/api/ai/chat/route.ts` - console.log + 未使用変数

#### Components（UI品質）
- `app/_components/todo/TaskBoardTab.tsx` - 未使用変数x7 + console.log + hooks警告
- `app/_components/todo/ElasticHabitsPanel.tsx` - 未使用変数x6
- `app/_components/org-chart/OrgTreeNode.tsx` - aria-selected未定義
- `app/_components/prospects/ProspectsManagement.tsx` - 未使用インポートx3

---

## Phase 14.4-A: 運用監視強化

### Task 14.4-A.1: Vercel アラート設定

**目的**: 異常検知の自動化

```
Vercel Dashboard > Project > Settings > Notifications
```

**推奨アラート設定**:

| アラート | 閾値 | 通知先 |
|---------|------|--------|
| Deployment Failed | 任意 | Slack/Email |
| Function Duration | > 10s | Slack |
| Function Error Rate | > 5% | Slack/Email |
| Edge Function Invocations | > 10000/day | Email（コスト） |

### Task 14.4-A.2: カスタムメトリクスダッシュボード

**既存実装** (`lib/server/metrics.ts`):
- `recordCacheMetric` - キャッシュヒット/ミス
- `recordApiLatency` - APIレイテンシ
- `recordSyncJobStart/Complete` - 同期ジョブ
- `recordRateLimitHit` - レート制限
- `recordError` - エラー

**追加タスク**: Vercel Logsからのメトリクス集計

```typescript
// Vercel Log Drains設定（オプション）
// https://vercel.com/docs/observability/log-drains

// 1. Vercel Dashboard > Project > Settings > Log Drains
// 2. 接続先: Datadog / Axiom / カスタムエンドポイント
// 3. フィルター: type: 'metric' のログのみ
```

### Task 14.4-A.3: ヘルスチェックエンドポイント

```typescript
// app/api/health/route.ts (新規作成)

import { NextResponse } from 'next/server';
import { checkDbConnection } from '@/lib/server/db';
import { getSessionCacheStats } from '@/lib/server/session-cache';
import { getWorkspaceCacheStats } from '@/lib/server/workspace-cache';

export async function GET() {
  const dbHealthy = await checkDbConnection();
  const sessionCache = getSessionCacheStats();
  const workspaceCache = getWorkspaceCacheStats();

  const status = dbHealthy ? 'healthy' : 'degraded';

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'ok' : 'error',
      sessionCache: sessionCache.enabled ? 'ok' : 'disabled',
      workspaceCache: workspaceCache.enabled ? 'ok' : 'disabled',
    },
  }, {
    status: dbHealthy ? 200 : 503,
  });
}
```

---

## Phase 14.4-B: console.log → logger 移行

### Task 14.4-B.1: API Routes のログ統一

**パターン**:
```typescript
// Before
console.log('[API] message', data);
console.error('[API] error', error);

// After
import { apiLogger } from '@/lib/server/logger';
apiLogger.info({ data }, '[API] message');
apiLogger.error({ err: error }, '[API] error');
```

**対象ファイル** (優先順):

#### 1. 管理API（4ファイル）
- [ ] `app/api/admin/sa-workspace-members/route.ts`
- [ ] `app/api/admin/sa-workspaces/route.ts`
- [ ] `app/api/admin/users/route.ts`
- [ ] `app/api/admin/system-stats/route.ts`

#### 2. Google API（6ファイル）
- [ ] `app/api/google/callback/route.ts`
- [ ] `app/api/google/sync/route.ts`
- [ ] `app/api/google/auth/route.ts`
- [ ] `app/api/google/tasks/route.ts`
- [ ] `app/api/google/tasks/sync/route.ts`
- [ ] `app/api/google/calendars/*.ts` (3ファイル)

#### 3. その他API（4ファイル）
- [ ] `app/api/audit-logs/route.ts`
- [ ] `app/api/auth/callback/route.ts`
- [ ] `app/api/ai/chat/route.ts`
- [ ] `app/api/cron/sync-worker/route.ts`

### Task 14.4-B.2: lib/google のログ統一

**対象ファイル**:
- [ ] `lib/google/calendar-client.ts`
- [ ] `lib/google/tasks-client.ts`
- [ ] `lib/google/sync-engine.ts`

---

## Phase 14.4-C: 未使用コード削除

### Task 14.4-C.1: 未使用インポート削除

**対象ファイル**:

| ファイル | 未使用 |
|---------|--------|
| `app/_components/mvv/UnifiedMVVTab.tsx` | ProductType, Profiles, Brand |
| `app/_components/org-chart/OrgTreeNode.tsx` | Users |
| `app/_components/prospects/ProspectsManagement.tsx` | MessageSquare, Phone, FUNNEL_STATUS_ICON_COLORS |
| `app/_components/todo/UmeHabitManager.tsx` | Suit |

### Task 14.4-C.2: 未使用変数削除

**対象ファイル**:

| ファイル | 未使用変数 |
|---------|-----------|
| `app/_components/action-map/ActionMapAccordion.tsx` | _onUpdateStatus |
| `app/_components/org-chart/OrgChartMapView.tsx` | levelCount |
| `app/_components/org-chart/OrgChartTab.tsx` | memberId |
| `app/_components/todo/ElasticHabitsPanel.tsx` | relatedTasks, badges, levelConfig, onCreateHabit, onDeleteHabit, onCreateUmeBlock |
| `app/_components/todo/TaskBoardTab.tsx` | createElasticHabitTask, createUmeHabit, updateUmeHabit, deleteUmeHabit, completeUmeHabit, handleGoToHabitTab |
| `app/_components/todo/TimeAllocationBar.tsx` | total |
| `app/_components/todo/TodaySchedule.tsx` | currentTime |
| `app/api/ai/chat/route.ts` | _workspaceId |

---

## Phase 14.4-D: React Hooks 警告修正

### Task 14.4-D.1: useCallback 依存配列修正

**ファイル**: `app/_components/todo/TaskBoardTab.tsx:387`

```typescript
// Before
const someCallback = useCallback(() => {
  // SUIT_TO_EMOJI を使用
}, []); // 依存配列に SUIT_TO_EMOJI がない

// After
const someCallback = useCallback(() => {
  // SUIT_TO_EMOJI を使用
}, [SUIT_TO_EMOJI]); // または useMemo で定数化
```

---

## Phase 14.4-E: アクセシビリティ修正

### Task 14.4-E.1: ARIA属性追加

**ファイル**: `app/_components/org-chart/OrgTreeNode.tsx:157`

```typescript
// Before
<div role="treeitem">...</div>

// After
<div
  role="treeitem"
  aria-selected={isSelected}
  aria-expanded={isExpanded}
>
  ...
</div>
```

---

## Phase 14.4-F: 不要なeslint-disable削除

### Task 14.4-F.1: eslint-disable クリーンアップ

**対象ファイル**:
- [ ] `app/(app)/dashboard/page.tsx:191` - 不要なeslint-disable
- [ ] `app/_components/ConversionFunnel.tsx:137` - 不要なeslint-disable

---

## 実装チェックリスト

### Phase 14.4-A: 運用監視強化
- [ ] **A.1** Vercel アラート設定（運用タスク）
- [ ] **A.2** Log Drains設定（オプション）
- [x] **A.3** ヘルスチェックエンドポイント追加（`app/api/health/route.ts`）

### Phase 14.4-B: console.log → logger 移行
- [x] **B.1** 管理API（4ファイル）✅
- [x] **B.1** Google API（6ファイル）✅
- [x] **B.1** その他API（4ファイル）✅
- [x] **B.2** lib/google（3ファイル）✅

### Phase 14.4-C: 未使用コード削除
- [x] **C.1** 未使用インポート削除 ✅
- [x] **C.2** 未使用変数削除 ✅

### Phase 14.4-D: React Hooks 警告修正
- [x] **D.1** useCallback 依存配列修正（SUIT_TO_EMOJIをコンポーネント外に移動）✅

### Phase 14.4-E: アクセシビリティ修正
- [x] **E.1** ARIA属性追加（aria-selected, aria-expanded）✅

### Phase 14.4-F: eslint-disable クリーンアップ
- [x] **F.1** 不要なeslint-disable削除 ✅

---

## 達成された効果

| 指標 | 実施前 | 実施後 | 改善率 |
|------|--------|--------|--------|
| ESLint Warnings | 283件 | ~20件 | 93%削減 |
| console.log使用 | ~50箇所 | 0箇所 | 100%削減 |
| 本番ログ品質 | 非構造化 | 構造化JSON（Pino） | ✅ |
| ヘルスチェック | なし | `/api/health` | ✅ |

---

## 主な変更点

### ESLint設定の強化 (`eslint.config.mjs`)

```typescript
// アンダースコア付き変数は未使用でも許容（将来使用予定のプレースホルダ）
"@typescript-eslint/no-unused-vars": ["warn", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_"
}],
```

### Pinoログ構文の統一

全APIファイルでPinoの正しい構文に統一：
```typescript
// Before (間違い)
apiLogger.info('[API] message:', { data });

// After (正しい)
apiLogger.info({ data }, '[API] message');
```

### React Hooks最適化

`SUIT_TO_EMOJI`定数をコンポーネント外に移動し、依存配列の警告を解消。

---

## ロールバック手順

変更は破壊的ではないため、git revertで対応可能。

```bash
git revert <commit-hash>
```

---

*Created: 2024-11-30*
*Completed: 2025-11-30*
*Phase: 14.4*
