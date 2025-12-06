# PHASE 16-17-18 改善提案実行ランブック v2

## ★ 反映ステータス（2025-12-05 更新）

| セクション | 項目 | ステータス | 備考 |
|-----------|------|----------|------|
| **2.1.1** | ER図のKR直結削除 | ✅ 完了 | Phase 16 ER図を修正済み |
| **2.1.2** | ProgressService命名統一 | ✅ 完了 | Phase 18に集約済み |
| **2.1.3** | kr_action_map_links集約 | ✅ 確認済み | Phase 17で定義、Phase 18で利用（妥当） |
| **2.1.4** | 共通設計決定の重複 | ✅ 完了 | IMPROVEMENT.mdに集約 |
| **2.1.5** | イベント型定義の分散 | ⏸️ 保留 | 実装時に検討 |
| **2.2.1** | task_links制約 | ⏸️ 保留 | DBマイグレーション時に実施 |
| **2.2.2** | 楽観ロック設計統一 | ✅ 完了 | optimisticUpdate()追加済み |
| **2.2.3** | インデックス統一 | ✅ 完了 | Phase 16に記載済み |
| **2.2.4** | ログ系テーブル方針 | ⏸️ 保留 | 実装時に検討 |
| **2.3.1** | API命名統一 | ✅ 確認済み | `/api/workspaces/{id}/...`形式 |
| **2.3.2** | Hook共通インターフェース | ⏸️ 保留 | 実装時に検討 |
| **2.3.3** | ProgressBadge統一 | ⏸️ 保留 | UIリファクタリング時 |
| **2.3.4** | Undo/通知共通化 | ✅ 完了 | UndoSnackbar追加済み |
| **Step 0** | ドキュメント整備 | ✅ 完了 | ER図修正、参照整理 |
| **Step 1** | DBスキーマ統一 | ⏸️ 未着手 | マイグレーション未実施 |
| **Step 2** | ProgressService集約 | ✅ 設計完了 | 実装待ち |
| **Step 3** | API/Hook/UI統一 | ⏸️ 未着手 | 実装待ち |
| **Step 4** | テスト・運用 | ⏸️ 未着手 | 実装後 |

---

## 0. 目的とスコープ

- 対象ドキュメント:
  - `PHASE16-TASK-SYSTEM-V4-RUNBOOK.md`
  - `PHASE17-ACTION-MAP-V2-RUNBOOK.md`
  - `PHASE18-OKR-V2-RUNBOOK.md`
  - 改善提案まとめ: `PHASES-16-17-18-IMPROVEMENT.md`
- 目的:
  - 3 Phase 間で **進捗経路・責務分担・DB スキーマ・API/Hook/UI** を一貫させる。
  - 既存ランブックの内容を崩さず、**矛盾・重複・実装上の迷いポイント** を解消する。
  - 改善提案を「**いつ・誰が・何をやるか**」まで具体化した実行ランブックとして整理する。

---

## 1. 全体方針（共通原則）

- **唯一の進捗経路** を死守する  
  `Task → ActionItem → ActionMap → KeyResult → Objective`
- **責務分担を Phase 単位で固定** する  
  - Phase 16: タスク完了イベントを正しく発火させる（実行層）
  - Phase 17: ActionItem / ActionMap の構造と進捗計算（戦術層）
  - Phase 18: 進捗オーケストレーション & OKR 管理（戦略層）
- **ProgressService を「唯一の進捗ロジックの集約点」にする**  
  - 進捗計算関数や類似ロジックを各所に分散させない。
- **クロスフェーズなテーブル/関数は 1 箇所で定義し、他は参照だけにする**  
  - 例: `kr_action_map_links`, `ProgressService`, 共通イベント型 など。

---

## 2. ランブック横断での改善ポイント一覧

### 2.1 設計・ドキュメント上の不整合

1. **ER 図と設計決定の不一致（KR ↔ Task 直結リンク）**
   - 現状:
     - Phase 16 の ER 図で `okr_key_results ||--o{ task_links` の関連が残っている。
     - 一方で全ランブックの設計決定では **KR 直結型は廃止** としている。
   - 改善方針:
     - ER 図を **ActionMap 経由のみ** に修正し、`okr_key_results` ↔ `task_links` の関連を削除。
     - 「廃止された設計」は別セクション（歴史/背景）に移し、「現行仕様」と混在させない。

2. **ProgressService 周りの命名・責務の重複**
   - 現状:
     - Phase 18 に `ProgressService` クラスと、`calculateProgress.ts` のようなスタンドアロン関数が併記されている。
     - Phase 16 では `propagateProgressUpdate()`, Phase 18 では `propagateProgressFromTask()` など、類似の名前が混在。
   - 改善方針:
     - 進捗伝播の唯一のエントリポイントを `progressService.propagateFromTask(taskId)` に統一。
     - `calculate*` 系の関数はすべて `ProgressService` 内のプライベート/パブリックメソッドとして集約。
     - 旧関数名はランブック内で「旧インターフェース」と明示し、コード側では非推奨にする。

3. **`kr_action_map_links` の定義箇所が複数に分散**
   - 現状:
     - Phase 17 と Phase 18 の両方で `kr_action_map_links` が定義・説明されている。
   - 改善方針:
     - スキーマの **正本** を Phase 18（戦略層）に集約し、Phase 17 では「利用方法と制約」のみ記述。
     - 改修時の手順:
       1. Phase 17 ランブックから `CREATE TABLE kr_action_map_links` 本体を削除し、「Phase 18 のスキーマを参照」と明記。
       2. マイグレーション手順は本ランブック（本ファイル）に一本化。

4. **共通設計決定の記述が 3 ファイルに重複**
   - 現状:
     - 「KR 直結廃止」「進捗は同期」「責務分担」などの決定事項が各 Phase ランブックにそれぞれ書かれている。
   - 改善方針:
     - 共通設計決定は `PHASES-16-17-18-IMPROVEMENT.md` に集約し、各 Phase ランブックでは「共通設計決定を参照」とする。
     - ランブック側には「Phase 固有の追加ルール」だけを残す（例: Phase 16 の `task_links` 運用ポリシー）。

5. **イベント名・型定義の分散**
   - 現状:
     - `TaskCompletedEvent`, `ActionMapProgressUpdatedEvent` などが各ファイルで個別定義されている。
   - 改善方針:
     - 共通型定義ファイル `lib/types/progress-events.ts`（仮）を 1 箇所定義。
     - ランブックではそのファイルを参照し、「追加フィールド」だけを各 Phase 側で提案する。

---

### 2.2 データモデル / DB スキーマ改善

1. **`task_links` の役割を「Task → ActionItem」のみに固定**
   - 現状:
     - ランブック上は「ActionItem のみ」と明示されているが、DB 制約としては残骸が混在する前提がある。
   - 改善方針:
     - `PHASES-16-17-18-IMPROVEMENT.md` に記載済みの `chk_target_type_action_item` 制約を本番スキーマに反映。
     - 既存データのうち `target_type != 'action_item'` を全件棚卸しし、マイグレーションスクリプトで解消。

2. **楽観ロック設計の統一**
   - 現状:
     - `tasks`, `action_maps`, `action_items`, `okr_objectives`, `okr_key_results` にそれぞれ `version` とトリガーが定義されているが、説明がバラバラ。
   - 改善方針:
     - 「楽観ロック共通ポリシー」を 1 セクションに集約:
       - 更新 API はすべて `version` を必須。
       - バックエンドは `CONFLICT` エラーコードで統一。
       - フロントは「最新状態を取得 → 差分マージ → 再送」の標準ハンドリングを実装。

3. **`kr_action_map_links` のインデックスと整合性チェック**
   - 現状:
     - Phase 17 ランブックにトリガーベースの workspace チェックがあり、Phase 18 側にもバリデーションロジックがある。
   - 改善方針:
     - DB トリガーで workspace 整合性を保証し、アプリ側のチェックは「ユーザー向けエラーメッセージ」に限定。
     - インデックスは下記の 3 本に統一:
       - `idx_kr_am_links_kr_ws (workspace_id, key_result_id)`
       - `idx_kr_am_links_am_ws (workspace_id, action_map_id)`
       - `idx_kr_am_links_ws_created (workspace_id, created_at DESC)`

4. **ログ/サマリ系テーブルの運用方針を明文化**
   - 対象:
     - `task_logs`, `kr_progress_logs`, `daily_summaries`, `monthly_summaries`, `archived_tasks`
   - 改善方針:
     - すべて「**書き込みのみ**」のテーブルであることを明記し、更新/削除はバッチのみ許可。
     - 期間ごとのパーティショニング方針（例: 月単位）の採用タイミングと手順をランブックに追加。

---

### 2.3 API / Hook / UI の一貫性

1. **API 命名・パスの統一**
   - 現状:
     - Phase ごとに `PATCH /v1/...`, `/api/workspaces/{id}/...` が混在。
   - 改善方針:
     - OKR/ActionMap/Task 全体で `/api/workspaces/{workspaceId}/...` に揃える。
     - リソース名は複数形で統一（`tasks`, `action-maps`, `okr-objectives`, `okr-key-results`）。

2. **Hook のインターフェース統一**
   - 現状:
     - `useActionMapViewModel`, `useOKRViewModel`, `useTaskViewModel`（仮）がそれぞれ独自の返り値構造を持つ前提。
   - 改善方針:
     - 共通インターフェース:
       - `items`（リスト）, `loading`, `error`, `refetch()`
       - `create`, `update`, `remove` の署名を揃える。
     - 進捗系は `useProgressBadge` に集約し、UI コンポーネントは `ProgressBadge` のみを使用。

3. **進捗 UI コンポーネントの統一**
   - 現状:
     - Phase ごとに異なる進捗表現（バー/数字/円形など）の可能性がある。
   - 改善方針:
     - `ProgressBadge`（円形＋数値）を共通コンポーネントとして定義。
     - Task / ActionItem / ActionMap / KR / Objective はすべて `ProgressBadge` を利用。

4. **Undo / 通知 UX の共通化**
   - 現状:
     - Task ゴミ箱、ActionItem アサイン、KR 更新など、操作履歴 UI の設計が分散。
   - 改善方針:
     - `UndoSnackbar` と `notifications` テーブルを共通コンポーネント/テーブルとして採用。
     - ランブック側に「Undo 対応必須の操作一覧」を明示し、Phase ごとに追加不要とする。

---

## 3. 実行ステップ（改善タスクの分解）

### 3.1 Step 0 – ドキュメント整備（1〜2 日）

**目的:** 実装前にランブックの矛盾を解消し、チーム内の認識を揃える。

- [ ] PHASE16 の ER 図から `okr_key_results` ↔ `task_links` の関連を削除し、`kr_action_map_links` 経由の図に差し替え。
- [ ] PHASE17 から `kr_action_map_links` の CREATE TABLE 本文を削除し、「Phase 18 のスキーマを参照」に変更。
- [ ] PHASE18 に「共通設計決定」セクションへのリンクを追記し、本ランブックと `PHASES-16-17-18-IMPROVEMENT.md` を正本として明示。
- [ ] ProgressService に関する説明を Phase 18 に集約し、Phase 16/17 側では「イベント発火ポイント」のみを記述。

### 3.2 Step 1 – DB スキーマ統一とマイグレーション（〜1 週間）

- [ ] `kr_action_map_links` を Phase 18 の定義に合わせて本番 DB に作成。
- [ ] `task_links` に `chk_target_type_action_item` 制約を追加。
- [ ] `okr_key_results` の旧 `calc_method` カラムを削除（存在する場合）し、すべて `ActionMap` 経由に移行。
- [ ] 既存の KR ↔ ActionMap 関連データを `kr_action_map_links` に移行するスクリプトを作成・実行。
- [ ] ログ/サマリ系テーブル（`kr_progress_logs`, `archived_tasks`, `daily_summaries`, `monthly_summaries`）に必要なインデックスとパーティショニング方針を記述。

### 3.3 Step 2 – ProgressService 集約（〜1 週間）

- [ ] `ProgressService` を Phase 18 に 1 クラスとして確立（現行 doc に準拠）。
- [ ] `calculateActionMapProgress`, `updateKRProgressFromActionMaps`, `updateObjectiveProgress` などの関数を `ProgressService` 内に移動。
- [ ] Phase 16 の `onTaskCompleted()` から `progressService.propagateFromTask(taskId)` を呼ぶように統一。
- [ ] Phase 17 の ActionMap 進捗更新も `progressService` 経由に切り替え、二重更新を排除。
- [ ] ユニットテスト:  
  - Task 完了 → Objective 更新までのチェーンをモック含めて検証。  
  - すべての進捗計算が `ProgressService` 経由で行われていることを保証。

### 3.4 Step 3 – API / Hook / UI 統一（〜1 週間）

- [ ] Task / ActionMap / OKR の API パスを `/api/workspaces/{workspaceId}/...` に統一。
- [ ] 各 CRUD Hook を共通インターフェースに揃え、内部的な型の差異を減らす。
- [ ] `ProgressBadge`, `UndoSnackbar`, `KRActionMapLinker` などの共通コンポーネントを実装し、既存 UI から差し替え。
- [ ] アサイン/承認フローの通知を `notifications` テーブルと WebSocket 経由に統一。

### 3.5 Step 4 – テスト・運用・モニタリング（〜数日）

- [ ] E2E テスト: Task 完了 → ActionItem → ActionMap → KR → Objective の経路を Cypress などで自動化。
- [ ] マイグレーション後のデータ整合性チェッククエリを `PHASES-16-17-18-IMPROVEMENT.md` に追記。
- [ ] KPI 監視（API P95, 進捗更新の失敗率, Undo 利用率）をダッシュボード化。

---

## 4. 完了チェックリスト

**アーキテクチャ/責務**
- [ ] すべての進捗計算が `ProgressService` 経由になっている。
- [ ] Task ↔ KR の直接リンクがコード・DB・ドキュメントから削除されている。

**DB / データ整合性**
- [ ] `kr_action_map_links` の FK/インデックス/トリガーが整備されている。
- [ ] `task_links` の `target_type` が `action_item` 以外存在しない。

**API / UI / UX**
- [ ] 主要 API が `/api/workspaces/{workspaceId}/...` に統一されている。
- [ ] 進捗表示が `ProgressBadge` コンポーネントで統一されている。
- [ ] Undo/通知の UX が Phase 16/17/18 で一貫している。

**運用**
- [ ] E2E テストで Task → Objective までの進捗伝播が通っている。
- [ ] KPI（エラー率/P95/整合性エラー）が目標値を満たしている。

---

## 5. 今後の拡張候補（参考）

- 非同期進捗計算（ジョブキュー化）への移行手順を別ランブックとして切り出す。
- テナント分割やリージョン分散を見据えた `workspace_group` 単位での集計設計。
- ML/AI による「自動アサイン提案」「進捗異常検知」を Phase 19 以降に取り込む際の拡張ポイントの洗い出し。

*本ランブックは、既存の改善提案 (`PHASES-16-17-18-IMPROVEMENT.md`) を実行可能なタスクに落とし込むための補完ドキュメントです。*

