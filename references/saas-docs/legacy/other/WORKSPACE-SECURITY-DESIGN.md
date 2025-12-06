# WORKSPACE-SECURITY-DESIGN.md
FDC Workspace & セキュリティ設計書（v2.0）

> **⚠️ このドキュメントはアーカイブされています**
>
> **アーカイブ日**: 2025-11-16
> **理由**: Phase 7-12 完了により実装が完了。設計の詳細は以下のドキュメントに統合されました。
>
> - セキュリティポリシー → [`../SECURITY.md`](../SECURITY.md)
> - RLS ポリシー → [`../RLS-POLICY-GUIDE.md`](../RLS-POLICY-GUIDE.md)
>
> このドキュメントは参考資料として保管されています。最新の情報は上記のドキュメントを参照してください。

---

## 1. 目的と現状

- ✅ FDCを「個人利用ツール」から「組織単位の業務基盤」へ進化（完了）
- ✅ Workspace（会社）ごとのデータ分離と、3ロール（EXEC/MANAGER/MEMBER）によるRBACを実現（完了）
- ✅ 完全サーバー保存＋Row Level Security (RLS) によるセキュリティ強化（完了）
- ✅ 監査ログによる操作履歴の記録（完了）
- ✅ レート制限・XSS/CSRF対策の実装（完了）

**Phase 7-12 完了状況:**
本書で定義した設計は Phase 7-12 STEP4.9 で完全実装されました。

本書は `FDC-GRAND-GUIDE.md` の詳細設計版です。

---

## 2. Workspace モデル

### 2.1 定義

- Workspace = 1つの企業または組織単位。
- 主キー：`workspace_id`（UUID推奨）
- 各ユーザーは1つ以上のWorkspaceに所属可能。

### 2.2 DBレイヤ

主要テーブル（例）：
- `workspaces`
- `users`
- `workspace_members`（user_id, workspace_id, role）
- `leads`, `clients`, `templates`, `meetings` 等すべてに `workspace_id` を付与。

原則：
- すべてのSELECT/UPDATEは `workspace_id` を条件に含める。
- 他Workspaceのデータには論理的にアクセス不可能な設計とする。

---

## 3. RBAC（Role-Based Access Control）

### 3.1 ロール（2階層実装完了）

#### グローバルロール（users テーブル）
- `fdc_admin`: システム全体の管理者（全ワークスペースにアクセス可能）
- `normal`: 通常ユーザー（所属ワークスペースのみアクセス可能）

#### ワークスペースロール（workspace_members テーブル）
- `owner`: Workspace全体管理者（削除含むすべての権限）
- `admin`: メンバー管理、データ編集
- `member`: データ閲覧・編集
- `viewer`: データ閲覧のみ

#### UIロール（クライアント側のみ）
- `EXEC`: 経営層・全体管理者
- `MANAGER`: チーム・案件の運用責任者
- `MEMBER`: 一般メンバー

### 3.2 ロール別権限マトリクス（実装完了）

| 機能              | EXEC       | MANAGER            | MEMBER                  |
|-------------------|-----------|--------------------|-------------------------|
| Dashboard表示     | R/W       | R/W                | R                       |
| MVV/Brand編集     | R/W       | R（必要なら一部）  | R                       |
| Leads/Clients閲覧 | R/W       | R/W                | 自分担当のみ R/W or R   |
| Templates管理     | R/W       | R/W                | 利用のみ                |
| Reports閲覧       | R（全体）  | R（自チーム）      | R（個人）               |
| Cross-WS Reports  | R         | アクセス不可       | アクセス不可           |
| Settings          | R/W       | 一部閲覧           | アクセス不可           |
| Admin（WS管理）   | R/W       | アクセス不可       | アクセス不可           |

実装状況：
- ✅ `js/core/auth.ts` に `canViewTab`, `canEditLeads`, `canAccessAdmin`, `canViewReports`, `canViewCrossWorkspaceReports` 等を実装済み
- ✅ 各タブは `auth.ts` の関数を利用（ロール条件を直書きしない）
- ✅ `api/_lib/auth.ts` で `assertWorkspaceAccess()` による認可チェック実装済み

---

## 4. クライアント実装方針

### 4.1 state構造（実装完了）

`js/core/state.ts` に実装済み：

```typescript
// グローバルロール
type GlobalRole = 'fdc_admin' | 'normal';

// UIロール
type UserRole = 'EXEC' | 'MANAGER' | 'MEMBER';

// 現在のユーザー情報
interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  globalRole: GlobalRole;
  workspaceId: string;
}

// アプリケーション状態
interface AppState {
  currentUser: CurrentUser | null;
  currentWorkspaceId: string;
  // ... その他のフィールド
}
```

### 4.2 権限ユーティリティ（実装完了）

`js/core/auth.ts` で実装済み：

**タブアクセス制御:**
- ✅ `canAccessTab(tabId, user)` - タブへのアクセス権限
- ✅ `canEditTab(tabId, user)` - タブへの編集権限
- ✅ `getTabAccessLevel(tabId, user)` - アクセスレベル取得

**機能別権限:**
- ✅ `canEditLeads(user)` - リード編集権限
- ✅ `canEditTemplates(user)` - テンプレート編集権限
- ✅ `canManageWorkspace(user)` - ワークスペース管理権限
- ✅ `canViewReports(user)` - レポート閲覧権限
- ✅ `canViewCrossWorkspaceReports(user)` - Cross-Workspaceレポート閲覧権限
- ✅ `canExportReports(user)` - レポートエクスポート権限

**ロール判定ヘルパー:**
- ✅ `isExec(user)` - EXEC判定
- ✅ `isManager(user)` - MANAGER判定
- ✅ `isMember(user)` - MEMBER判定
- ✅ `isAdmin(user)` - 管理者判定

**個別リソース権限:**
- ✅ `canEditLead(leadId, user)` - 個別リード編集権限
- ✅ `canViewClient(clientId, user)` - 個別クライアント閲覧権限

---

## 5. データ保存と暗号化

### 5.1 実装状況（Phase 7-12 完了）

**サーバー側実装:**
- ✅ 業務データはサーバー保存（workspace_data テーブル）
- ✅ Vercel Postgres によるデータ永続化
- ✅ Row Level Security (RLS) によるデータベースレベルのアクセス制御
- ✅ 監査ログ（audit_logs テーブル）による操作履歴記録

**クライアント側:**
- ✅ AppData はサーバーから取得（localStorage はキャッシュとして使用）
- ✅ UI状態や個人設定は localStorage に保存（平文）

**セキュリティ対策:**
- ✅ HTTPS 通信（TLS 1.2+）
- ✅ Google OAuth 2.0 による認証
- ✅ ID トークン検証（Google tokeninfo API）
- ✅ レート制限によるDDoS攻撃対策
- ✅ XSS/CSRF/SQL Injection 対策

### 5.2 監査ログ（実装済み）

すべての重要な操作を `audit_logs` テーブルに記録：

**ログ対象操作:**
- ✅ ユーザーのログイン・ログアウト
- ✅ ワークスペースの作成・削除
- ✅ データの作成・更新・削除
- ✅ ロール変更
- ✅ AI 解析の実行
- ✅ レポートのエクスポート

**ログフォーマット:**
```typescript
{
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  action: string; // 'analyze_success', 'member_added', etc.
  resourceType: string; // 'ai_analysis', 'workspace_member', etc.
  resourceId: string | null;
  details: any; // 操作の詳細情報（JSON）
  createdAt: Date;
}
```

**API エンドポイント:**
- ✅ `GET /api/audit-logs?workspaceId={id}&limit={n}&offset={m}`

### 5.3 将来の拡張候補

1. ⏳ localStorageの暗号化キャッシュ化（機密情報の漏洩リスク低減）
2. ⏳ Workspaceごとの暗号鍵分離
3. ⏳ データのエンドツーエンド暗号化
4. ⏳ 2要素認証（2FA）の実装

---

## 6. 実装フェーズ指針と完了状況

本設計に基づく実装は Phase 7-1 から Phase 7-12 STEP4.9 まで完了しました。

### 実装完了フェーズ一覧

**Phase 7-1 ~ 7-3: 基盤実装**
- ✅ Google OAuth 認証
- ✅ データベーススキーマ構築（users, workspaces, workspace_members, workspace_data）
- ✅ 基本的な認可チェック

**Phase 7-4 ~ 7-7: Workspace管理**
- ✅ Workspace CRUD API
- ✅ Workspace データ保存・取得 API
- ✅ RLS ポリシー実装

**Phase 7-8 ~ 7-9: RBAC実装**
- ✅ ロール管理 API
- ✅ クライアント側権限チェック（`js/core/auth.ts`）
- ✅ サーバー側権限チェック（`api/_lib/auth.ts`）

**Phase 7-10: メンバー管理・監査ログ**
- ✅ メンバー管理 API（追加・削除・ロール変更）
- ✅ 監査ログ API（作成・取得）
- ✅ 管理者UI実装

**Phase 7-11: レポート機能**
- ✅ ロール別レポート生成（EXEC/MANAGER/MEMBER）
- ✅ Cross-Workspace集計（EXEC権限）
- ✅ CSV エクスポート機能

**Phase 7-12 STEP4.8 ~ 4.9: セキュリティハーデニング**
- ✅ レート制限実装
- ✅ XSS/CSRF/SQL Injection 対策
- ✅ RLS セッション変数設定（`setRLSUserId()`）
- ✅ セキュリティ統一化

---

## 7. 変更履歴

### v2.0 (2025-11-14)
- Phase 7-12 STEP4.9 完了に伴う大幅更新
- 実装完了状況を反映（全機能✅マーク追加）
- ロール定義を3階層に整理（グローバル/ワークスペース/UI）
- 権限ユーティリティの実装詳細を追加
- 監査ログの詳細仕様を追加
- 実装フェーズ一覧を追加

### v1.0 (初版)
- Workspace & セキュリティ設計の基本方針を定義
- 3ロール（EXEC/MANAGER/MEMBER）モデルの定義
- データ保存・暗号化の方針策定
