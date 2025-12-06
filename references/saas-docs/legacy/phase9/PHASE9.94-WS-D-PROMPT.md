# Phase 9.94 WS-D: 品質プラットフォーム強化 起動プロンプト

## 起動コマンド

```
claude --resume-from /Users/5dmgmt/プラグイン/foundersdirect
```

---

## プロンプト本文

```markdown
# Phase 9.94 WS-D: 品質プラットフォーム強化

あなたは FDC プロジェクトの **WS-D（品質プラットフォーム強化）** 担当です。

**重要:** WS-D は他の WS（A/B）が依存する CI 基盤を構築します。**最優先で Day 2 までに完了**してください。

## 必読ドキュメント

以下を最初に読み込んでください：

1. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE9.94-POLISH-RUNBOOK.md` - メインランブック
2. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE9.94-D-QUALITY-PLATFORM.md` - WS-D 詳細
3. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` - Phase 10 要件
4. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE11-ACTIONMAP-RUNBOOK.md` - Phase 11 要件
5. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE12-OKR-RUNBOOK.md` - Phase 12 要件

## 目標

| 項目 | 現状 | 目標 |
|------|------|------|
| CI ワークフロー | なし | **quality-gate.yml 導入** |
| バンドルサイズチェック | スクリプトのみ | **CI 自動チェック + PR コメント** |
| Visual Regression | 任意実行 | **CI 必須 + 認証対応** |
| 技術負債レポート | なし | **PR 自動コメント** |
| Lighthouse CI | なし | **スコア記録 + 閾値チェック** |
| Phase 10/11/12 テスト基盤 | なし | **スキャフォルド作成** |

## タスク一覧（優先順位順）

| # | タスク | 優先度 | 完了判定 |
|---|--------|--------|---------|
| D-01 | GitHub Actions ワークフロー作成 | 🔴最高 | `.github/workflows/quality-gate.yml` |
| D-02 | テスト認証バイパス実装 | 🔴最高 | CI でログイン可能 |
| D-03 | 技術負債スキャナー作成 | 🟠高 | `scripts/report-tech-debt.cjs` |
| D-04 | バンドルサイズチェッカー強化 | 🟠高 | 閾値チェック + エラーハンドリング |
| D-05 | Visual Regression テスト整備 | 🟡中 | 認証込みで動作 |
| D-06 | Lighthouse CI 導入 | 🟡中 | スコア記録 + PR コメント |
| D-07 | ロールバック手順書作成 | 🟢低 | 手順ドキュメント |
| D-08 | Sentry 導入検討 | 🟢低 | 導入可否判断 |
| D-10 | Phase 10/11/12 E2E スキャフォルド | 🟠高 | ディレクトリ構造作成 |
| D-11 | Vitest ユニットテスト設定 | 🟠高 | vitest.config.ts |
| D-12 | テストデータファクトリ作成 | 🟡中 | tests/fixtures/factory.ts |

---

## 🚨 同期ポイント（必ず停止して報告）

### SYNC-D1: 開始確認（即時開始・最優先）

**WS-D は最優先。即時開始してください。**

```
🔴 SYNC-D1 開始確認

WS-D は他 WS（A/B）が依存する CI 基盤を構築します。
Day 2 までに D-01, D-02 を完了させる必要があります。

優先順位:
1. D-01: GitHub Actions ワークフロー（最優先）
2. D-02: テスト認証バイパス（最優先）
3. D-03, D-04: スキャナー・チェッカー（高）
4. 残り: 中〜低

即時開始します。D-01 から着手しますか？ [y/n]
```

---

### SYNC-D2: CI 基盤完了通知（D-01, D-02 完了後）

**🔴 重要: 他 WS に通知が必要**

```
📢 SYNC-D2 CI 基盤完了通知

## 完了項目
- ✅ D-01: `.github/workflows/quality-gate.yml` 作成
- ✅ D-02: テスト認証バイパス実装

## 作成ファイル
| ファイル | 内容 |
|----------|------|
| `.github/workflows/quality-gate.yml` | CI ワークフロー |
| `tests/e2e/auth.setup.ts` | 認証セットアップ |
| `playwright.config.ts` | Playwright 設定 |

## GitHub Secrets 設定要求
以下の Secrets を GitHub リポジトリに設定してください:
- `TEST_USER_EMAIL`: テストユーザーのメールアドレス
- `TEST_USER_PASSWORD`: テストユーザーのパスワード

## 他 WS への通知

🔔 **WS-A, WS-B へ:**
CI 基盤が利用可能になりました。
- Lighthouse CI: 設定済み
- Visual Regression: 設定済み
- バンドルサイズチェック: 設定済み

WS-A, WS-B は CI 連携タスクを開始できます。

---

D-03 以降に進みますか？ [y/n]
```

---

### SYNC-D3: スキャナー・チェッカー完了（D-03, D-04 完了後）

**必須報告:**

```
📊 SYNC-D3 スキャナー・チェッカー完了

## 完了項目
- ✅ D-03: 技術負債スキャナー
- ✅ D-04: バンドルサイズチェッカー

## 技術負債スキャナー結果（初回実行）
| カテゴリ | 件数 |
|---------|------|
| TODO | ___ |
| FIXME | ___ |
| HACK | ___ |
| any 型 | ___ |
| eslint-disable | ___ |

## バンドルサイズ（現在値）
| チャンク | サイズ | 閾値 |
|----------|--------|------|
| Dashboard First Load | ___KB | 130KB |
| 共有チャンク合計 | ___KB | 100KB |

## 他 WS への通知

🔔 **WS-C へ:**
技術負債スキャナーが利用可能です。
- `node scripts/report-tech-debt.cjs` で実行可能
- PR で自動コメントされます

D-05 以降に進みますか？ [y/n]
```

---

### SYNC-D4: Phase 10/11/12 テスト基盤確認（D-10, D-11, D-12 完了後）

**必須報告:**

```
📊 SYNC-D4 Phase 10/11/12 テスト基盤完了

## 作成したディレクトリ構造
\`\`\`
tests/
├── e2e/
│   ├── phase10/    # TODO CRUD, elastic habits
│   ├── phase11/    # Action Map CRUD, progress rollup
│   └── phase12/    # OKR CRUD, full integration
├── unit/
│   ├── phase10/    # streak calculator
│   ├── phase11/    # progress calculator
│   └── phase12/    # KR calculator
└── fixtures/
    └── factory.ts  # テストデータファクトリ
\`\`\`

## 設定ファイル
| ファイル | 内容 |
|----------|------|
| `vitest.config.ts` | Vitest 設定 |
| `tests/fixtures/factory.ts` | テストデータファクトリ |

## Phase 別パフォーマンス閾値
| Phase | ページ | P95 閾値 | データ上限 |
|-------|--------|---------|-----------|
| 10 | todo-board | 1.2s | 225KB |
| 11 | action-map-tab | 1.5s | 200KB |
| 12 | okr-dashboard | 2.0s | 250KB |

## ファクトリ関数
- `createTask()` - Phase 10 用
- `createActionMap()` - Phase 11 用
- `createObjective()` - Phase 12 用
- `createFullHierarchy()` - 統合テスト用

D-05, D-06, D-07, D-08 に進みますか？ [y/n]
```

---

### SYNC-D5: 最終レポート（全タスク完了後）

**必須報告:**

```
✅ WS-D 完了レポート

## 達成状況
| 項目 | 状態 |
|------|------|
| CI ワークフロー | ✅ 導入済み |
| テスト認証バイパス | ✅ 実装済み |
| 技術負債スキャナー | ✅ 作成済み |
| バンドルサイズチェック | ✅ 強化済み |
| Visual Regression | ✅ 認証対応済み |
| Lighthouse CI | ✅ 導入済み |
| ロールバック手順書 | ✅ 作成済み |
| Sentry | 導入する / 見送り |
| Phase 10/11/12 E2E | ✅ スキャフォルド作成 |
| Vitest 設定 | ✅ 設定済み |
| テストデータファクトリ | ✅ 作成済み |

## 作成ファイル一覧
| ファイル | 内容 |
|----------|------|
| `.github/workflows/quality-gate.yml` | CI ワークフロー |
| `tests/e2e/auth.setup.ts` | 認証セットアップ |
| `scripts/report-tech-debt.cjs` | 技術負債スキャナー |
| `docs/CI-ROLLBACK-PROCEDURE.md` | ロールバック手順 |
| `vitest.config.ts` | Vitest 設定 |
| `tests/fixtures/factory.ts` | テストデータファクトリ |
| `tests/e2e/phase10/` | Phase 10 E2E スキャフォルド |
| `tests/e2e/phase11/` | Phase 11 E2E スキャフォルド |
| `tests/e2e/phase12/` | Phase 12 E2E スキャフォルド |

## CI ジョブ一覧
1. build-and-lint
2. bundle-size
3. visual-regression
4. tech-debt-report
5. lighthouse
6. unit-tests
7. e2e-tests

## 他 WS への最終通知

🔔 **全 WS へ:**
以下の CI 機能が利用可能です:
- PR 作成時に自動実行
- 失敗時は PR がブロック
- バンドルサイズ・技術負債が自動コメント

## GitHub Secrets 設定確認
以下が設定されていることを確認してください:
- [ ] `TEST_USER_EMAIL`
- [ ] `TEST_USER_PASSWORD`

WS-D 完了。Phase 9.94 統合待ち。
```

---

## 実行開始

上記を理解したら、SYNC-D1 を確認して**即時開始**してください。
WS-D は最優先です。他 WS が待機しています。
```

---

## 使用方法

1. Claude Code を起動
2. 上記プロンプトをコピー＆ペースト
3. WS-D が自動的に開始され、同期ポイントで停止・報告
4. **D-01, D-02 完了後、SYNC-D2 で他 WS に通知**

