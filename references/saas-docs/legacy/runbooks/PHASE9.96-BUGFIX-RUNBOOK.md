# Phase 9.96 ランブック：残存バグ修正（9項目）

> **ステータス**: ✅ 完了（Phase 9.97 で権限体系が刷新されました）
>
> ⚠️ **注意**: このドキュメントは Phase 9.96 時点の履歴です。
> 権限体系は Phase 9.97 で以下のように変更されました：
> - `globalRole: 'fdc_admin'` → `system_role: 'SA'`
> - `workspaceRole: 'owner/admin/member'` → `role: 'OWNER/ADMIN/MEMBER'`
> 最新の権限仕様は `docs/runbooks/PHASE9.97-BUGFIX-RUNBOOK.md` を参照してください。

> **目的**: Phase 9.95で未解決の9つのバグを完全修正し、Phase 10開始条件を満たす。
> **実行方式**: 3並列worktreeによる同時開発

## 1. 概要

### 1.1 Phase 9.96の位置づけ

| Phase | 内容 | 状態 |
|-------|------|------|
| 9.92 | React移行・型安全性 | ✅ 完了 |
| 9.93 | レガシー隔離・CI自動化 | ✅ 完了 |
| 9.94 | パフォーマンス・UX・品質基盤 | ✅ 完了 |
| 9.95 | バグ修正・機能復旧（第1弾） | ✅ 完了 |
| **9.96** | **残存バグ修正（第2弾）** | ✅ 完了 |
| 10 | TODO機能（4象限 × Elastic） | 予定 |

### 1.2 並列実行アーキテクチャ

```
main ─────────────────────────────────────────→
  │
  ├─ WS-A: UI/デザイン修正（3項目）
  │   ├─ #1 ダッシュボード スキップリンク
  │   ├─ #2 ログイン画面デザイン
  │   └─ #5 設定タブ 完了メッセージ削除
  │
  ├─ WS-B: データ取得修正（3項目）
  │   ├─ #3 既存客管理 契約満了先表示
  │   ├─ #4 見込み客追加 失敗修正
  │   └─ #6 テンプレート集 workspace data取得
  │
  └─ WS-C: 権限・管理機能修正（3項目）
      ├─ #7 レポートタブ SA権限
      ├─ #8 管理者タブ メンバー・監査ログ
      └─ #9 SAタブ 試用期間機能
```

## 2. バグ詳細と修正方針

### 2.1 WS-A: UI/デザイン修正

#### #1 ダッシュボードタブ - スキップリンク表示

**問題**: 「メインコンテンツへスキップ」がファウンダーダイレクトの上に常時表示

**修正方針**:
```css
/* app/globals.css */
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-link:focus {
  position: fixed;
  top: 10px;
  left: 10px;
  width: auto;
  height: auto;
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  z-index: 9999;
  border-radius: 4px;
}
```

**対象ファイル**:
- `app/globals.css`
- `app/layout.tsx`（スキップリンクのクラス確認）

#### #2 ログイン画面デザイン

**問題**: 現在の紫色デザインが美しくない。旧UIのデザインを採用すべき

**修正方針**:
- `archive/phase9-legacy-js/login.html` のデザインを参照
- グラデーション、カラースキーム、レイアウトを旧UIに合わせる

**対象ファイル**:
- `app/login/page.tsx`
- `app/globals.css`（ログイン用スタイル追加）

#### #5 設定タブ - 完了メッセージ削除

**問題**: 「✓ Phase 9.92-11 完了」メッセージと枠が表示されている

**修正方針**:
- 該当の完了表示JSXを削除

**対象ファイル**:
- `app/_components/settings/SettingsTab.tsx`

---

### 2.2 WS-B: データ取得修正

#### #3 既存客管理タブ - 契約満了先表示

**問題**: 契約満了先セクションが表示されない

**修正方針**:
- `ClientsManagement.tsx` の契約満了先フィルタリング確認
- `contract_expired` ステータスの正しいフィルタリング
- 旧UI互換のセクション表示復活

**対象ファイル**:
- `app/_components/clients/ClientsManagement.tsx`
- `lib/hooks/useClients.ts`

#### #4 見込み客追加タブ - 追加失敗

**問題**: 見込み客の追加に失敗する

**修正方針**:
- `useLeads.ts` の `addLead` 関数確認
- workspace_data への保存ロジック確認
- バリデーション（会社名任意化）確認

**対象ファイル**:
- `app/_components/prospects/ProspectsManagement.tsx`
- `lib/hooks/useLeads.ts`
- `app/api/workspaces/[workspaceId]/data/route.ts`

#### #6 テンプレート集タブ - workspace data取得失敗

**問題**: 「Failed to fetch workspace data」エラー

**修正方針**:
- `useTemplatesViewModel.ts` のAPI呼び出し確認
- workspace_data API レスポンス形式確認
- エラーハンドリング強化

**対象ファイル**:
- `lib/hooks/useTemplatesViewModel.ts`
- `app/_components/templates/TemplatesTab.tsx`

---

### 2.3 WS-C: 権限・管理機能修正

#### #7 レポートタブ - SA権限エラー

**問題**: SAでログインしても「レポートを閲覧する権限がありません」と表示

**修正方針**:
- `useReportsViewModel.ts` の権限チェック修正
- `globalRole === 'fdc_admin'` の判定追加
- DBロールとの整合性確認

**対象ファイル**:
- `lib/hooks/useReportsViewModel.ts`
- `app/_components/reports/ReportsTab.tsx`

#### #8 管理者タブ - メンバー・監査ログ取得失敗

**問題**:
- 「アクセス権限がありません」表示
- 「✓ Phase 9.92-12 完了」メッセージが残存
- メンバー一覧・監査ログの取得失敗
- ログイン中ユーザーすら表示されない

**修正方針**:
- 完了メッセージの削除
- メンバー一覧APIの修正（最低限ログインユーザーを表示）
- 監査ログAPIの修正
- 権限チェックの緩和（管理者タブは閲覧可能に）

**対象ファイル**:
- `app/_components/admin/AdminTab.tsx`
- `app/api/workspaces/[workspaceId]/members/route.ts`
- `app/api/audit-logs/route.ts`
- `lib/hooks/useAdminViewModel.ts`

#### #9 SAタブ - 表示・試用期間機能

**問題**:
- SAタブが表示されない
- ユーザー一覧が美しくない
- 試用期間（14日）機能がない

**修正方針**:
1. SAタブ表示条件の確認（globalRole === 'fdc_admin'）
2. ユーザー一覧UIの改善
3. 試用期間機能の実装：

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  accountType: 'ACTIVE' | 'TEST';  // TEST = 試用ユーザー
}

// 経過日数計算
function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

// 試用期限チェック（14日）
function isTrialExpired(user: User): boolean {
  if (user.accountType !== 'TEST') return false;
  return getDaysSinceCreation(user.createdAt) > 14;
}
```

**対象ファイル**:
- `app/_components/admin/SADashboard.tsx`
- `lib/hooks/useSADashboardViewModel.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/account-type/route.ts`

## 3. 品質ゲート

### 3.1 Phase 9.96 完了条件

| 指標 | 目標 |
|------|------|
| 全9項目修正完了 | ✅ |
| 型チェック | `tsc --noEmit` パス |
| ビルド | `npm run build` 成功 |
| 全タブ正常表示 | エラー 0件 |

### 3.2 テスト項目

- [x] #1 スキップリンクがフォーカス時のみ表示
- [x] #2 ログイン画面が旧UIデザイン（青緑グラデーション）
- [x] #3 契約満了先セクション表示
- [x] #4 見込み客追加成功（会社名任意）
- [x] #5 設定タブ 完了メッセージなし
- [x] #6 テンプレート集 正常表示
- [x] #7 SA権限でレポート閲覧可能
- [x] #8 管理者タブでメンバー・監査ログ表示
- [x] #9 SAタブで試用期間付きユーザー一覧表示

## 4. 完了サマリー

### 4.1 マージされたブランチ

| ブランチ | 担当 | コミット |
|----------|------|----------|
| hopeful-jackson | WS-A | `d98fa3c` UI/デザイン修正3件 |
| busy-dhawan | WS-B | `bbf1f1b` データ取得・保存ロジック修正 |
| flamboyant-elgamal | WS-C | `182259f` レポート/管理者タブ権限修正 |

### 4.2 修正されたファイル

**WS-A（UI/デザイン）**:
- `app/globals.css` - スキップリンク :focus スタイル
- `app/login/page.tsx` - 青緑グラデーション
- `app/_components/settings/SettingsTab.tsx` - 完了メッセージ削除

**WS-B（データ取得）**:
- `lib/hooks/useClientsViewModel.ts` - 契約満了先フィルタリング
- `lib/hooks/useLeads.ts` - addLead関数修正
- `lib/hooks/useTemplatesViewModel.ts` - workspace data取得修正

**WS-C（権限・管理機能）**:
- `lib/hooks/useReportsViewModel.ts` - fdc_admin判定追加
- `lib/hooks/useAdminViewModel.ts` - メンバー/監査ログ取得
- `app/api/audit-logs/route.ts` - Supabase join型修正
- `lib/hooks/useSADashboardViewModel.ts` - AccountType/経過日数

### 4.3 ビルド結果

- 型チェック: ✅ パス
- ビルド: ✅ 成功
- Dashboard First Load JS: 145KB

---

**作成日**: 2025-11-26
**最終更新**: 2025-11-26
**ステータス**: ✅ 完了
