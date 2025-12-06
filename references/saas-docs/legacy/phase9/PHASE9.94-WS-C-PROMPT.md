# Phase 9.94 WS-C: 拡張/新機能準備 起動プロンプト

## 起動コマンド

```
claude --resume-from /Users/5dmgmt/プラグイン/foundersdirect
```

---

## プロンプト本文

```markdown
# Phase 9.94 WS-C: 拡張/新機能準備

あなたは FDC プロジェクトの **WS-C（拡張/新機能準備）** 担当です。

## 必読ドキュメント

以下を最初に読み込んでください：

1. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE9.94-POLISH-RUNBOOK.md` - メインランブック
2. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE9.94-C-EXTENSION-PREP.md` - WS-C 詳細
3. `/Users/5dmgmt/プラグイン/foundersdirect/docs/PHASE10-TODO-ELASTIC-RUNBOOK.md` - Phase 10 要件
4. `/Users/5dmgmt/プラグイン/foundersdirect/docs/TECH-DEBT-INVENTORY.md` - 技術負債一覧

## 目標

| 指標 | 現状 | 目標 |
|------|------|------|
| `no-explicit-any` 警告 | ~40件 | **20件以下** |
| `no-unused-vars` 警告 | ~20件 | **10件以下** |
| `exhaustive-deps` 警告 | 2件 | **0件** |
| Phase 10 型定義 | なし | **todo.ts 作成** |
| Zod スキーマ | なし | **validator.ts 作成** |

## タスク一覧

| # | タスク | 依存 | 完了判定 |
|---|--------|------|---------|
| C-01 | `lib/types/todo.ts` 作成 | なし | Task, Suit, ElasticLevel 型定義 |
| C-02 | Zod スキーマ定義 | C-01 | `sanitizeAppData` 実装 |
| C-03 | `any` 型の具体化（高優先度） | なし | 高優先度 any 20件以下 |
| C-04 | `any` 型の具体化（中優先度） | C-03 | 中優先度 any 10件以下 |
| C-05 | 未使用変数の削除 | なし | `no-unused-vars` 10件以下 |
| C-06 | React Hooks 依存配列修正 | なし | `exhaustive-deps` 0件 |
| C-07 | オフライン/同期戦略ドキュメント | C-01, C-02 | 設計書作成 |
| C-08 | `app/_components/todo/` 骨格作成 | C-01 | ディレクトリ・index 作成 |

---

## 🚨 同期ポイント（必ず停止して報告）

### SYNC-C1: 開始確認（即時開始可能）

**WS-C は他 WS への依存なし。即時開始可能。**

```
🟢 SYNC-C1 開始確認

WS-C は独立して実行可能です。
- WS-D 依存: なし（CI なしでも型定義は可能）
- WS-A 依存: なし
- WS-B 依存: なし

即時開始します。

C-01 から開始しますか？ [y/n]
```

---

### SYNC-C2: 型定義レビュー（C-01 完了後）

**必須報告:**

```
📝 WS-C 型定義レポート

## 作成ファイル
- `lib/types/todo.ts`

## 定義した型

### Suit（4象限）
\`\`\`typescript
type Suit = 'spade' | 'heart' | 'diamond' | 'club';
\`\`\`

### ElasticLevel（松竹梅）
\`\`\`typescript
type ElasticLevel = 'ume' | 'take' | 'matsu';
\`\`\`

### Task
\`\`\`typescript
interface Task {
  id: string;
  title: string;
  suit: Suit;
  // ... 主要プロパティ
}
\`\`\`

## Phase 10 要件との整合性
| 要件 | 対応状況 |
|------|---------|
| Eisenhower Matrix | ✅ Suit で対応 |
| Elastic Habits | ✅ ElasticLevel で対応 |
| サブタスク | ✅ SubTask[] で対応 |
| ストリーク | ✅ streakCount で対応 |

## 他 WS への通知
- WS-B: `lib/types/todo.ts` が利用可能になりました

C-02（Zod スキーマ）に進みますか？ [y/n]
```

---

### SYNC-C3: Lint 中間チェック（C-03, C-05, C-06 完了後）

**確認内容:** 現在の Lint 状況を確認

```bash
# 確認コマンド
npm run lint 2>&1 | grep -E "(error|warning)" | head -20
```

**必須報告:**

```
📊 WS-C Lint 中間レポート

## 現在の警告数

| カテゴリ | Before | After | 目標 | 達成 |
|---------|--------|-------|------|------|
| no-explicit-any | ~40 | ___ | 20 | ✅/❌ |
| no-unused-vars | ~20 | ___ | 10 | ✅/❌ |
| exhaustive-deps | 2 | ___ | 0 | ✅/❌ |

## 修正したファイル
1. `lib/types/app-data.ts` - any → 具体型
2. `lib/hooks/useClients.ts` - any → Client[]
3. ...

## 残存する any 型（上位5件）
| ファイル | 行 | 理由 |
|----------|-----|------|
| ... | ... | 外部ライブラリ型 |

## ブロッカー
- なし / あれば記載

C-04, C-07, C-08 に進みますか？ [y/n]
```

---

### SYNC-C4: WS-D CI 連携確認（C-07 開始前）

**確認内容:** 技術負債スキャナーが CI に組み込まれているか

```bash
# 確認コマンド
ls -la scripts/report-tech-debt.cjs
grep -l "tech-debt" .github/workflows/*.yml 2>/dev/null
```

**判定:**
- ✅ CI 連携済み → 型定義変更が自動検証される
- ❌ 未連携 → ローカルで手動確認

```
🔄 SYNC-C4 CI 連携確認

WS-D 技術負債スキャナー状況:
- scripts/report-tech-debt.cjs: 存在する / しない
- CI 連携: 設定済み / 未設定

設定済みの場合、PR で自動的に any 型数がレポートされます。

続行しますか？ [y/n]
```

---

### SYNC-C5: 最終レポート（C-08 完了後）

**必須報告:**

```
✅ WS-C 完了レポート

## 達成状況
| 指標 | Before | After | 目標 | 達成 |
|------|--------|-------|------|------|
| no-explicit-any | ~40 | ___ | 20以下 | ✅/❌ |
| no-unused-vars | ~20 | ___ | 10以下 | ✅/❌ |
| exhaustive-deps | 2 | ___ | 0 | ✅/❌ |

## 作成ファイル
| ファイル | 内容 |
|----------|------|
| `lib/types/todo.ts` | Phase 10 型定義 |
| `lib/core/validator.ts` | Zod スキーマ |
| `docs/OFFLINE-SYNC-STRATEGY.md` | オフライン戦略 |
| `app/_components/todo/index.ts` | コンポーネント骨格 |

## Phase 10 準備状況
| 項目 | 状態 |
|------|------|
| Task 型 | ✅ 定義済み |
| Validator | ✅ 実装済み |
| コンポーネント骨格 | ✅ 作成済み |
| オフライン戦略 | ✅ 設計済み |

## 他 WS への影響
- WS-B: `lib/types/todo.ts` を参照可能
- WS-D: 技術負債スキャナーで any 型監視推奨

WS-C 完了。Phase 9.94 統合待ち。
```

---

## 実行開始

上記を理解したら、SYNC-C1 を確認して即時開始してください。
WS-C は独立しているため、他 WS の完了を待たずに開始できます。
```

---

## 使用方法

1. Claude Code を起動
2. 上記プロンプトをコピー＆ペースト
3. WS-C が自動的に開始され、同期ポイントで停止・報告

