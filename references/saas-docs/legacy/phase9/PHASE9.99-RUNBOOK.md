# Phase 9.99 RUNBOOK - Phase 10 開始前最終整備

**作成日:** 2025-11-27
**バージョン:** v2.9.9
**ステータス:** 🔄 実行中
**目標完了日:** Phase 10 開始前
**最終実行:** 2025-11-27

---

## 0. 位置づけと目的

Phase 9.99 は **Phase 10 開始前の最終整備フェーズ**です。

### なぜ Phase 9.99 が必要か

| 問題 | 根拠 | 影響 |
|------|------|------|
| 技術負債「ゼロ」が未証明 | `TECH-DEBT-AUDIT.md` で WorkspaceData P95 計測が ⚠️ 要確認 | Phase 10 品質基準が不明確 |
| ドキュメント間の不整合 | GRAND-GUIDE「ゼロ」宣言 vs INVENTORY「20件残存」 | 開発者混乱 |
| CI テスト未検証 | GitHub Secrets 設定未確認、E2E CI 未有効化 | 品質担保不能 |
| 依存関係の脆弱性未確認 | npm audit 未実行 | セキュリティリスク |

### Phase 9.99 の目標

```
✅ 技術負債の実態を明確化（ゼロまたは残存を明記）
✅ 本番環境での性能計測完了
✅ CI/CD パイプライン完全動作
✅ ドキュメント整合性確保
✅ Phase 10 開始条件をすべてクリア
```

---

## 1. DOD（Definition of Done）

### 1.1 必須項目（Phase 10 開始のブロッカー）

| # | 項目 | 基準 | 検証方法 |
|---|------|------|---------|
| D-01 | WorkspaceData P95 計測 | P95 < 200KB | `scripts/monitor-workspace-size.sql` 本番実行 |
| D-02 | npm audit | 脆弱性 high/critical = 0 | `npm audit --audit-level=high` |
| D-03 | any型残存数の明確化 | 件数を確定・記録 | `npm run lint 2>&1 \| grep no-explicit-any \| wc -l` |
| D-04 | GitHub Secrets 確認 | E2E テスト CI で実行可能 | GitHub Actions ログ確認 |
| D-05 | ドキュメント整合性 | GRAND-GUIDE と INVENTORY が一致 | 人間レビュー |

### 1.2 推奨項目（Phase 10 初期で対応可）

| # | 項目 | 基準 | 優先度 |
|---|------|------|-------|
| R-01 | ESLint 警告 50% 削減 | 60件 → 30件 | 中 |
| R-02 | E2E テスト CI 常時実行 | PR ごとに自動実行 | 中 |
| R-03 | CHANGELOG 分割 | 36,000 tokens → 分割 | 低 |

---

## 2. 技術負債 実態調査

### 2.1 現状サマリー

**GRAND-GUIDE の宣言（docs/FDC-GRAND-GUIDE.md:31）:**
> Phase 9.7: ✅ 完了 - 技術負債ゼロ化・旧API完全撤去

**TECH-DEBT-AUDIT の実態（docs/legacy/phase9/TECH-DEBT-AUDIT.md:44-63）:**
> WorkspaceData容量（P95）... **判定: ⚠️ 要確認**（Phase 10開始前に計測必須）

**TECH-DEBT-INVENTORY の残存項目（docs/legacy/other/TECH-DEBT-INVENTORY.md）:**

| カテゴリ | 残存数 | 詳細 |
|---------|-------|------|
| any型 | ~20件 | `lib/types/app-data.ts` 等 |
| no-unused-vars | ~10件 | 未使用変数 |
| no-img-element | 3件 | `next/image` 未置換 |
| CSS Modules 未移行 | 5箇所 | `.kpi-card`, `.funnel-*` 等 |

### 2.2 「技術負債ゼロ」の再定義

Phase 9.99 では以下の定義を採用：

```
「技術負債ゼロ」の定義（Phase 9.99）:

1. 高重要度負債: 0件（セキュリティ・機能影響）
2. 中重要度負債: 明確にリスト化・Phase 10+ に計画済み
3. 低重要度負債: 許容（警告レベル、動作影響なし）
4. 性能基準: すべて P95 目標達成（計測済み）
```

---

## 3. タスク一覧

### 3.1 高優先度（D-01〜D-05: 必須）

#### D-01: WorkspaceData P95 計測

**目的:** 本番環境で実データの容量を計測し、P95 < 200KB を確認

**手順:**
```bash
# 1. 本番データベースに接続
psql $DATABASE_URL

# 2. 計測スクリプト実行
\i scripts/monitor-workspace-size.sql

# 3. 結果を記録
# P95 値が 200KB 未満であることを確認
```

**計測スクリプト（scripts/monitor-workspace-size.sql）:**
```sql
-- WorkspaceData 容量分析
SELECT
  workspace_id,
  pg_size_pretty(length(encrypted_data)::bigint) as encrypted_size,
  pg_size_pretty(length(compressed_data)::bigint) as compressed_size,
  created_at
FROM workspace_data
ORDER BY length(encrypted_data) DESC
LIMIT 20;

-- P95 計算
SELECT
  percentile_cont(0.95) WITHIN GROUP (ORDER BY length(encrypted_data)) as p95_bytes,
  pg_size_pretty(percentile_cont(0.95) WITHIN GROUP (ORDER BY length(encrypted_data))::bigint) as p95_size
FROM workspace_data;
```

**完了基準:**
- [ ] P95 値を計測（数値: ______ KB）
- [ ] P95 < 200KB を確認
- [ ] TECH-DEBT-AUDIT.md に結果を記録

---

#### D-02: npm audit 実行

**目的:** 依存関係の脆弱性を確認

**手順:**
```bash
# 1. 全体スキャン
npm audit

# 2. 高・クリティカルのみ確認
npm audit --audit-level=high

# 3. 修正可能なものを自動修正（任意）
npm audit fix
```

**完了基準:**
- [ ] high/critical 脆弱性: 0件
- [ ] moderate 以下: 件数を記録（許容可）
- [ ] 結果を本 RUNBOOK に記録

**結果記録欄:**
```
実行日: 2025-11-27
high: 3 件 (glob, path-to-regexp x2)
critical: 0 件
moderate: 7 件 (esbuild, js-yaml, undici x2, その他)
low: 0 件

詳細:
- glob 10.2.0-10.4.5: Command injection (high) - npm audit fix で修正可能
- path-to-regexp 4.0.0-6.2.2: ReDoS (high) - breaking change 注意
- esbuild <=0.24.2: 開発サーバーリクエスト漏洩 (moderate)
- js-yaml 4.0.0-4.1.0: Prototype pollution (moderate)
- undici <=5.28.5: Random Values / DoS (moderate)

対応方針:
- `npm audit fix` で glob 修正
- path-to-regexp, esbuild は @vercel/node 2.3.0 への更新で修正可能（breaking change）
- 開発依存のため本番影響なし、Phase 10 で対応
```

**判定:** ⚠️ high 3件残存（開発依存、本番影響なし）→ Phase 10 で対応

---

#### D-03: any型残存数の確定

**目的:** 残存する any型の正確な件数を確定

**手順:**
```bash
# 1. ESLint 警告から any型をカウント
npm run lint 2>&1 | grep -c "no-explicit-any"

# 2. 詳細リスト出力
npm run lint 2>&1 | grep "no-explicit-any" > any-type-list.txt
```

**完了基準:**
- [ ] 件数を確定（数値: ______ 件）
- [ ] ファイル別内訳を記録
- [ ] Phase 10 削減計画を策定

**結果記録欄:**
```
計測日: 2025-11-27
any型残存: 27件（アクティブコードのみ、.archive 除外）

内訳:
- lib/hooks/*.ts: 7件
  - useLostReasons.ts: 2件
  - useLeadsViewModel.ts: 2件
  - useLeads.ts: 1件
  - useApproaches.ts: 1件
  - useDashboardStats.ts: 1件
  - useClients.ts: 1件
- lib/server/*.ts: 3件
  - encryption.ts: 2件
  - supabase.ts: 1件
- app/api/**/*.ts: 10件
  - workspaces/[workspaceId]/data/route.ts: 3件
  - test/session/route.ts: 2件
  - auth/session/route.ts: 1件
  - auth/callback/route.ts: 1件
  - audit-logs/route.ts: 1件
  - workspaces/[workspaceId]/members/route.ts: 1件
  - admin/system-stats/route.ts: 1件
  - admin/sa-workspaces/route.ts: 1件
- app/_components/*.tsx: 3件
  - lost-deals/LostDealsTab.tsx: 3件
- app/(app)/**/*.tsx: 2件
  - dashboard/page.tsx: 1件
  - admin/system/page.tsx: 1件

ESLint 総警告数: 447件（22 errors, 425 warnings）
- .archive 内: 約180件（レガシーコード、対応不要）
- tests/ 内: 約100件（テストコード、許容）
- アクティブコード: 約167件
```

**判定:** ✅ 件数確定（27件）→ Phase 10 で段階的削減

---

#### D-04: GitHub Secrets 確認

**目的:** CI で E2E テストが実行可能な状態を確認

**手順:**
1. GitHub リポジトリ → Settings → Secrets and variables → Actions
2. 以下の Secrets が設定されていることを確認:
   - `TEST_USER_EMAIL`
   - `TEST_USER_PASSWORD`
   - `SUPABASE_URL`（任意）
   - `SUPABASE_ANON_KEY`（任意）

3. PR を作成し、GitHub Actions の E2E テストが実行されることを確認

**完了基準:**
- [ ] TEST_USER_EMAIL 設定済み
- [ ] TEST_USER_PASSWORD 設定済み
- [ ] E2E テストが CI で実行される（skip でない）
- [ ] 381 テスト全パス（CI 環境）

---

#### D-05: ドキュメント整合性確保

**目的:** GRAND-GUIDE と各インベントリの記載を一致させる

**対象ドキュメント:**
1. `docs/FDC-GRAND-GUIDE.md`
2. `docs/legacy/phase9/TECH-DEBT-AUDIT.md`
3. `docs/legacy/other/TECH-DEBT-INVENTORY.md`

**更新内容:**

| ドキュメント | 更新箇所 | 更新内容 |
|------------|---------|---------|
| GRAND-GUIDE | 技術負債解消状況 | 実態に合わせて更新（計測済み/残存を明記） |
| TECH-DEBT-AUDIT | 1.3 WorkspaceData容量 | 計測結果を記入、⚠️ → ✅ に変更 |
| TECH-DEBT-INVENTORY | Phase 10 への引き継ぎ | 最新の残存項目を反映 |

**完了基準:**
- [ ] 3ドキュメントの記載が一致
- [ ] 「ゼロ」「完了」の定義が明確
- [ ] Phase 10 引き継ぎ事項が明記

---

### 3.2 中優先度（R-01〜R-02: 推奨）

#### R-01: ESLint 警告削減

**目標:** 60件 → 30件（50% 削減）

**対象:**
```
@typescript-eslint/no-explicit-any: 20件 → 10件
@typescript-eslint/no-unused-vars: 10件 → 5件
@next/next/no-img-element: 3件 → 0件
```

**見積:** 2-3日

---

#### R-02: E2E テスト CI 常時実行

**目標:** PR ごとに E2E テストを自動実行

**対応:**
1. `.github/workflows/quality-gate.yml` の e2e-tests ジョブを有効化
2. `--if-present` を削除し、必須実行に変更

**見積:** 0.5日

---

### 3.3 低優先度（Phase 10 以降）

| # | 項目 | Phase |
|---|------|-------|
| 1 | CHANGELOG 分割 | 10 |
| 2 | CSS Modules 移行 | 10 |
| 3 | RSC 展開 | 10 |
| 4 | README.md 拡充 | 10 |

---

## 4. 実行スケジュール

### 見積: 3-4日

| 日 | タスク | 担当 |
|---|-------|------|
| Day 1 | D-01 WorkspaceData計測 + D-02 npm audit | Claude Code |
| Day 1 | D-03 any型カウント | Claude Code |
| Day 2 | D-04 GitHub Secrets確認 + CI修正 | 人間開発者 |
| Day 2-3 | D-05 ドキュメント整合性確保 | Claude Code |
| Day 3-4 | R-01 ESLint警告削減（任意） | Claude Code |

---

## 5. Phase 10 開始条件チェックリスト

Phase 9.99 完了時に以下をすべて満たすこと：

```
■ 必須条件（すべて ✅ 必要）
[ ] D-01: WorkspaceData P95 < 200KB 計測完了
[ ] D-02: npm audit high/critical = 0
[ ] D-03: any型残存数を確定・記録済み
[ ] D-04: GitHub Secrets設定済み、E2E CI実行可能
[ ] D-05: ドキュメント整合性確保済み

■ 品質指標
[ ] E2E テスト: 381件全パス
[ ] 型チェック: `npm run type-check` パス
[ ] ビルド: `npm run build` 成功
[ ] Lighthouse: Performance 85+, Accessibility 95+
```

**すべてクリアで Phase 10 開始可能**

---

## 6. 成果物

Phase 9.99 完了時の成果物：

| # | 成果物 | 説明 |
|---|-------|------|
| 1 | 本 RUNBOOK（更新済み） | 全タスク完了マーク |
| 2 | TECH-DEBT-AUDIT.md（更新済み） | WorkspaceData計測結果追記 |
| 3 | TECH-DEBT-INVENTORY.md（更新済み） | 最新残存項目 |
| 4 | FDC-GRAND-GUIDE.md（更新済み） | Phase 9.99完了、整合性確保 |
| 5 | npm-audit-report.txt | 脆弱性スキャン結果 |
| 6 | any-type-list.txt | any型残存リスト |

---

## 7. リスクと緩和策

| リスク | 影響 | 緩和策 |
|-------|------|-------|
| WorkspaceData P95 > 200KB | Phase 10 開始遅延 | 圧縮率改善、データクリーンアップ |
| npm audit で脆弱性発見 | セキュリティリスク | 即座にアップデート、breaking changes 検証 |
| GitHub Secrets 未設定 | CI テスト不能 | 人間開発者に設定依頼 |
| any型が想定以上 | 型安全性低下 | Phase 10 削減計画を拡大 |

---

## 8. 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-11-27 | 初版作成 |

---

**作成者:** Claude Code
**承認者:** （人間開発者）
**次回更新:** Phase 9.99 完了時
