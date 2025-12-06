# API権限マトリックス

**Version:** 1.1
**最終更新:** 2025-12-02（Phase 14.6 対応）

---

## 📋 概要

このドキュメントは、FoundersDirect の全APIエンドポイントにおける権限要件を一覧化したものです。

---

## 🔐 権限レベル

### システムロール（system_role）

| ロール | 説明 |
|--------|------|
| **SA** | システム管理者。全テナント・全ワークスペースにアクセス可能 |
| **USER** | 一般ユーザー。所属テナント・ワークスペースのみアクセス可能 |
| **TEST** | 試用期間ユーザー。14日間の制限あり |

### ワークスペースロール（workspace_members.role）

| ロール | 説明 |
|--------|------|
| **OWNER** | ワークスペースオーナー。全操作可能 |
| **ADMIN** | 管理者。メンバー管理可能、WS削除不可 |
| **MEMBER** | メンバー。データ編集可能、メンバー管理不可 |

---

## 📊 権限関数（lib/utils/permissions.ts）

| 関数 | 許可ロール | 用途 |
|------|-----------|------|
| `isSA()` | SA | SA権限チェック |
| `canEdit()` | OWNER, ADMIN, MEMBER | データ編集権限 |
| `canManageMembers()` | OWNER, ADMIN | メンバー管理権限 |
| `canDeleteWorkspace()` | OWNER | ワークスペース削除権限 |
| `canAccessAdmin()` | SA, OWNER, ADMIN | 管理者タブアクセス |
| `canViewReports()` | SA, OWNER, ADMIN, MEMBER | レポート閲覧 |
| `canViewCrossWorkspaceReports()` | SA, OWNER | 横断レポート閲覧 |

---

## 🔌 APIエンドポイント権限マトリックス

### 認証系 API

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/auth/session` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ フィルタリング |
| `/api/auth/callback` | GET | 不要 | - | - | - | - | ✅ 自動設定 |
| `/api/auth/logout` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | - |

### ワークスペース系 API

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/workspaces/[id]/data` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/workspaces/[id]/data` | PUT | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/workspaces/[id]/members` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |
| `/api/workspaces/[id]/members` | POST | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ 所属確認 |
| `/api/workspaces/[id]/members` | DELETE | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ 所属確認 |

### 招待系 API

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/invitations/verify` | GET | 不要 | - | - | - | - | - |
| `/api/invitations/verify` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/admin/invitations` | GET | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ 所属確認 |
| `/api/admin/invitations` | POST | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ 所属確認 |
| `/api/admin/invitations` | DELETE | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ 所属確認 |

### SA管理系 API（SA専用）

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/admin/tenants` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | ❌ 全テナント |
| `/api/admin/tenants` | POST | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants` | PATCH | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants` | DELETE | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants/[id]` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspaces` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | ❌ 全WS |
| `/api/admin/sa-workspaces` | POST | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspaces` | DELETE | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspace-members` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspace-members` | POST | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspace-members` | PATCH | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-workspace-members` | DELETE | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/sa-users` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | ❌ 全ユーザー |
| `/api/admin/sa-users` | PATCH | 必要 | ✅ | ❌ | ❌ | ❌ | - |

### テナント管理 API（Phase 14.6）

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/admin/tenants` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | ❌ 全テナント |
| `/api/admin/tenants` | POST | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants` | PATCH | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants` | DELETE | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants/[tenantId]` | GET | 必要 | ✅ | ❌ | ❌ | ❌ | - |
| `/api/admin/tenants/[tenantId]` | PATCH | 必要 | ✅ | ❌ | ❌ | ❌ | - |

### AI系 API

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/ai/chat` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |
| `/api/ai/chat` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |
| `/api/ai/usage` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |

### Google連携 API

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/google/auth` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/callback` | GET | 不要 | - | - | - | - | - |
| `/api/google/sync` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |
| `/api/google/disconnect` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/calendars` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/calendars/today` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/calendars/events` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/tasks` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | - |
| `/api/google/tasks/sync` | POST | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ 所属確認 |

### 組織図 API（Phase 14.4）

| エンドポイント | メソッド | 認証 | SA | OWNER | ADMIN | MEMBER | テナント境界 |
|---------------|---------|------|----|----|----|----|-----|
| `/api/org-chart` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/org-chart/departments` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/org-chart/departments` | POST | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/departments/[id]` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/org-chart/departments/[id]` | PUT | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/departments/[id]` | DELETE | 必要 | ✅ | ✅ | ❌ | ❌ | ✅ チェック |
| `/api/org-chart/members/[id]/assignment` | PUT | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/report-lines` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/org-chart/report-lines` | POST | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/report-lines/[id]` | PUT | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/report-lines/[id]` | DELETE | 必要 | ✅ | ✅ | ✅ | ❌ | ✅ チェック |
| `/api/org-chart/visibility-policy` | GET | 必要 | ✅ | ✅ | ✅ | ✅ | ✅ チェック |
| `/api/org-chart/visibility-policy` | PUT | 必要 | ✅ | ✅ | ❌ | ❌ | ✅ チェック |

---

## 🛡️ セキュリティチェック実装パターン

### パターン1: 基本認証チェック

```typescript
// 全APIで使用
const session = await getSession(request);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### パターン2: SA権限チェック

```typescript
// SA専用API（/api/admin/tenants など）
async function checkSAPermission(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.accountType !== 'SA') {
    return { error: NextResponse.json({ error: 'Forbidden: SA権限が必要です' }, { status: 403 }) };
  }
  return {};
}
```

### パターン3: ワークスペースメンバーシップチェック

```typescript
// ワークスペースAPIで使用
const { data: memberData } = await supabase
  .from('workspace_members')
  .select('role')
  .eq('workspace_id', workspaceId)
  .eq('user_id', session.id)
  .single();

if (!memberData) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### パターン4: テナント境界チェック

```typescript
// テナント分離が必要なAPIで使用
const host = request.headers.get('host') || 'localhost';
const currentSubdomain = extractSubdomain(host);

const { data: currentTenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('subdomain', currentSubdomain)
  .single();

if (currentTenant && workspace?.tenant_id !== currentTenant.id) {
  return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
}
```

---

## 📝 エラーレスポンス

| ステータス | コード | 意味 |
|-----------|--------|------|
| 401 | Unauthorized | 認証が必要（セッションなし） |
| 403 | Forbidden | 権限不足（認証済みだがアクセス権なし） |
| 403 | Forbidden: SA権限が必要です | SA専用APIへの非SAアクセス |
| 403 | Forbidden: Tenant mismatch | テナント境界違反 |
| 404 | Not Found | リソースが存在しない |

---

## 📚 関連ドキュメント

- `docs/specs/PERMISSION-SYSTEM.md` - 権限システム詳細
- `docs/specs/DB-SECURITY.md` - DBセキュリティ設計
- `docs/runbooks/TENANT-MANAGEMENT-GUIDE.md` - テナント管理ガイド

---

## 📝 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.1 | 2025-12-02 | Phase 14.6 対応（テナント管理API、AI API、Google連携API、組織図API追加） |
| v1.0 | 2025-12-02 | 初版作成（Phase 14.4） |

---

**作成日**: 2025-12-02
**作成者**: Claude Code (Phase 14.4 → 14.6)
**バージョン**: 1.1
