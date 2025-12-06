# Phase 14.9-C: Tenant Boundary Hardening Runbook

**Phase**: 14.9-C
**実施日**: 2025-12-04
**担当**: Multi-Tenant Hardening シニアアーキテクト

---

## 1. 概要

本フェーズでは、全 API に対してテナント境界チェック (`checkTenantBoundary` / `checkUserTenantBoundary`) を適用し、マルチテナント環境におけるデータ分離を強化しました。

### 1.1 目的

- **テナント間データ漏洩防止**: 異なるテナントのユーザーが他テナントのデータにアクセスすることを防止
- **防御層の追加**: RLS（Row Level Security）導入前のアプリケーション層での防御
- **標準パターンの確立**: 全 API に一貫したセキュリティチェックパターンを適用

### 1.2 背景

監査レポート（CODE-REVIEW-2025-12-03.md）で以下の指摘がありました：

> API エンドポイントでテナント境界チェック関数 `checkTenantBoundary` が一部のエンドポイントでしか使用されていない

---

## 2. 技術設計

### 2.1 チェック関数

#### `checkTenantBoundary(request, workspaceId)`

```typescript
// lib/server/workspace-auth.ts
export async function checkTenantBoundary(
  request: NextRequest,
  workspaceId: number
): Promise<TenantBoundaryResult>
```

**用途**: ワークスペース ID を持つ API で使用
**動作**:
1. リクエストの Host ヘッダーからサブドメインを抽出
2. サブドメインに対応するテナント ID を取得
3. ワークスペースのテナント ID と比較
4. 不一致の場合は 403 Forbidden を返却

#### `checkUserTenantBoundary(request, userId)`

```typescript
// lib/server/workspace-auth.ts (Phase 14.9-C 新規追加)
export async function checkUserTenantBoundary(
  request: NextRequest,
  userId: number
): Promise<TenantBoundaryResult>
```

**用途**: ユーザー ID のみを持つ API（Google API など）で使用
**動作**:
1. リクエストの Host ヘッダーからサブドメインを抽出
2. サブドメインに対応するテナント ID を取得
3. ユーザーのテナント ID と比較
4. 不一致の場合は 403 Forbidden を返却

### 2.2 API カテゴリ分類

| カテゴリ | 説明 | 適用関数 |
|---------|------|----------|
| **A** | ワークスペースデータを操作 | `checkTenantBoundary` |
| **B** | ユーザーデータを操作（workspaceId なし） | `checkUserTenantBoundary` |
| **C** | グローバル / 公開データ | 不要 |

---

## 3. 実装詳細

### 3.1 新規追加された関数

**ファイル**: `lib/server/workspace-auth.ts:154-214`

```typescript
export async function checkUserTenantBoundary(
  request: NextRequest,
  userId: number
): Promise<TenantBoundaryResult> {
  const host = request.headers.get('host') || 'localhost';
  const currentSubdomain = extractSubdomain(host);

  // 現在のサブドメインからテナントを取得
  const { data: currentTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', currentSubdomain)
    .single();

  // ユーザーのテナントIDを取得
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  // テナント境界チェック
  if (currentTenant) {
    const userTenantId = user?.tenant_id;
    if (userTenantId && userTenantId !== currentTenant.id) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Forbidden: Tenant mismatch' },
          { status: 403 }
        ),
      };
    }
  } else if (user?.tenant_id) {
    // 'app' テナントのユーザーは許可
    const { data: appTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', 'app')
      .single();

    if (appTenant && user.tenant_id !== appTenant.id) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Forbidden: Tenant access required' },
          { status: 403 }
        ),
      };
    }
  }

  return { success: true };
}
```

### 3.2 適用した API 一覧

#### カテゴリ A（ワークスペースベース）

| API | メソッド | 適用関数 |
|-----|---------|----------|
| `/api/org-chart/departments/[id]` | PUT, DELETE | `checkTenantBoundary` |
| `/api/org-chart/report-lines/[id]` | DELETE | `checkTenantBoundary` |
| `/api/org-chart/members/[id]/assignment` | PUT | `checkTenantBoundary` |
| `/api/invitations` | GET, POST, DELETE | `checkTenantBoundary` |
| `/api/ai/chat` | POST, GET | `checkTenantBoundary` |
| `/api/ai/usage` | GET | `checkTenantBoundary` |

#### カテゴリ B（ユーザーベース）

| API | メソッド | 適用関数 |
|-----|---------|----------|
| `/api/google/sync` | POST | `checkUserTenantBoundary` |
| `/api/google/tasks` | GET, POST, PATCH, DELETE | `checkUserTenantBoundary` |
| `/api/google/tasks/sync` | POST, GET | `checkUserTenantBoundary` |
| `/api/google/calendars` | GET | `checkUserTenantBoundary` |
| `/api/google/calendars/events` | POST, PATCH, DELETE | `checkUserTenantBoundary` |
| `/api/google/calendars/today` | GET | `checkUserTenantBoundary` |
| `/api/google/auth` | GET | `checkUserTenantBoundary` |
| `/api/google/disconnect` | POST | `checkUserTenantBoundary` |

---

## 4. 検証結果

### 4.1 ビルドテスト

```bash
$ npm run type-check
> tsc --noEmit
# 成功（エラーなし）

$ npm run build
# 成功（全ルートビルド完了）
```

### 4.2 変更ファイル一覧

```
lib/server/workspace-auth.ts              # checkUserTenantBoundary 追加
app/api/org-chart/departments/[id]/route.ts
app/api/org-chart/report-lines/[id]/route.ts
app/api/org-chart/members/[id]/assignment/route.ts
app/api/invitations/route.ts
app/api/ai/chat/route.ts
app/api/ai/usage/route.ts
app/api/google/sync/route.ts
app/api/google/tasks/route.ts
app/api/google/tasks/sync/route.ts
app/api/google/calendars/route.ts
app/api/google/calendars/events/route.ts
app/api/google/calendars/today/route.ts
app/api/google/auth/route.ts
app/api/google/disconnect/route.ts
```

---

## 5. 標準パターン

### 5.1 ワークスペースベース API

```typescript
import { checkTenantBoundary } from '@/lib/server/workspace-auth';

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. メンバーシップチェック
  const membership = await checkWorkspaceAccess(workspaceId, userId);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. テナント境界チェック ← Phase 14.9-C
  const tenantCheck = await checkTenantBoundary(request, workspaceId);
  if (!tenantCheck.success) {
    return tenantCheck.response;
  }

  // 4. ビジネスロジック
  // ...
}
```

### 5.2 ユーザーベース API

```typescript
import { checkUserTenantBoundary } from '@/lib/server/workspace-auth';

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const session = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionToken)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. テナント境界チェック ← Phase 14.9-C
  const tenantCheck = await checkUserTenantBoundary(request, session.user_id);
  if (!tenantCheck.success) {
    return tenantCheck.response;
  }

  // 3. ビジネスロジック
  // ...
}
```

---

## 6. 運用ガイド

### 6.1 新規 API 追加時

1. API カテゴリ（A/B/C）を判定
2. カテゴリ A/B の場合、適切なチェック関数を import
3. 認証チェック後、ビジネスロジック前にテナント境界チェックを実行
4. テストで異なるテナントからのアクセスが拒否されることを確認

### 6.2 トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 403 Forbidden: Tenant mismatch | ユーザーのテナントとリクエストのサブドメインが不一致 | 正しいサブドメインからアクセスしているか確認 |
| 403 Forbidden: Tenant access required | サブドメインなしでテナント専用リソースにアクセス | 適切なサブドメインを使用 |

### 6.3 ログ確認

テナント境界違反は `apiLogger.warn` で記録されます：

```
[WorkspaceAuth] User tenant boundary violation detected
  currentTenantId: 1
  userTenantId: 2
  userId: 123
```

---

## 7. 今後の展望

### 7.1 Phase 14.10 以降（予定）

- **RLS 導入**: PostgreSQL の Row Level Security でデータベース層でのテナント分離
- **テナント境界テスト自動化**: E2E テストでのテナント境界違反検証

### 7.2 監視強化

- テナント境界違反のアラート設定
- 違反パターンの分析・可視化

---

## 8. 参考資料

- `lib/server/workspace-auth.ts` - テナント境界チェック実装
- `lib/server/tenants.ts` - テナント解決ロジック
- `docs/CODE-REVIEW-2025-12-03.md` - 監査レポート
- `docs/FDC-GRAND-GUIDE.md` - システム全体アーキテクチャ
