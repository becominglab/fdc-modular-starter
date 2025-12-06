# 改善提案ドキュメント – Phase 16/17/18 ランブック統合

## 目的
- 3 つのランブック（Task System v4、ActionMap v2、OKR v2）間の **ロジック一貫性** と **データ整合性** を確保し、顧客体験（CX）を業界ベストプラクティスに合わせて最適化する。
- 本ドキュメントは **実装ガイド**、**UX 改善**、**マイグレーション計画** を一括で提示し、開発チームが段階的に取り組めるように設計しています。

---

## ★ 反映ステータス（2025-12-05 更新）

| 提案項目 | ステータス | 反映先 | 備考 |
|---------|----------|--------|------|
| KR↔ActionMap連携統一 | ✅ 反映済み | Phase 18 | `kr_action_map_links` テーブル |
| calcMethod統一 | ✅ 反映済み | Phase 18 | `fromActionMaps` のみに固定 |
| 楽観ロック共通化 | ✅ 反映済み | Phase 16 | `optimisticUpdate()` 共通インターフェース |
| インデックス命名規則 | ✅ 反映済み | Phase 16 | `idx_<table>_ws_<col>` 形式 |
| Undoスナックバー | ✅ 反映済み | Phase 16 | UX改善として追加 |
| ProgressService | ✅ 反映済み | Phase 18 | 進捗伝播の中央集約 |
| 重み付け（weight） | ✅ 反映済み | Phase 18 | KR/Objective計算で使用 |
| Redisキャッシュ | ⏸️ 保留 | - | 現時点では過剰（将来検討） |
| パーティショニング | ⏸️ 保留 | - | 10万ワークスペース到達後に検討 |
| WebSocket通知 | ⏸️ 保留 | - | MVP後に検討 |

---

## 1️⃣ ロジック・データ整合性チェック
| 項目 | 現状 | 推奨統一策 | 期待効果 |
|------|------|------------|----------|
| **KR ↔ ActionMap 連携** | Phase 16 の `task_links`、Phase 17 の `action_map_links`、Phase 18 の `kr_action_map_links` が別テーブル | **単一中間テーブル** `kr_action_map_links` に統一し、Phase 16 の `task_links` だけを残す | 参照パスが一本化、クエリがシンプルに。データ不整合リスク ↓
| **calcMethod** | Phase 18 で `manual` と `fromActionMaps` が混在 | **`calcMethod = 'fromActionMaps'` のみ**（`manual` は UI で非表示） | 進捗計算ロジックが一元化、テスト容易化
| **楽観ロック** | `tasks.version`、`action_maps.version`、`action_items.version` が別管理 | **共通インターフェース `optimisticUpdate(entity, payload, version)`** を導入 | 競合処理が統一、フロントエンド実装が簡素化
| **インデックス** | 各テーブルに個別インデックスが散在 | **統一命名規則**（例: `idx_<table>_ws_<col>`）と **複合インデックス**（`workspace_id + status`、`workspace_id + position + sort_order`） | 大規模検索のパフォーマンス向上（10 万ワークスペース規模）

---

## 2️⃣ 顧客体験（CX）最適化
### 2.1 UI/UX の一貫性
- **タブラベル**を日本語＋英語併記（例: `Spade (タスク)`）でアクセシビリティ向上。
- **ゴミ箱操作**に **Undo スナックバー（5 秒）** を追加し、誤削除のリスクを低減。
- **アサイン・承認フロー**はモーダルで **リアルタイム通知**（WebSocket）を行い、上司・部下の操作感を同期。
- **進捗表示**は **円形プログレスバー**＋数値で統一し、Phase 16‑18 全体で同一コンポーネント `ProgressBadge` を再利用。

### 2.2 パフォーマンス・スケーラビリティ
- **Redis キャッシュ**: `GET /tasks`, `GET /okr/objectives` の結果を 30 秒 TTL で保持。
- **バックグラウンドバッチ**: 30 日経過ゴミ箱タスクの自動アーカイブは **Supabase Edge Function** で夜間実行。
- **パーティショニング**: `archived_tasks` と `kr_progress_logs` を月単位でパーティション化し、古いデータは低コストストレージへ移行。

---

## 3️⃣ ベストプラクティスに基づく改善案
### 3.1 データモデル統一
```sql
-- 1. 中間テーブル統一 (kr_action_map_links)
CREATE TABLE kr_action_map_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_result_id UUID NOT NULL REFERENCES okr_key_results(id) ON DELETE CASCADE,
  action_map_id UUID NOT NULL REFERENCES action_maps(id) ON DELETE CASCADE,
  weight DECIMAL(3,2) DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_result_id, action_map_id)
);

-- 2. task_links はタスク ↔ ActionItem のみ残す
ALTER TABLE task_links DROP CONSTRAINT IF EXISTS task_links_target_type_check;
ALTER TABLE task_links ADD CONSTRAINT chk_target_type_action_item CHECK (target_type = 'action_item');
```

### 3.2 進捗計算ロジック（ProgressService）
- **単一エントリポイント** `propagateProgress(event)` が Phase 16 と Phase 17 のイベントを受け取り、以下の順序で処理:
  1. タスク → ActionItem
  2. ActionItem → ActionMap
  3. ActionMap → KR（重み付け平均）
  4. KR → Objective（重み付け平均）
- **テスト戦略**: 各ステップをモックし、**エンドツーエンド**で `Task 完了 → Objective 進捗更新` が 100 % 正しく伝播することを検証。

### 3.3 API 設計統一
| エンドポイント | メソッド | パラメータ | 変更点 |
|----------------|----------|------------|--------|
| `/api/tasks/:id` | `PATCH` | `position`, `status`, `version` | **楽観ロック必須** (`version` が一致しない場合 409)
| `/api/action-maps/:id/progress` | `POST` | `newProgressRate` | **ProgressService** が内部で呼び出され、`onActionMapProgressUpdated` がトリガー
| `/api/okr/objectives/:id` | `GET` | `expand=keyResults,progress` | **`fields` パラメータ**で過剰転送防止

---

## 4️⃣ マイグレーション・実装ロードマップ（3 週間）
| 週 | 作業項目 | 成果物 |
|---|----------|--------|
| **Week 1** | - `kr_action_map_links` テーブル作成<br>- `task_links` 制約変更<br>- 既存データを新テーブルへ移行スクリプト (`migrate_kr_links.ts`) | DB スキーマ変更、移行スクリプト
| **Week 2** | - `ProgressService` 実装 & ユニットテスト<br>- UI コンポーネント統一 (`ProgressBadge`, `UndoSnackbar`)<br>- Redis キャッシュミドルウェア追加 | サービスコード、UI コンポーネント、キャッシュ設定
| **Week 3** | - バックグラウンドバッチ（ゴミ箱自動アーカイブ）<br>- エンドツーエンドテスト (Task → Objective) <br>- ドキュメント更新 & リリースノート作成 | バッチデプロイ、E2E テスト、リリースドキュメント

---

## 5️⃣ 成功指標 (KPIs)
- **UI エラー率**: < 1 %（Undo スナックバー導入で回復率 95 %）
- **API P95 応答時間**: < 100 ms（インデックス・キャッシュ効果）
- **データ整合性エラー**: 0 件（マイグレーション後の検証クエリ）
- **ユーザー満足度**: NPS + 10 ポイント（UX 改善後のアンケート）

---

## 6️⃣ 次のステップ
1. 本提案をレビューし、**承認**または**追加要件**をご提示ください。
2. 承認後、**実装タスク**（Phase 16‑18 のマイグレーション）を JIRA に登録します。
3. スプリント開始時に **ProgressService** と **キャッシュ** の実装を優先的に着手します。

*本ドキュメントは `PHASES-16-17-18-IMPROVEMENT.md` としてリポジトリに保存されます。*
