# Phase 9.93-D: UAT & Phase 10 移行ゲート

**最終更新:** 2025-11-25
**ステータス:** 待機中（A, B, C 完了後に開始）
**並列ワークストリーム:** D（4並列中）
**依存関係:** A, B, C すべて完了後に実施

---

## 必読ドキュメント（作業開始前に必ず確認）

| ドキュメント | パス | 確認項目 |
|-------------|------|---------|
| **グランドガイド** | `docs/FDC-GRAND-GUIDE.md` | プロジェクト全体方針、フェーズ定義 |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | 基本ルール、DOD 定義 |
| **統括ランブック** | `docs/PHASE9.93-BUGFIX-RUNBOOK.md` | Phase 9.93 全体の DOD |
| **技術負債** | `docs/TECH-DEBT-INVENTORY.md` | 解消状況の確認 |

---

## 0. ワークストリーム概要

### 0.1 目的

- ユーザー受入テスト（UAT）を実施し、実際の業務フローでの動作を確認する
- すべてのワークストリームの成果を統合検証する
- Phase 10 への移行ゲートを管理する

### 0.2 スコープ

| タスクID | タスク名 | 内容 |
|---------|---------|------|
| UAT-01 | UAT 準備 | テスト環境・データ準備 |
| UAT-02 | フル UAT 実施 | 14 シナリオの実行 |
| UAT-03 | フィードバック記録 | 発見事項の文書化 |
| GATE-01 | 技術ゲート | ビルド・テスト・パフォーマンス確認 |
| GATE-02 | 品質ゲート | 技術負債・バグ確認 |
| GATE-03 | 承認ゲート | ステークホルダー承認 |

### 0.3 完了条件（DOD）

- [ ] フル UAT または簡易 UAT が完了
- [ ] Critical/Major バグが 0 件
- [ ] すべての技術ゲートが Pass
- [ ] UAT 承認者のサインオフ完了
- [ ] Phase 10 移行準備完了

---

## 1. UAT-01: UAT 準備

### 1.1 テスト環境

| 項目 | 設定 |
|------|------|
| 環境 | Vercel Preview / 本番環境 |
| URL | `https://xxx.vercel.app` または本番 URL |
| テストユーザー | 各ロール（EXEC, MANAGER, MEMBER）×1 |
| テストデータ | 本番データのコピーまたはシードデータ |

### 1.2 テストユーザー準備

```markdown
| ロール | メールアドレス | パスワード | 用途 |
|--------|---------------|-----------|------|
| EXEC | test-exec@example.com | *** | 全機能テスト |
| MANAGER | test-manager@example.com | *** | 権限制限テスト |
| MEMBER | test-member@example.com | *** | 権限制限テスト |
| fdc_admin | admin@example.com | *** | SA機能テスト |
```

### 1.3 テストデータ準備

**最低限必要なデータ:**
- Workspace: 1つ以上
- Leads: 各ステータス（未接触/反応あり/商談中/成約/失注）に 2-3 件
- Clients: 5 件以上
- TODOs: 10 件以上（各優先度に分散）
- OKR: Objective 2 件、Key Result 各 3 件

---

## 2. UAT-02: フル UAT 実施

### 2.1 UAT シナリオ一覧（全 14 シナリオ）

| # | タブ | シナリオ名 | 操作手順 | 確認ポイント |
|---|------|-----------|---------|-------------|
| 1 | Dashboard | KPI 確認フロー | ダッシュボード表示 → KPI 統計確認 → ファネル確認 → TODO 上位確認 | 数値が正しく集計されているか |
| 2 | Leads | リード管理フロー | 新規登録 → ステータス変更 → タグ追加 → 履歴追加 | サーバーに保存されるか |
| 3 | Leads | 失注フロー | 「失注」に変更 → アンケート入力 → `/leads/lost` 確認 → 敗者復活 | 失注アンケートが記録されるか |
| 4 | Leads | 成約フロー | 「成約」に変更 → `/clients` に自動コピー確認 | 既存客への自動連携 |
| 5 | Clients | 既存客管理フロー | 編集 → 契約期限設定 → 次回ミーティング登録 → メモ追加 | 色分け表示が正しいか |
| 6 | MVV | MVV 編集フロー | Mission 編集 → Vision 編集 → Values 編集 → 保存 | 編集内容が保存されるか |
| 7 | MVV | OKR 編集フロー | Objective 編集 → Key Result 追加 → 進捗更新 | 進捗計算が正しいか |
| 8 | Brand | ブランド指針編集 | Core Message 編集 → Tone & Manner 編集 → Words 編集 | 編集内容が保存されるか |
| 9 | Lean | リーンキャンバス編集 | 9 ブロック編集 → 商品追加 → 商品編集 → 商品削除 | CRUD が正しく動作するか |
| 10 | TODO | TODO 管理フロー | TODO 追加 → 優先度設定 → 期限設定 → 完了 → 削除 | ソート順が正しいか |
| 11 | Zoom | スクリプト生成 | エモーション選択 → スクリプト生成 → コピー | スクリプトが生成されるか |
| 12 | Templates | テンプレート管理 | テンプレート追加 → 編集 → 使用履歴確認 | 使用履歴が記録されるか |
| 13 | Reports | レポート確認 | アプローチ統計確認 → コンバージョン率確認 → 失注分析確認 | グラフが正しく表示されるか |
| 14 | Settings | 設定変更 | プロフィール編集 → パスワード変更 → 通知設定変更 | 設定が保存されるか |

### 2.2 シナリオ実行チェックリスト

```markdown
## UAT 実行記録

**実施日:** YYYY-MM-DD
**実施者:** [名前]
**環境:** [URL]

| # | シナリオ | 結果 | 備考 |
|---|---------|------|------|
| 1 | Dashboard KPI 確認 | [ ] Pass / [ ] Fail | |
| 2 | Leads リード管理 | [ ] Pass / [ ] Fail | |
| 3 | Leads 失注フロー | [ ] Pass / [ ] Fail | |
| 4 | Leads 成約フロー | [ ] Pass / [ ] Fail | |
| 5 | Clients 既存客管理 | [ ] Pass / [ ] Fail | |
| 6 | MVV 編集 | [ ] Pass / [ ] Fail | |
| 7 | OKR 編集 | [ ] Pass / [ ] Fail | |
| 8 | Brand 編集 | [ ] Pass / [ ] Fail | |
| 9 | Lean 編集 | [ ] Pass / [ ] Fail | |
| 10 | TODO 管理 | [ ] Pass / [ ] Fail | |
| 11 | Zoom スクリプト | [ ] Pass / [ ] Fail | |
| 12 | Templates 管理 | [ ] Pass / [ ] Fail | |
| 13 | Reports 確認 | [ ] Pass / [ ] Fail | |
| 14 | Settings 変更 | [ ] Pass / [ ] Fail | |
```

### 2.3 簡易 UAT オプション（リソース制約時）

フル UAT が困難な場合、**クリティカルパス 5 シナリオ** のみ実施可：

| # | シナリオ | 理由 |
|---|---------|------|
| 1 | Dashboard KPI 確認 | 最頻使用画面 |
| 2 | Leads 成約フロー | コアビジネスフロー |
| 3 | Clients 既存客管理 | コアビジネスフロー |
| 4 | TODO 管理 | Phase 10 の基盤 |
| 5 | Settings 設定変更 | セキュリティ関連 |

**簡易 UAT の完了条件:**
- [ ] 5 シナリオすべて Pass
- [ ] Critical バグ 0 件

---

## 3. UAT-03: フィードバック記録

### 3.1 フィードバック分類

| 重大度 | 定義 | 対応 |
|--------|------|------|
| **Critical** | データ消失、セキュリティ問題、アプリクラッシュ | Phase 9.93 で即時修正 |
| **Major** | 機能が動作しない、業務フローが完了できない | Phase 9.93 で修正 |
| **Minor** | 軽微な UI 問題、使いにくさ | Phase 10 以降で対応可 |
| **Enhancement** | 改善提案、新機能要望 | バックログに追加 |

### 3.2 フィードバック記録テンプレート

**`docs/UAT-FEEDBACK.md` を作成:**

```markdown
# UAT フィードバック記録

## 実施情報

| 項目 | 値 |
|------|-----|
| 実施日 | YYYY-MM-DD |
| 実施者 | [名前] |
| 環境 | [URL] |
| 実施範囲 | フル UAT / 簡易 UAT |

---

## フィードバック一覧

| # | シナリオ | 発見事項 | 重大度 | 対応フェーズ | ステータス | 担当 |
|---|---------|---------|--------|-------------|-----------|------|
| 1 | Leads 成約 | 成約時に既存客にコピーされない | Critical | 9.93 | 修正済み | xxx |
| 2 | Dashboard | ファネルの色が薄い | Minor | 10 | 未対応 | - |
| 3 | Settings | 保存ボタンが小さい | Enhancement | Backlog | 未対応 | - |

---

## Critical/Major 対応状況

| # | 発見事項 | 修正 PR | 検証結果 |
|---|---------|--------|---------|
| 1 | 成約時に既存客にコピーされない | #123 | 検証済み ✅ |

---

## サインオフ

### UAT 承認者サインオフ

- [ ] 全 Critical/Major が解消されていることを確認
- [ ] 業務フローが正常に動作することを確認
- [ ] Phase 10 への移行を承認

**承認者:** ________________
**日付:** YYYY-MM-DD
**コメント:**

________________
________________
________________
```

---

## 4. GATE-01: 技術ゲート

### 4.1 必須チェック項目

| # | チェック項目 | コマンド | 合格基準 | 結果 |
|---|-------------|---------|---------|------|
| 1 | ビルド | `npm run build` | エラー 0、警告 0 | [ ] |
| 2 | 型チェック | `npm run type-check` | エラー 0 | [ ] |
| 3 | Lint | `npm run lint` | エラー 0 | [ ] |
| 4 | レガシー参照 | `npm run check:legacy` | 検出 0 | [ ] |
| 5 | E2E テスト | `npm run test:e2e` | 全 Pass | [ ] |
| 6 | Visual Regression | `npm run test:visual` | 差異 5% 以下 | [ ] |
| 7 | バンドルサイズ | `npm run check:bundle` | 閾値以下 | [ ] |
| 8 | Lighthouse | `npm run check:lighthouse` | Performance 70+ | [ ] |

### 4.2 実行スクリプト

```bash
#!/bin/bash
# scripts/phase993-gate-check.sh

echo "🚀 Phase 9.93 Gate Check Starting..."

# 1. ビルド
echo "📦 Building..."
npm run build || { echo "❌ Build failed"; exit 1; }

# 2. 型チェック
echo "🔍 Type checking..."
npm run type-check || { echo "❌ Type check failed"; exit 1; }

# 3. Lint
echo "🧹 Linting..."
npm run lint || { echo "❌ Lint failed"; exit 1; }

# 4. レガシー参照
echo "🏚️ Checking legacy imports..."
npm run check:legacy || { echo "❌ Legacy imports detected"; exit 1; }

# 5. バンドルサイズ
echo "📊 Checking bundle size..."
npm run check:bundle || { echo "❌ Bundle size exceeded"; exit 1; }

# 6. E2E テスト
echo "🧪 Running E2E tests..."
npm run test:e2e || { echo "❌ E2E tests failed"; exit 1; }

# 7. Visual Regression
echo "👁️ Running visual regression..."
npm run test:visual || { echo "❌ Visual regression failed"; exit 1; }

echo "✅ All gates passed!"
```

---

## 5. GATE-02: 品質ゲート

### 5.1 技術負債確認

**`docs/TECH-DEBT-INVENTORY.md` をチェック:**

| 重要度 | Phase 9.93 目標 | 実績 | 達成 |
|--------|----------------|------|------|
| 高 | 100% 解消 | ___% | [ ] |
| 中 | 50% 解消 | ___% | [ ] |
| 低 | 記録のみ | - | [ ] |

### 5.2 バグ状況確認

| カテゴリ | 検出数 | 修正完了 | 残存 |
|---------|--------|---------|------|
| Critical | ___ | ___ | 0 必須 |
| Major | ___ | ___ | 0 必須 |
| Minor | ___ | ___ | 許容 |

### 5.3 ドキュメント確認

| ドキュメント | 存在 | 更新済み |
|-------------|------|---------|
| `docs/PERFORMANCE-BASELINE.md` | [ ] | [ ] |
| `docs/RSC-POC-REPORT.md` | [ ] | [ ] |
| `docs/CSS-MIGRATION-DECISION.md` | [ ] | [ ] |
| `docs/UI-DIFF-LOG.md` | [ ] | [ ] |
| `docs/UAT-FEEDBACK.md` | [ ] | [ ] |

---

## 6. GATE-03: 承認ゲート

### 6.1 承認体制

| 役割 | 担当者 | 責務 |
|------|--------|------|
| **UAT 承認者** | プロジェクトオーナー / 望月 | 最終サインオフ |
| **技術承認者** | リード開発者 | 技術ゲート確認 |
| **品質承認者** | QA 担当 | 品質ゲート確認 |

### 6.2 承認フロー

```
1. 技術ゲート Pass（GATE-01）
   ↓
2. 品質ゲート Pass（GATE-02）
   ↓
3. UAT 完了（UAT-02, UAT-03）
   ↓
4. UAT 承認者レビュー
   ↓
5. サインオフ
   ↓
6. Phase 10 移行可能
```

### 6.3 最終承認チェックリスト

```markdown
## Phase 9.93 → Phase 10 移行承認

**日付:** YYYY-MM-DD

### 技術ゲート
- [ ] `npm run build` Pass
- [ ] `npm run type-check` Pass
- [ ] `npm run lint` Pass
- [ ] `npm run check:legacy` Pass
- [ ] `npm run test:e2e` Pass
- [ ] `npm run test:visual` Pass
- [ ] バンドルサイズ目標達成
- [ ] Lighthouse Performance 70+

### 品質ゲート
- [ ] 高重要度技術負債 100% 解消
- [ ] Critical/Major バグ 0 件
- [ ] 必須ドキュメント作成完了

### UAT ゲート
- [ ] フル UAT または簡易 UAT 完了
- [ ] フィードバック記録完了
- [ ] UAT 承認者サインオフ完了

### 承認

**技術承認者:** ________________ 日付: ________
**品質承認者:** ________________ 日付: ________
**UAT 承認者:** ________________ 日付: ________

### Phase 10 移行許可

- [ ] 上記すべてのゲートが Pass
- [ ] Phase 10 移行を許可する

**最終承認者:** ________________
**日付:** ________
```

---

## 7. Phase 10 への引き継ぎ

### 7.1 引き継ぎドキュメント

Phase 9.93 完了時に以下を Phase 10 に引き継ぐ：

| ドキュメント | 内容 |
|-------------|------|
| `docs/UAT-FEEDBACK.md` | Minor/Enhancement の対応リスト |
| `docs/TECH-DEBT-INVENTORY.md` | 未解消の技術負債（中・低） |
| `docs/RSC-POC-REPORT.md` | RSC 展開計画（成功時） |
| `docs/CSS-MIGRATION-DECISION.md` | CSS 移行の残作業 |

### 7.2 Phase 10 開始条件

- [ ] Phase 9.93 のすべての DOD が達成されている
- [ ] `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` が存在する
- [ ] Phase 10 の要件が明確である
- [ ] 技術負債の引き継ぎが完了している

---

## 8. 実行順序

```
前提: ワークストリーム A, B, C が完了していること

1. UAT-01 準備（1時間）
   ↓
2. GATE-01 技術ゲート実行（1時間）
   ↓
3. GATE-02 品質ゲート確認（1時間）
   ↓
4. UAT-02 フル/簡易 UAT 実施（4〜8時間）
   ↓
5. UAT-03 フィードバック記録（1時間）
   ↓
6. Critical/Major 修正（発見時）
   ↓
7. GATE-03 承認ゲート（1時間）
   ↓
8. Phase 10 引き継ぎ準備（1時間）
```

**合計推定時間:** 10〜14時間（バグ修正含まず）

---

## 9. 完了チェックリスト

| # | 項目 | 確認 |
|---|------|------|
| 1 | テスト環境・データが準備されている | [ ] |
| 2 | フル UAT または簡易 UAT が完了 | [ ] |
| 3 | `docs/UAT-FEEDBACK.md` が作成されている | [ ] |
| 4 | Critical/Major バグが 0 件 | [ ] |
| 5 | 技術ゲート 8 項目すべて Pass | [ ] |
| 6 | 高重要度技術負債 100% 解消 | [ ] |
| 7 | 必須ドキュメント 5 件作成完了 | [ ] |
| 8 | UAT 承認者サインオフ完了 | [ ] |
| 9 | Phase 10 引き継ぎ準備完了 | [ ] |

---

## 10. 完了報告フォーマット

```markdown
## Phase 9.93-D 完了報告

**完了日時:** YYYY-MM-DD HH:MM
**担当:** [名前]

### UAT 結果

| 項目 | 結果 |
|------|------|
| 実施範囲 | フル UAT / 簡易 UAT |
| 合格シナリオ | ___/14 または ___/5 |
| Critical バグ | ___ 件（すべて解消済み） |
| Major バグ | ___ 件（すべて解消済み） |
| Minor バグ | ___ 件（Phase 10 へ引き継ぎ） |

### ゲート結果

| ゲート | 結果 |
|--------|------|
| 技術ゲート | Pass / Fail |
| 品質ゲート | Pass / Fail |
| 承認ゲート | Pass / Fail |

### 承認状況

- [x] 技術承認者サインオフ
- [x] 品質承認者サインオフ
- [x] UAT 承認者サインオフ

### Phase 10 引き継ぎ

| 引き継ぎ項目 | ドキュメント |
|-------------|-------------|
| Minor バグ | `docs/UAT-FEEDBACK.md` |
| 技術負債 | `docs/TECH-DEBT-INVENTORY.md` |
| CSS 移行 | `docs/CSS-MIGRATION-DECISION.md` |

### 備考
- （特記事項があれば記載）
```

---

## 11. Phase 9.93 全体完了宣言

すべてのワークストリーム（A, B, C, D）が完了したら、以下を実施：

### 11.1 FDC-GRAND-GUIDE.md 更新

```markdown
### Phase 9.93: 最終バグ修正 & 完全整合性確保
**ステータス**: ✅ 完了
**完了日**: YYYY-MM-DD
**目的**: UI差異・ロジック差異・Next.js固有バグをゼロ化
**成果**:
- すべてのタブが旧UIと完全一致
- Phase 9.9/9.91 の残務すべて完了
- パフォーマンス目標達成（バンドル-15%, Lighthouse 70+）
- Visual Regression / CI 自動化導入
- UAT 完了・承認取得
```

### 11.2 CHANGELOG.md 追記

```markdown
## [v2.9.0] - YYYY-MM-DD

### Phase 9.93 完了

#### Added
- Visual Regression Test（Playwright）
- バンドルサイズ CI チェック
- Lighthouse CI チェック
- ESLint archive import 禁止ルール

#### Changed
- Reports/Zoom タブを `next/dynamic` で遅延ロード
- CSS 移行方針決定（Tailwind / CSS Modules）

#### Fixed
- UI 差異 ___ 件修正
- ロジック差異 ___ 件修正
- Next.js 固有バグ ___ 件修正

#### Performance
- 初期バンドルサイズ -__% 削減
- Lighthouse Performance __点達成
```

---

**Phase 9.93 完了後:** `docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` へ移行
