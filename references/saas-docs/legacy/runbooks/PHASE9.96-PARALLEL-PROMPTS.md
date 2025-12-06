# Phase 9.96 並列作業用プロンプト

> **ステータス**: ✅ 完了（履歴ドキュメント）
>
> ⚠️ **注意**: Phase 9.97 で権限体系が刷新されました。
> 最新の権限仕様は `docs/runbooks/PHASE9.97-BUGFIX-RUNBOOK.md` を参照してください。

3つのターミナルで同時に実行してください。

---

## ターミナル1: WS-A（UI/デザイン修正）

```
Phase 9.96 WS-A を実行して。docs/PHASE9.96-BUGFIX-RUNBOOK.md を参照。

担当タスク3つ：

1. ダッシュボード スキップリンク修正
   - 「メインコンテンツへスキップ」が常時表示されている
   - フォーカス時のみ表示されるようCSSを修正
   - app/globals.css と app/layout.tsx を確認

2. ログイン画面デザイン修正
   - 現在の紫色デザインを旧UIデザインに変更
   - archive/phase9-legacy-js/login.html を参照
   - app/login/page.tsx を修正

3. 設定タブ 完了メッセージ削除
   - 「✓ Phase 9.92-11 完了」メッセージと枠を削除
   - app/_components/settings/SettingsTab.tsx を修正

完了したら型チェックとビルドを確認してコミット。
```

---

## ターミナル2: WS-B（データ取得修正）

```
Phase 9.96 WS-B を実行して。docs/PHASE9.96-BUGFIX-RUNBOOK.md を参照。

担当タスク3つ：

1. 既存客管理タブ 契約満了先表示
   - 契約満了先セクションが表示されない
   - app/_components/clients/ClientsManagement.tsx を確認
   - contract_expired ステータスのフィルタリング修正
   - 旧UIの終了客セクション表示を復活

2. 見込み客追加タブ 追加失敗修正
   - 見込み客の追加に失敗する
   - app/_components/prospects/ProspectsManagement.tsx を確認
   - lib/hooks/useLeads.ts の addLead 関数を確認
   - workspace_data への保存ロジックを修正

3. テンプレート集タブ workspace data取得失敗
   - 「Failed to fetch workspace data」エラーが出る
   - lib/hooks/useTemplatesViewModel.ts を確認
   - API呼び出しとエラーハンドリングを修正

完了したら型チェックとビルドを確認してコミット。
```

---

## ターミナル3: WS-C（権限・管理機能修正）

```
Phase 9.96 WS-C を実行して。docs/PHASE9.96-BUGFIX-RUNBOOK.md を参照。

担当タスク3つ：

1. レポートタブ SA権限修正
   - SAでログインしても「権限がありません」と表示される
   - lib/hooks/useReportsViewModel.ts を確認
   - globalRole === 'fdc_admin' の判定を追加

2. 管理者タブ修正
   - 「アクセス権限がありません」表示を修正
   - 「✓ Phase 9.92-12 完了」メッセージを削除
   - メンバー一覧の取得失敗を修正（最低限ログインユーザーを表示）
   - 監査ログの取得失敗を修正
   - 対象: app/_components/admin/AdminTab.tsx, app/api/workspaces/[workspaceId]/members/route.ts

3. SAタブ 表示・試用期間機能
   - SAタブが表示されない問題を修正
   - ユーザー一覧UIを美しく改善
   - 試用期間機能を実装:
     - accountType: 'ACTIVE' | 'TEST' を追加
     - 登録からの経過日数を表示
     - TEST権限は14日で非表示/制限
   - 対象: app/_components/admin/SADashboard.tsx, lib/hooks/useSADashboardViewModel.ts

完了したら型チェックとビルドを確認してコミット。
```

---

## 全員完了後のマージ

3つのworktreeの作業が完了したら、mainで以下を実行：

```
9.96 完了したよう ランブックを修正し 全てのブランチをmainにマージ コンフリクトも適切に解決して
```

---

## 補足：Claude Codeでの新規worktree開始方法

各ターミナルで `/cost` を入力後、上記プロンプトを貼り付けてください。
Claude Codeが自動で新しいworktreeを作成してブランチを切ります。
