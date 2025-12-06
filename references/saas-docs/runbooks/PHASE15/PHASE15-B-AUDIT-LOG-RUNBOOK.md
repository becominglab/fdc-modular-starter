# Phase 15-B: Minimum Audit Log Runbook

**Version:** 1.0
**Date:** 2025-12-04
**Status:** Implemented
**Author:** Claude Code (Phase 15-B)

---

## 1. 目的

「誰が / いつ / どのテナントで / 何をしたか」という **監査証跡を最低限確保**し、
- 大きなトラブル時に原因を追える
- 将来のエンタープライズ対応（ISMS / SOC2 等）の土台にする

※このフェーズでは「完全版」ではなく、**クリティカル操作だけに絞ったミニマム版**を実装。

---

## 2. 対象イベント（Minimum Set）

| イベント | アクション名 | エンティティタイプ | 説明 |
|---------|-------------|------------------|------|
| Google 連携開始 | `google_linked` | `google_integration` | ユーザーが Google アカウントを連携 |
| Google 連携解除 | `google_unlinked` | `google_integration` | ユーザーが Google 連携を解除 |
| メンバー追加 | `member_added` | `workspace_member` | ワークスペースにメンバーを追加 |
| メンバーロール変更 | `member_role_changed` | `workspace_member` | メンバーのロールを変更 |
| メンバー削除 | `member_removed` | `workspace_member` | ワークスペースからメンバーを削除 |
| テナント設定変更 | `tenant_settings_changed` | `tenant_settings` | テナントの設定（名前、プラン、テーマ等）を変更 |

---

## 3. DB スキーマ

**テーブル:** `audit_logs`（既存）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | SERIAL | 主キー |
| `workspace_id` | INTEGER | ワークスペースID（任意） |
| `user_id` | INTEGER | 操作実行ユーザーID |
| `action` | TEXT | アクション種別 |
| `resource_type` | TEXT | エンティティ種別 |
| `resource_id` | TEXT | 対象リソースID |
| `details` | JSONB | 詳細情報（変更前後の値など） |
| `created_at` | TIMESTAMP | 記録日時 |

### 3-1. details フィールドの構造

**Google 連携系:**
```json
{
  "scopes": ["https://www.googleapis.com/auth/calendar", "..."],
  "tenant_id": "uuid",
  "user_email": "user@example.com",
  "ip_address": "203.0.113.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-12-04T00:00:00.000Z"
}
```

**メンバー操作系:**
```json
{
  "target_user_id": "123",
  "target_user_email": "target@example.com",
  "role": "ADMIN",
  "previous_role": "MEMBER",
  "new_role": "ADMIN",
  "tenant_id": "uuid",
  "changed_by_email": "admin@example.com",
  "ip_address": "203.0.113.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-12-04T00:00:00.000Z"
}
```

**テナント設定変更:**
```json
{
  "setting_type": "tenant_config",
  "previous_value": { "name": "旧名称", "plan": "standard" },
  "new_value": { "name": "新名称" },
  "changed_fields": ["name"],
  "tenant_id": "uuid",
  "changed_by_email": "admin@example.com",
  "ip_address": "203.0.113.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-12-04T00:00:00.000Z"
}
```

---

## 4. 実装の要点

### 4-1. ファイル構成

| ファイル | 役割 |
|---------|------|
| `lib/server/audit.ts` | 監査ログ共通モジュール（Phase 15-B 追加分含む） |
| `app/api/google/callback/route.ts` | Google 連携開始の監査ログ |
| `app/api/google/disconnect/route.ts` | Google 連携解除の監査ログ |
| `app/api/admin/sa-workspace-members/handlers/post.ts` | メンバー追加の監査ログ |
| `app/api/admin/sa-workspace-members/handlers/patch.ts` | ロール変更の監査ログ |
| `app/api/admin/sa-workspace-members/handlers/delete.ts` | メンバー削除の監査ログ |
| `app/api/admin/tenants/route.ts` | テナント設定変更の監査ログ |

### 4-2. 主要関数

```typescript
// lib/server/audit.ts

// Google 連携系
export async function auditGoogleLinked(ctx: CriticalAuditContext, details: { scopes: string[] }): Promise<void>
export async function auditGoogleUnlinked(ctx: CriticalAuditContext, details?: { reason?: string }): Promise<void>

// メンバー操作系
export async function auditMemberAdded(ctx: CriticalAuditContext, details: { targetUserId: string; role: string }): Promise<void>
export async function auditMemberRoleChanged(ctx: CriticalAuditContext, details: { targetUserId: string; previousRole: string; newRole: string }): Promise<void>
export async function auditMemberRemoved(ctx: CriticalAuditContext, details: { targetUserId: string; previousRole?: string }): Promise<void>

// テナント設定系
export async function auditTenantSettingsChanged(ctx: CriticalAuditContext, details: { settingType: string; previousValue?: object; newValue?: object; changedFields?: string[] }): Promise<void>
```

### 4-3. コンテキスト型

```typescript
export interface CriticalAuditContext {
  userId: string;
  userEmail?: string;
  workspaceId?: string | null;
  tenantId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 5. 運用クエリ

### 5-1. 最近のクリティカル操作を確認

```sql
SELECT
  al.created_at,
  al.action,
  al.resource_type,
  u.email as actor_email,
  al.details->>'target_user_email' as target_email,
  al.details->>'ip_address' as ip
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.action IN (
  'google_linked',
  'google_unlinked',
  'member_added',
  'member_role_changed',
  'member_removed',
  'tenant_settings_changed'
)
ORDER BY al.created_at DESC
LIMIT 50;
```

### 5-2. 特定ユーザーの操作履歴

```sql
SELECT
  al.created_at,
  al.action,
  al.resource_type,
  al.details
FROM audit_logs al
WHERE al.user_id = :user_id
  AND al.action IN (
    'google_linked', 'google_unlinked',
    'member_added', 'member_role_changed', 'member_removed',
    'tenant_settings_changed'
  )
ORDER BY al.created_at DESC
LIMIT 100;
```

### 5-3. テナント別の操作統計

```sql
SELECT
  al.details->>'tenant_id' as tenant_id,
  al.action,
  COUNT(*) as count
FROM audit_logs al
WHERE al.action IN (
  'google_linked', 'google_unlinked',
  'member_added', 'member_role_changed', 'member_removed',
  'tenant_settings_changed'
)
  AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY al.details->>'tenant_id', al.action
ORDER BY count DESC;
```

---

## 6. 今後の拡張候補

Phase 16 以降で検討する対象イベント：

| 優先度 | イベント | 説明 |
|--------|---------|------|
| 高 | ログイン / ログアウト | 認証イベント |
| 高 | ワークスペース作成 / 削除 | ワークスペースライフサイクル |
| 中 | データエクスポート | 機密データの持ち出し |
| 中 | API キー発行 / 削除 | 外部連携設定 |
| 低 | 各種設定変更 | ユーザー設定など |

---

## 7. 既存の監査ログ機能との統合

### 7-1. AI 使用量ログ

既存の `createAIUsageLog()` は引き続き動作：

```typescript
// AI チャット使用時に記録
await createAIUsageLog({
  userId: session.id,
  workspaceId: workspaceId,
  usage: {
    model: 'claude-sonnet-4-20250514',
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    estimatedCostUsd: 0.015,
  },
});
```

### 7-2. AI 使用量の集計

```sql
SELECT
  u.email,
  SUM((al.details->>'total_tokens')::int) as total_tokens,
  SUM((al.details->>'estimated_cost_usd')::float) as total_cost_usd,
  COUNT(*) as request_count
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'ai_chat'
  AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.email
ORDER BY total_cost_usd DESC;
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0 | 2025-12-04 | 初版作成（Phase 15-B 実装完了） |

---

## 9. 関連ドキュメント

- [PHASE15-RUNBOOK.md](./PHASE15-RUNBOOK.md) - Phase 15 全体の設計書
- [PHASE15-A-GOOGLE-TOKEN-ENCRYPTION-RUNBOOK.md](./PHASE15-A-GOOGLE-TOKEN-ENCRYPTION-RUNBOOK.md) - トークン暗号化
- [lib/server/audit.ts](../../lib/server/audit.ts) - 実装コード
- [migrations/022-audit-log-retention.sql](../../migrations/022-audit-log-retention.sql) - 監査ログ保持・アーカイブ
