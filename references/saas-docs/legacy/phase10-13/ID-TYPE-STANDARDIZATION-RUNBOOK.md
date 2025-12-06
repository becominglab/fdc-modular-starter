# ID型統一化 Runbook

**Version:** 1.1
**Status:** ✅ 完了
**作成日:** 2025-11-29
**最終更新:** 2025-11-29
**Claude Code 用ランブック**

---

## 1. 概要

本ドキュメントは、コードベース全体でのID型（userId, workspaceId）の統一化に関する方針と実装手順を定義する。

### 1.1 現状（修正後）

| 層 | userId | workspaceId | 状態 |
|----|--------|-------------|------|
| DB（PostgreSQL） | INTEGER | INTEGER | ✅ 統一済み |
| API レスポンス | String() → string | String() → string | ✅ 統一済み |
| フロント型定義 | string | string | ✅ 統一済み |
| AuthContext | string | string | ✅ 統一済み |

### 1.2 目標

**すべてのID（userId, workspaceId）をフロントエンド層で `string` に統一する。**

---

## 2. 統一方針

### 2.1 レイヤー別の型

```
┌─────────────────────────────────────────────────────────────┐
│ DB層 (PostgreSQL)                                           │
│   users.id: INTEGER (SERIAL)                                │
│   workspaces.id: INTEGER (SERIAL)                           │
│   workspace_members.user_id: INTEGER                        │
│   workspace_members.workspace_id: INTEGER                   │
│   member_report_lines.subordinate_id: INTEGER               │
│   member_report_lines.supervisor_id: INTEGER                │
└─────────────────────────────────────────────────────────────┘
                          ↓ parseInt()
┌─────────────────────────────────────────────────────────────┐
│ API層 (Next.js Route Handlers)                              │
│   - リクエスト: string (URL params) → parseInt() → number   │
│   - DB操作: number で実行                                    │
│   - レスポンス: String() → string で返却                     │
└─────────────────────────────────────────────────────────────┘
                          ↓ string
┌─────────────────────────────────────────────────────────────┐
│ フロント層 (React/Next.js)                                   │
│   userId: string                                             │
│   workspaceId: string                                        │
│   subordinateId: string                                      │
│   supervisorId: string                                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 コーディング規約

```typescript
// ✅ 正しいパターン
// API でのリクエスト処理
const workspaceIdParam = searchParams.get('workspaceId');
const workspaceId = parseInt(workspaceIdParam || '', 10);
if (isNaN(workspaceId)) {
  return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 });
}

// API でのレスポンス生成
return NextResponse.json({
  userId: String(user.id),           // number → string
  workspaceId: String(workspace.id), // number → string
});

// フロント側の型定義
interface User {
  id: string;           // ✅ string
  workspaceId: string;  // ✅ string
}

// ❌ 間違ったパターン
interface User {
  id: number;           // ❌ number は使用しない
  workspaceId: number;  // ❌ number は使用しない
}
```

---

## 3. 修正対象ファイル

### 3.1 型定義ファイル（優先度: 高）

| ファイル | 修正箇所 | 変更内容 |
|---------|---------|---------|
| `lib/types/database.ts` | Workspace.id | any → string |
| | WorkspaceMember.workspaceId | any → string |
| `lib/types/org-chart.ts` | ReportLine.workspaceId | number → string |
| `lib/contexts/AuthContext.tsx` | AuthUser.workspaceId | number → string |

### 3.2 APIファイル（優先度: 中）

| ファイル | 確認事項 |
|---------|---------|
| `app/api/org-chart/route.ts` | ✅ String() 使用済み |
| `app/api/org-chart/report-lines/route.ts` | ✅ String() 使用済み |
| `app/api/workspaces/[workspaceId]/members/route.ts` | ✅ String() 使用済み |
| `app/api/audit-logs/route.ts` | ✅ String() 使用済み |
| `app/api/invitations/route.ts` | ✅ String() 使用済み |
| `app/api/admin/sa-workspaces/route.ts` | ✅ String() 使用済み |

### 3.3 フックファイル（優先度: 中）

| ファイル | 確認事項 |
|---------|---------|
| `lib/hooks/useOrgChart.ts` | ✅ workspaceId: string |
| `lib/hooks/useWorkspace.ts` | ✅ workspaceId: string |
| `lib/hooks/useSADashboardViewModel.ts` | ✅ workspaceId: string |
| `lib/hooks/useReportsViewModel.ts` | ✅ workspaceId: string |

### 3.4 サーバーファイル（優先度: 中）

| ファイル | 確認事項 |
|---------|---------|
| `lib/server/org-chart-service.ts` | ✅ String() 使用済み |
| `lib/server/org-visibility.ts` | ✅ String() 使用済み |

---

## 4. 実装手順

### Phase 1: 型定義の修正

```bash
# 1. lib/types/database.ts を修正
# 2. lib/types/org-chart.ts を修正
# 3. lib/contexts/AuthContext.tsx を修正
```

### Phase 2: 影響範囲の確認

```bash
# TypeScript コンパイルエラーを確認
npx tsc --noEmit

# エラー箇所を修正
```

### Phase 3: API レスポンスの確認

各 API エンドポイントで以下を確認：
- userId は String() で変換されているか
- workspaceId は String() で変換されているか

### Phase 4: テスト

```bash
# E2E テスト実行
npm run test:e2e

# 手動テスト
- ログイン → ダッシュボード表示
- 組織図 → メンバー選択 → 詳細表示
- ドラッグ&ドロップ → レポートライン変更
```

---

## 5. 権限システムとの関連

### 5.1 権限チェックでの ID 使用

```typescript
// 現在のパターン（要統一）
async function checkAdminAccess(
  supabase: SupabaseClient,
  userId: number,        // ⚠️ DB操作時は number
  workspaceId: number,   // ⚠️ DB操作時は number
  systemRole: string
): Promise<{ isAdmin: boolean; error?: string }> {
  // ...
}

// 呼び出し側
const userIdInt = parseInt(userId, 10);  // string → number 変換
const { isAdmin } = await checkAdminAccess(supabase, userIdInt, workspaceId, user.system_role);
```

### 5.2 推奨パターン

```typescript
// API層では number を使用（DB操作のため）
// フロント層では string を使用（一貫性のため）

// API内部での処理
function validateAndParseId(id: string | null, name: string): number {
  if (!id) {
    throw new Error(`${name} is required`);
  }
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error(`${name} is invalid`);
  }
  return parsed;
}
```

---

## 6. マイグレーション時の注意事項

### 6.1 後方互換性

既存のデータには `assigneeId` が設定されていないタスクが存在する。
→ フィルタリング時に `assigneeId` が undefined の場合は全ユーザーで共有として扱う。

```typescript
// lib/server/org-chart-service.ts
const userTasks = tasks.filter(t => {
  if (t.assigneeId) {
    return t.assigneeId === userId;
  }
  // assigneeId が未設定の場合は従来どおり
  return true;
});
```

### 6.2 将来の UUID 移行

将来的に ID を UUID に移行する場合：

```sql
-- マイグレーション例
ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
-- ... 段階的に uuid を主キーに移行
```

この場合、すでに string で統一されていれば移行が容易。

---

## 7. チェックリスト

### 型定義
- [x] `lib/types/database.ts` - Workspace.id を string に（既に string）
- [x] `lib/types/database.ts` - WorkspaceMember.workspaceId を string に（既に string）
- [x] `lib/types/org-chart.ts` - Department.workspaceId を string に ✅
- [x] `lib/types/org-chart.ts` - ReportLine.workspaceId, subordinateId, supervisorId を string に ✅
- [x] `lib/types/org-chart.ts` - VisibilityPolicy.workspaceId を string に ✅
- [x] `lib/contexts/AuthContext.tsx` - AuthUser.workspaceId を string に ✅
- [x] `lib/hooks/useWorkspace.ts` - WorkspaceInfo.workspaceId を string に ✅
- [x] `lib/hooks/useOrgChart.ts` - UseOrgChartResult.workspaceId を string に ✅
- [x] `lib/hooks/useAdminViewModel.ts` - AdminViewModel.workspaceId を string に ✅
- [x] `lib/hooks/useLeads.ts` - Lead.workspaceId を string に ✅
- [x] `lib/hooks/useClients.ts` - Client.workspaceId を string に ✅
- [x] `lib/hooks/useSADashboardViewModel.ts` - 各メソッドの workspaceId を string に ✅
- [x] `lib/server/auth.ts` - SessionInfo.workspaceId を string に ✅

### コンポーネント
- [x] `app/_components/admin/AdminTab.tsx` - Invitation.id, supervisorId, SupervisorOption.userId を string に ✅
- [x] `app/_components/admin/AdminTab.tsx` - InvitationsSection props workspaceId を string に ✅
- [x] `app/_components/admin/AdminTab.tsx` - handleDeactivate の引数を string に ✅
- [x] `app/_components/admin/OrgManagement.tsx` - 各コンポーネント props workspaceId を string に ✅
- [x] `app/_components/admin/OrgManagement.tsx` - selectedSubordinate/selectedSupervisor を string に ✅
- [x] `app/_components/admin/sa-dashboard/WorkspaceMembersModal.tsx` - callback関数 workspaceId を string に ✅
- [x] `app/_components/admin/sa-dashboard/WorkspacesTable.tsx` - onDeleteWorkspace workspaceId を string に ✅
- [x] `app/_components/org-chart/OrgMapNode.tsx` - onReportLineChange の引数を string に ✅
- [x] `app/_components/org-chart/OrgChartMapView.tsx` - handleReportLineChange の引数を string に ✅
- [x] `app/_components/org-chart/OrgChartMapView.tsx` - workspaceId props を string に ✅
- [x] `app/invite/[token]/page.tsx` - InvitationInfo, JoinResult の workspaceId を string に ✅

### API レスポンス
- [x] `/api/auth/session` で userId, workspaceId を String() で返却 ✅
- [x] `/api/org-chart/report-lines` で id, workspaceId, subordinateId, supervisorId を String() で返却 ✅
- [x] `/api/org-chart/departments` で id, workspaceId, parentId を String() で返却 ✅
- [x] `/api/org-chart/visibility-policy` で id, workspaceId を String() で返却 ✅
- [x] `/api/org-chart/members/[id]/assignment` で id, userId, departmentId を String() で返却 ✅
- [x] `/api/invitations` で id, supervisorId を String() で返却 ✅
- [x] `/api/admin/sa-workspace-members` で userId を String() で返却 ✅
- [x] `/api/admin/sa-workspaces` で id を String() で返却 ✅

### 型定義（追加分）
- [x] `lib/hooks/useSADashboardViewModel.ts` - SAWorkspace.id を string に ✅
- [x] `lib/hooks/useReportsViewModel.ts` - generateLocalCSV の wsId を string に ✅

### テスト
- [x] TypeScript コンパイルエラーなし ✅
- [ ] 組織図の表示正常
- [ ] ドラッグ&ドロップ正常
- [ ] メンバー詳細パネル正常

---

## 8. 関連ドキュメント

- [Phase 13.5 Org Chart Runbook](./PHASE13.5-ORG-CHART-RUNBOOK.md)
- [FDC Grand Guide](../FDC-GRAND-GUIDE.md)

---

## 9. 修正履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-11-29 | 1.0 | 初版作成 |
| 2025-11-29 | 1.1 | ID型統一完了、チェックリスト更新 |

### 1.1 での主な修正
- `AdminTab.tsx`: handleDeactivate, InvitationsSection propsをstring型に変更
- `OrgManagement.tsx`: 全コンポーネントのworkspaceIdをstring型に変更、selectedSubordinate/selectedSupervisorのparseInt削除
- `WorkspaceMembersModal.tsx`: callback関数のworkspaceIdをstring型に変更
- `WorkspacesTable.tsx`: onDeleteWorkspaceのworkspaceIdをstring型に変更
- `OrgChartMapView.tsx`: workspaceId propsをstring型に変更
- `useSADashboardViewModel.ts`: SAWorkspace.idをstring型に変更
- `useReportsViewModel.ts`: generateLocalCSVのwsIdをstring型に変更
- `app/api/admin/sa-workspaces/route.ts`: SAWorkspace.idをstring型に変更、レスポンスでString()使用
- `app/invite/[token]/page.tsx`: InvitationInfo, JoinResultのworkspaceIdをstring型に変更

---

**作成日**: 2025-11-29
**最終更新**: 2025-11-29
**ステータス**: ✅ 完了
