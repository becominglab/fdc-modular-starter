# Phase 9.95 ランブック：UI/UXバグ修正 & 機能復旧

> **目的**: Phase 9.92-9.94で発生したUI不具合・API接続エラーを修正し、全タブの正常動作を保証する。
> **実行方式**: 並列worktreeによる同時開発

## 1. 概要

### 1.1 Phase 9.95の位置づけ

| Phase | 内容 | 状態 |
|-------|------|------|
| 9.92 | React移行・型安全性 | ✅ 完了 |
| 9.93 | レガシー隔離・CI自動化 | ✅ 完了 |
| 9.94 | パフォーマンス・UX・品質基盤 | ✅ 完了 |
| **9.95** | **バグ修正・機能復旧** | ✅ 完了 |
| 10 | TODO機能（4象限 × Elastic） | 予定 |

### 1.2 並列実行アーキテクチャ

```
main ─────────────────────────────────────────→
  │
  ├─ worktree-1: ダッシュボード修正
  ├─ worktree-2: ブランド指針タブ修正
  ├─ worktree-3: 既存客管理タブ修正
  ├─ worktree-4: 見込み客追加タブ修正
  ├─ worktree-5: 失注管理タブ修正
  ├─ worktree-6: テンプレート集タブ修正
  ├─ worktree-7: レポートタブ権限修正
  ├─ worktree-8: 管理者タブ修正
  └─ worktree-9: SAタブ修正・試用期間機能
```

## 2. バグ一覧と担当ワークストリーム

### 2.1 ダッシュボードタブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| スキップリンク表示 | 「メインコンテンツへスキップ」がファウンダーダイレクトの上に表示 | 中 |

**修正方針**:
- スキップリンクをvisually-hiddenにし、フォーカス時のみ表示
- WCAG準拠を維持しつつUI整合性を確保

### 2.2 ブランド指針タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| API Error: 500 | タブ表示時にサーバーエラー | 高 |

**修正方針**:
- APIエンドポイントの確認
- workspace_data取得ロジックの修正
- エラーハンドリング強化

### 2.3 既存客管理タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| データ取得失敗 | 「データの取得に失敗しました」表示 | 高 |
| 終了客UI削除 | 従来UIの終了した顧客表示が消失 | 高 |

**修正方針**:
- クライアントデータ取得APIの修正
- 終了客（contract_expired）表示UIの復旧
- 旧UIデザインの完全復元

### 2.4 見込み客追加タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| 追加失敗 | 見込み客の追加に失敗する | 高 |
| 会社名必須 | 会社名は任意項目であるべき | 中 |

**修正方針**:
- バリデーションロジックの修正（会社名任意化）
- 追加API呼び出しのエラーハンドリング
- workspace_data更新処理の確認

### 2.5 失注管理タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| データ取得失敗 | 「データの取得に失敗しました」表示 | 高 |

**修正方針**:
- 失注データ取得ロジックの修正
- leadsデータからLOSTステータスのフィルタリング確認

### 2.6 テンプレート集タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| workspace data取得失敗 | 「Failed to fetch workspace data」エラー | 高 |

**修正方針**:
- workspace_data APIレスポンス確認
- テンプレートデータ構造の検証
- 旧UIデザインの復元

### 2.7 レポートタブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| 権限エラー | SAでログインしても「権限がありません」表示 | 高 |

**修正方針**:
- SA権限チェックロジックの修正
- globalRole判定の確認
- RSCでの権限確認実装

### 2.8 管理者タブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| 不要な完了メッセージ | 「Phase 9.92-12 完了...」表示が残存 | 低 |
| メンバー一覧取得失敗 | ログインユーザーすら表示されない | 高 |
| 監査ログ取得失敗 | 監査ログが表示されない | 中 |

**修正方針**:
- 開発用メッセージの削除
- メンバー取得API修正（最低限ログインユーザー表示）
- 監査ログAPI確認

### 2.9 SAタブ

| 問題 | 詳細 | 優先度 |
|------|------|--------|
| 登録者表示不具合 | 使用者登録一覧が美しく表示されない | 中 |
| 試用期間機能なし | 2週間の試用期間制限がない | 高 |

**修正方針**:
- UIデザイン改善
- 試用期間機能の新規実装
  - `createdAt`からの経過日数表示
  - `TEST`権限による2週間制限
  - 期限切れユーザーの非表示/制限

## 3. 試用期間機能仕様（SAタブ新機能）

### 3.1 データモデル拡張

```typescript
interface User {
  id: string;
  // ... 既存フィールド
  trialStartAt?: Date;      // 試用開始日（= createdAt）
  trialDays: number;        // 試用日数（デフォルト: 14）
  trialStatus: 'active' | 'expired' | 'converted';
}
```

### 3.2 権限制御

| globalRole | 説明 | 試用期間 |
|------------|------|----------|
| `fdc_admin` | SA管理者 | なし |
| `normal` | 通常ユーザー | なし |
| `test` | 試用ユーザー | 14日間 |

### 3.3 試用期限チェック

```typescript
function isTrialExpired(user: User): boolean {
  if (user.globalRole !== 'test') return false;
  const trialStart = new Date(user.createdAt);
  const now = new Date();
  const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
  return daysPassed > 14;
}
```

### 3.4 SA管理画面表示

| カラム | 説明 |
|--------|------|
| ユーザー名 | 表示名 |
| メール | メールアドレス |
| 権限 | fdc_admin / normal / test |
| 登録日 | createdAt |
| 経過日数 | 「5日目」「14日目（期限）」等 |
| ステータス | 試用中 / 期限切れ / 正規 |

## 4. 並列worktree一覧

| worktree | ブランチ | 担当タスク | 状態 |
|----------|----------|-----------|------|
| `elated-moore` | elated-moore | 既存客管理タブ復元 | 🔄 |
| `funny-kepler` | funny-kepler | 見込み客管理タブ復元 | 🔄 |
| `gallant-brahmagupta` | gallant-brahmagupta | ブランド指針タブ復元 | 🔄 |
| `musing-bardeen` | musing-bardeen | テンプレート集タブ復元 | ✅ |
| `hungry-visvesvaraya` | hungry-visvesvaraya | MVV・OKRタブ復元 | ✅ |
| `optimistic-hamilton` | optimistic-hamilton | ZOOM会議タブ復元 | ✅ |
| `focused-haslett` | focused-haslett | 設定・管理者・SAタブ追加 | ✅ |
| `eager-tesla` | eager-tesla | 失注管理タブ新規作成 | 🔄 |
| `frosty-aryabhata` | frosty-aryabhata | UX向上・WCAG対応 | ✅ |
| `condescending-cray` | condescending-cray | Phase 10準備・型安全性 | ✅ |

## 5. マージ戦略

### 5.1 マージ順序

```
1. 基盤修正（API・権限）
   └─ レポートタブ権限修正
   └─ workspace_data API修正

2. データ取得修正
   └─ ブランド指針タブ
   └─ 既存客管理タブ
   └─ 失注管理タブ
   └─ テンプレート集タブ

3. UI復旧
   └─ 終了客UI復旧
   └─ 見込み客追加バリデーション

4. 管理機能
   └─ 管理者タブ修正
   └─ SAタブ試用期間機能

5. 仕上げ
   └─ ダッシュボードスキップリンク
   └─ 不要メッセージ削除
```

### 5.2 コンフリクト解決方針

- `app/_components/`配下は機能別に分離されているため低リスク
- `lib/hooks/`は共通ロジックのため慎重にマージ
- `app/api/`はエンドポイント別のため並列マージ可能

## 6. 品質ゲート

### 6.1 Phase 9.95 完了条件

| 指標 | 目標 |
|------|------|
| 全タブ正常表示 | 9タブすべてエラーなし |
| API接続 | 500エラー 0件 |
| 権限制御 | SA/通常ユーザー適切に分離 |
| 試用期間機能 | TEST権限で14日制限動作 |
| 型チェック | `tsc --noEmit` パス |
| ビルド | `npm run build` 成功 |

### 6.2 テスト項目

- [x] ダッシュボード: スキップリンクがフォーカス時のみ表示
- [x] ブランド指針: データ正常表示
- [x] 既存客管理: 終了客を含む全データ表示
- [x] 見込み客追加: 会社名なしで追加成功
- [x] 失注管理: 失注データ正常表示
- [x] テンプレート集: 全テンプレート表示
- [x] レポート: SAでアクセス可能
- [x] 管理者: メンバー・監査ログ表示
- [x] SA: 試用期間付きユーザー一覧表示

## 7. スケジュール

| 日付 | マイルストーン |
|------|---------------|
| Day 1 | 並列worktree開始、基盤修正 |
| Day 2 | データ取得修正、UI復旧 |
| Day 3 | 管理機能・試用期間実装 |
| Day 4 | マージ・統合テスト |
| Day 5 | Phase 9.95完了 → Phase 10開始 |

## 8. 完了サマリー

### 8.1 マージ済みブランチ

| ブランチ | 内容 | マージ日 |
|----------|------|----------|
| `strange-einstein` | UI/APIバグ修正（ダッシュボード、ブランド指針、既存客管理） | 2025-11-26 |
| `serene-moore` | レポート/管理者/SAタブ修正、試用期間機能 | 2025-11-26 |

### 8.2 追加されたファイル

- `app/api/admin/users/account-type/route.ts` - アカウント種別変更API
- `app/api/audit-logs/route.ts` - 監査ログAPI
- `app/api/workspaces/[workspaceId]/members/route.ts` - メンバー一覧API
- `lib/hooks/useSADashboardViewModel.ts` - SA管理画面ViewModel
- `migrations/011-add-account-type.sql` - account_type列追加マイグレーション

### 8.3 修正されたファイル

- `app/_components/clients/ClientsManagement.tsx` - 契約満了先UI復活
- `app/_components/admin/AdminTab.tsx` - 完了メッセージ削除
- `app/_components/admin/SADashboard.tsx` - 経過日数・ステータス表示
- `app/api/workspaces/[workspaceId]/data/route.ts` - JSONB/Base64両対応
- `app/globals.css` - スキップリンクCSS追加
- `lib/hooks/useReportsViewModel.ts` - 権限チェック修正

---

**作成日**: 2025-11-26
**最終更新**: 2025-11-26
**ステータス**: ✅ 完了
