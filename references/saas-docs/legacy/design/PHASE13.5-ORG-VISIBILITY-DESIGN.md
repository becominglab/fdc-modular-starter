# 組織図 可視性・権限設計書

**Phase 13.5 拡張**: 組織構造管理 + 階層型可視性制御
**作成日**: 2025-11-29
**Status**: Draft

---

## 1. 概要

### 1.1 課題
- 現状: ワークスペースメンバー全員がフラットに表示される
- 必要: 部署階層に基づく可視性制御（上から下は見える、下から上は制限）

### 1.2 設計原則
1. **上位者は下位者を見れる**（部下の進捗把握）
2. **下位者は設定範囲まで上位を見れる**（直属上長まで等）
3. **同階層は同部署内のみ見れる**（プライバシー保護）
4. **OWNER/ADMINは全員見れる**（管理上の必要性）

---

## 2. データモデル拡張

### 2.1 既存テーブル（実装済み）
```sql
-- 部署マスタ
departments (
  id, workspace_id, parent_id, name, sort_order
)

-- メンバー部署所属
member_department_assignments (
  user_id, department_id, is_primary, role, sort_order
)
```

### 2.2 新規追加: 階層関係テーブル
```sql
-- メンバー間の上下関係（レポートライン）
CREATE TABLE member_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  subordinate_id INTEGER NOT NULL REFERENCES users(id),  -- 部下
  supervisor_id INTEGER NOT NULL REFERENCES users(id),   -- 上司
  is_primary BOOLEAN DEFAULT TRUE,                       -- 主レポートライン
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subordinate_id, supervisor_id)
);

-- インデックス
CREATE INDEX idx_report_lines_subordinate ON member_report_lines(subordinate_id);
CREATE INDEX idx_report_lines_supervisor ON member_report_lines(supervisor_id);
```

### 2.3 可視性設定テーブル
```sql
-- ワークスペース単位の可視性ポリシー
CREATE TABLE org_visibility_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) UNIQUE,

  -- 下位者が上位を見れる範囲
  upward_visibility_level INTEGER DEFAULT 1,  -- 0=なし, 1=直属のみ, 2=2階層上まで, -1=全て

  -- 同階層の可視性
  peer_visibility VARCHAR(20) DEFAULT 'same_dept',  -- 'none', 'same_dept', 'all'

  -- 部署詳細の公開レベル
  dept_detail_visibility VARCHAR(20) DEFAULT 'members_only',  -- 'public', 'members_only', 'admins_only'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. 可視性ルール詳細

### 3.1 基本ルール

| 閲覧者 | 対象 | 可視性 |
|--------|------|--------|
| OWNER/ADMIN | 全員 | ○ 常に見れる |
| 上司 | 直属部下 | ○ 常に見れる |
| 上司 | 部下の部下（孫） | ○ 常に見れる |
| 部下 | 直属上司 | △ 設定次第（デフォルト: ○） |
| 部下 | 上司の上司 | △ 設定次第（デフォルト: ×） |
| 同僚 | 同部署メンバー | △ 設定次第（デフォルト: ○） |
| 同僚 | 他部署メンバー | × 見れない |

### 3.2 可視性レベル設定

```typescript
interface VisibilityPolicy {
  // 上方向の可視性（部下→上司）
  upwardVisibilityLevel: number;
  // 0: 見れない
  // 1: 直属上司のみ（デフォルト）
  // 2: 2階層上まで
  // -1: 全上位者

  // 同階層の可視性
  peerVisibility: 'none' | 'same_dept' | 'all';
  // none: 見れない
  // same_dept: 同部署のみ（デフォルト）
  // all: 全員
}
```

### 3.3 可視性判定ロジック

```typescript
function canViewMember(
  viewer: Member,
  target: Member,
  policy: VisibilityPolicy
): boolean {
  // 1. 自分自身は常に見れる
  if (viewer.id === target.id) return true;

  // 2. OWNER/ADMINは全員見れる
  if (viewer.workspaceRole === 'OWNER' || viewer.workspaceRole === 'ADMIN') {
    return true;
  }

  // 3. 上司は部下を見れる（再帰的に）
  if (isSubordinate(target, viewer)) return true;

  // 4. 部下は上司を設定範囲まで見れる
  if (isSupervisor(target, viewer)) {
    const distance = getSupervisorDistance(viewer, target);
    if (policy.upwardVisibilityLevel === -1) return true;
    if (distance <= policy.upwardVisibilityLevel) return true;
    return false;
  }

  // 5. 同階層の可視性
  if (policy.peerVisibility === 'all') return true;
  if (policy.peerVisibility === 'same_dept') {
    return isSameDepartment(viewer, target);
  }

  return false;
}
```

---

## 4. UI設計

### 4.1 管理者設定画面（新規）

**場所**: 管理者設定タブ > 組織管理

```
┌─────────────────────────────────────────────────────────┐
│ 組織管理                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [部署管理] [メンバー配置] [可視性設定]  ← サブタブ        │
│                                                          │
│ ┌─ 部署管理 ─────────────────────────────────────────┐  │
│ │                                                      │  │
│ │  📁 会社                                             │  │
│ │  ├── 📁 営業部        [編集] [削除]                  │  │
│ │  │   ├── 📁 営業1課                                 │  │
│ │  │   └── 📁 営業2課                                 │  │
│ │  ├── 📁 開発部        [編集] [削除]                  │  │
│ │  │   ├── 📁 フロントエンド                          │  │
│ │  │   └── 📁 バックエンド                            │  │
│ │  └── 📁 管理部        [編集] [削除]                  │  │
│ │                                                      │  │
│ │  [+ 部署を追加]                                       │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 メンバー配置画面

```
┌─────────────────────────────────────────────────────────┐
│ メンバー配置                                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─ 営業部 ──────────────────────────────────────────┐   │
│ │                                                     │   │
│ │  👤 山田太郎（部長）     [上司設定] [部署変更]        │   │
│ │  ↓ レポートライン                                   │   │
│ │  ├── 👤 佐藤花子（課長）                            │   │
│ │  │   ├── 👤 鈴木一郎                               │   │
│ │  │   └── 👤 田中美咲                               │   │
│ │  └── 👤 高橋健太（課長）                            │   │
│ │      └── 👤 伊藤真理                               │   │
│ │                                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ 未配置メンバー ────────────────────────────────────┐  │
│ │  👤 新入社員A   [ドラッグして配置]                    │  │
│ │  👤 新入社員B   [ドラッグして配置]                    │  │
│ └─────────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.3 可視性設定画面

```
┌─────────────────────────────────────────────────────────┐
│ 可視性設定                                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 上位者の可視範囲                                          │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ ◉ 直属上司のみ見れる                                  │  │
│ │ ○ 2階層上まで見れる                                   │  │
│ │ ○ 全上位者を見れる                                    │  │
│ │ ○ 上位者は見れない                                    │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ 同僚の可視範囲                                            │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ ◉ 同じ部署のメンバーのみ見れる                         │  │
│ │ ○ 全メンバーを見れる                                   │  │
│ │ ○ 同僚は見れない                                      │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ プレビュー: 「鈴木一郎」から見た組織図                      │
│ ┌─────────────────────────────────────────────────────┐  │
│ │  👤 佐藤花子（直属上司）                               │  │
│ │  ├── 👤 鈴木一郎（自分）                              │  │
│ │  └── 👤 田中美咲（同僚）                              │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│                              [保存]                       │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 組織図タブの変更

### 5.1 可視性適用後の表示

**管理者の場合（全員見える）**:
```
📁 会社
├── 📁 営業部
│   ├── 👤 山田太郎（部長）      85% 順調
│   ├── 👤 佐藤花子（課長）      72% 要注意
│   │   ├── 👤 鈴木一郎          90% 順調
│   │   └── 👤 田中美咲          45% 遅延
│   └── 👤 高橋健太（課長）      80% 順調
└── 📁 開発部
    └── ...
```

**一般メンバー（鈴木一郎）の場合**:
```
👤 佐藤花子（直属上司）   72% 要注意
├── 👤 鈴木一郎（自分）   90% 順調
└── 👤 田中美咲（同僚）   45% 遅延
```

### 5.2 制限された情報の表示

見れないメンバーの情報は完全に非表示（存在も見えない）

---

## 6. 実装ステップ

### Phase 1: 基盤（優先）
1. [ ] `member_report_lines` テーブル追加
2. [ ] `org_visibility_policies` テーブル追加
3. [ ] 可視性判定ロジック実装
4. [ ] API に可視性フィルタ適用

### Phase 2: 管理UI
5. [ ] 管理者設定タブに「組織管理」サブタブ追加
6. [ ] 部署管理画面実装
7. [ ] メンバー配置画面実装（レポートライン設定）
8. [ ] 可視性設定画面実装

### Phase 3: 組織図タブ改善
9. [ ] 可視性に基づくフィルタリング
10. [ ] 自分の位置をハイライト
11. [ ] レポートラインの視覚化

---

## 7. API変更

### 7.1 組織図データ取得（変更）

```typescript
// GET /api/org-chart?workspaceId=xxx
// 変更: 閲覧者の権限に基づいてフィルタリング

interface OrgChartResponse {
  rootNodes: OrgNode[];       // 可視範囲のみ
  myPosition: {               // 新規: 自分の位置情報
    memberId: string;
    supervisors: string[];    // 上司のID一覧
    subordinates: string[];   // 部下のID一覧
  };
  meta: {
    totalMembers: number;     // 可視メンバー数
    totalInWorkspace: number; // ワークスペース全体の人数
    visibilityLevel: string;  // 適用された可視性レベル
  };
}
```

### 7.2 新規API

```typescript
// 部署管理
GET    /api/org-chart/departments
POST   /api/org-chart/departments
PUT    /api/org-chart/departments/:id
DELETE /api/org-chart/departments/:id

// レポートライン管理
GET    /api/org-chart/report-lines
POST   /api/org-chart/report-lines
DELETE /api/org-chart/report-lines/:id

// 可視性設定
GET    /api/org-chart/visibility-policy
PUT    /api/org-chart/visibility-policy

// メンバー配置
PUT    /api/org-chart/members/:id/assignment
```

---

## 8. セキュリティ考慮

### 8.1 RLSポリシー
- `member_report_lines`: OWNER/ADMINのみ変更可能
- `org_visibility_policies`: OWNER/ADMINのみ変更可能
- API側で可視性フィルタを必ず適用

### 8.2 データ漏洩防止
- 見れないメンバーのIDも返さない
- 集計情報も可視範囲のみで計算

---

## 9. 次のアクション

この設計で進めてよいか確認の上、Phase 1（基盤）から実装開始。

**質問事項**:
1. デフォルトの可視性設定は「直属上司のみ + 同部署」でOK？
2. 部署なしのメンバーはどう扱う？（全員見える / 管理者のみ見える）
3. レポートラインは複数設定可能にする？（マトリクス組織対応）
