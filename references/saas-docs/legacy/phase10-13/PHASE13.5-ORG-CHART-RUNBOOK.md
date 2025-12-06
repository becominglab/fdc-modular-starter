# Phase 13.5: 組織図機能 Runbook

**Version:** 1.0
**Status:** ✅ 完了（2025-11-29）
**Claude Code 用ランブック**

---

## 1. 概要

Phase 13.5 は組織図機能の実装フェーズ。
ボックス型マップビュー、ドラッグ&ドロップでのレポートライン編集、
招待リンク参加時の自動上司設定を実装。

---

## 2. 完了した機能

### 2.1 組織図マップビュー

| 機能 | 説明 | ファイル |
|------|------|----------|
| ボックス型表示 | 各メンバーをボックスで表示 | `OrgMapNode.tsx` |
| SVG接続線 | ベジェ曲線で親子関係を視覚化 | `OrgChartMapView.tsx` |
| ズーム/パン | マウスホイール・ドラッグで操作 | `useMapInteraction.ts` |
| 階層レイアウト | 自動的に階層配置を計算 | `useMapLayout.ts` |
| コントロールパネル | ズームイン/アウト/リセット/フィット | `MapControls.tsx` |

### 2.2 ドラッグ&ドロップ編集

| 機能 | 説明 | 権限 |
|------|------|------|
| ノードドラッグ | メンバーノードをドラッグ可能 | OWNER/ADMIN/SA |
| ドロップで上司変更 | 別のメンバーにドロップで上司変更 | OWNER/ADMIN/SA |
| 視覚的フィードバック | ドラッグオーバー時に緑色ハイライト | - |
| 更新中表示 | API呼び出し中はオーバーレイ表示 | - |

### 2.3 招待リンク自動上司設定

| 機能 | 説明 |
|------|------|
| supervisorId指定あり | 指定された上司をそのまま使用 |
| supervisorId未指定 | ワークスペースのOWNERを自動取得し上司に設定 |
| 自分自身チェック | 自分自身が上司になる場合はスキップ |

---

## 3. 実装ファイル一覧

### 3.1 型定義

```
lib/types/org-chart.ts
├── OrgNode              # 組織ノード（メンバー/部署）
├── MemberNode           # メンバーノード
├── DepartmentNode       # 部署ノード
├── NodePosition         # ノード位置情報
├── OrgChartViewType     # 表示タイプ（map/tree/card/table）
├── OKRStatus            # OKR進捗ステータス
├── OrgChartResponse     # API レスポンス型
├── isMemberNode()       # 型ガード
└── getStatusColor()     # ステータス色取得
```

### 3.2 Hooks

```
lib/hooks/
├── useOrgChart.ts       # 組織図データ取得・フィルタ・管理者判定
├── useMapLayout.ts      # 階層レイアウト計算（LAYOUT_CONFIG）
└── useMapInteraction.ts # ズーム/パン/タッチ操作
```

### 3.3 コンポーネント

```
app/_components/org-chart/
├── OrgChartTab.tsx          # タブコンテナ（マップ/ツリー/カード/テーブル切替）
├── OrgChartMapView.tsx      # マップビュー本体（D&D統合）
├── OrgMapNode.tsx           # ノードボックス（D&Dイベント処理）
├── OrgTreeNode.tsx          # ツリー表示
├── MapControls.tsx          # ズームコントロールパネル
├── MemberDetailPanel.tsx    # メンバー詳細サイドパネル
└── OrgChartTab.module.css   # スタイル
```

### 3.4 API

```
app/api/org-chart/
├── route.ts                           # GET: 組織図データ取得
├── report-lines/route.ts              # POST/DELETE: レポートラインCRUD
└── members/[id]/assignment/route.ts   # PUT: 部署配置変更

app/api/invitations/
├── route.ts                           # GET/POST/DELETE: 招待リンクCRUD
└── verify/route.ts                    # POST: 招待リンク検証・参加・自動上司設定
```

---

## 4. DBスキーマ

### 4.1 member_report_lines

```sql
CREATE TABLE member_report_lines (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subordinate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, subordinate_id, supervisor_id)
);
```

### 4.2 departments（オプション）

```sql
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES departments(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 member_department_assignments（オプション）

```sql
CREATE TABLE member_department_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  role TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. 技術的詳細

### 5.1 userId型変換

APIで`userId`は文字列として渡されるが、DBの`user_id`はinteger。
全APIで統一的に`parseInt(userId, 10)`を適用。

```typescript
// 修正パターン
const userIdInt = parseInt(userId, 10);
if (isNaN(userIdInt)) {
  return NextResponse.json({ error: 'userId が無効です' }, { status: 400 });
}
```

**適用ファイル:**
- `app/api/admin/users/route.ts`
- `app/api/admin/sa-workspace-members/route.ts`
- `app/api/invitations/route.ts`
- `app/api/invitations/verify/route.ts`
- `app/api/org-chart/members/[id]/assignment/route.ts`

### 5.2 ドラッグ&ドロップ実装

```typescript
// OrgMapNode.tsx - ドラッグ開始
const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
  e.dataTransfer.setData('text/plain', JSON.stringify({
    memberId: member.memberId,
    userId: member.userId,
    name: member.name,
  }));
  e.dataTransfer.effectAllowed = 'move';
};

// OrgMapNode.tsx - ドロップ処理
const handleDrop = (e: DragEvent<HTMLDivElement>) => {
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  const subordinateIdInt = parseInt(data.userId, 10);
  const supervisorIdInt = parseInt(targetMember.userId, 10);
  onReportLineChange(subordinateIdInt, supervisorIdInt);
};
```

### 5.3 レポートライン変更API呼び出し

```typescript
// OrgChartMapView.tsx
const handleReportLineChange = async (subordinateId: number, newSupervisorId: number) => {
  // 1. 既存レポートライン削除
  await fetch('/api/org-chart/report-lines', {
    method: 'DELETE',
    body: JSON.stringify({ workspaceId, subordinateId }),
  });

  // 2. 新規レポートライン作成
  await fetch('/api/org-chart/report-lines', {
    method: 'POST',
    body: JSON.stringify({
      workspaceId,
      subordinateId,
      supervisorId: newSupervisorId,
      isPrimary: true,
    }),
  });

  // 3. データリフレッシュ
  onRefresh?.();
};
```

### 5.4 招待リンク自動上司設定

```typescript
// app/api/invitations/verify/route.ts
let supervisorId = invitation.supervisor_id;

if (!supervisorId) {
  // OWNERを取得して上司として設定
  const { data: owner } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', invitation.workspace_id)
    .eq('role', 'OWNER')
    .single();

  if (owner) {
    supervisorId = owner.user_id;
  }
}

// 自分自身でなければレポートライン作成
if (supervisorId && supervisorId !== sessionIdInt) {
  await supabase
    .from('member_report_lines')
    .insert({
      workspace_id: invitation.workspace_id,
      subordinate_id: sessionIdInt,
      supervisor_id: supervisorId,
      is_primary: true,
    });
}
```

---

## 6. 関連ドキュメント

- [FDC Grand Guide](../FDC-GRAND-GUIDE.md)
- [Phase 13 Tech Debt Runbook](./PHASE13-TECH-DEBT-RUNBOOK.md)
- [Phase 13.6 Component Split Runbook](./PHASE13.6-COMPONENT-SPLIT-RUNBOOK.md)

---

**作成日**: 2025-11-29
**最終更新**: 2025-11-29
**ステータス**: ✅ 完了
