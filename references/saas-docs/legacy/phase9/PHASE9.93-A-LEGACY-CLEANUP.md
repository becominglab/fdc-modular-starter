# Phase 9.93-A: レガシー隔離 & CI自動化

**最終更新:** 2025-11-25
**ステータス:** 待機中（Phase 9.92 完了後に開始）
**並列ワークストリーム:** A（4並列中）
**依存関係:** なし（最初に着手可能）

---

## 必読ドキュメント（作業開始前に必ず確認）

| ドキュメント | パス | 確認項目 |
|-------------|------|---------|
| **グランドガイド** | `docs/FDC-GRAND-GUIDE.md` | プロジェクト全体方針、AIチーム運用ルール |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | 基本ルール、ファイル命名規則、コーディング規約 |
| **統括ランブック** | `docs/PHASE9.93-BUGFIX-RUNBOOK.md` | Phase 9.93 全体の DOD、他ワークストリームとの関係 |

---

## 0. ワークストリーム概要

### 0.1 目的

レガシーコードの完全隔離と、逆流防止のCI自動化を実施する。

### 0.2 スコープ

| タスクID | タスク名 | 元フェーズ |
|---------|---------|-----------|
| CL-01 | Legacy Archiving | Phase 9.91 |
| CL-02 | Root Cleaning | Phase 9.91 |
| CL-03 | Docs Renaming | Phase 9.91 |
| CL-04 | Config Update | Phase 9.91 |
| NEW | ESLint archive禁止ルール | Phase 9.93 |
| NEW | CI自動検出スクリプト | Phase 9.93 |

### 0.3 完了条件（DOD）

- [ ] ルートに `js/` フォルダが存在しない
- [ ] `archive/` からの import が ESLint で検出される
- [ ] CI で archive 参照が自動ブロックされる
- [ ] `npm run lint` がエラー 0 で Pass
- [ ] `npm run build` がエラー 0 で Pass

---

## 1. タスク詳細

### 1.1 CL-01: Legacy Archiving（確認）

**ステータス:** ✅ 済み（確認のみ）

**確認項目:**
- [x] ルートに `js/` フォルダが存在しない
- [ ] `archive/phase9-legacy-js/` にレガシーコードが保存されている
- [ ] `archive/` 内のファイルがビルド対象から除外されている

**確認コマンド:**
```bash
# js/ が存在しないことを確認
ls -la | grep "^d.*js$"  # 出力なしなら OK

# archive 内のファイル確認
ls -la archive/
```

---

### 1.2 CL-02: Root Cleaning（確認・整理）

**目的:** ルートディレクトリの整理状況を確認

**確認項目:**
- [ ] ルートディレクトリに不要な一時ファイルがない
- [ ] スクリプトファイルの配置が適切

**現状の許容:**
以下のファイルはルートに残して OK（Next.js/Node.js プロジェクトの標準構成）:
- `package.json`, `package-lock.json`
- `next.config.mjs`, `tsconfig.json`
- `playwright.config.ts`, `eslint.config.mjs`
- `middleware.ts`
- `.gitignore`, `.vercelignore`
- `README.md`

**整理対象（任意）:**
| ファイル | 現在地 | 移動先（任意） |
|---------|--------|---------------|
| `benchmark.cjs` | ルート | `scripts/performance/` |
| `test-connection.cjs` | ルート | `scripts/db/` |
| `test-crud.cjs` | ルート | `scripts/db/` |
| `run-migrations.cjs` | ルート | `scripts/db/` |

**注意:** 移動する場合は `package.json` の scripts も更新すること

---

### 1.3 CL-03: Docs Renaming（確認）

**ステータス:** ✅ 済み（確認のみ）

**確認項目:**
- [x] フォルダ名が `docs/`（小文字）になっている
- [ ] 内部リンクに `DOCS/` への参照が残っていない

**確認コマンド:**
```bash
# DOCS/ への参照を検索
grep -r "DOCS/" docs/ --include="*.md"
# 出力があれば修正が必要
```

---

### 1.4 CL-04: Config Update（確認）

**確認項目:**
- [ ] `tsconfig.json` の `exclude` に `archive` が含まれている
- [ ] `tsconfig.json` の `include` が適切
- [ ] 旧パス参照 `from '../../js/...'` が存在しない

**確認コマンド:**
```bash
# 旧パス参照を検索
grep -r "from ['\"].*js/" app/ lib/ --include="*.ts" --include="*.tsx"
# 出力があれば修正が必要

# tsconfig.json の exclude 確認
cat tsconfig.json | grep -A5 "exclude"
```

---

## 2. ESLint archive禁止ルール（新規）

### 2.1 目的

`archive/` からの import を自動検出し、レガシーコードの逆流を防止する。

### 2.2 実装

**eslint.config.mjs に追加:**
```javascript
// eslint.config.mjs
export default [
  // ... 既存設定
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/archive/**'],
            message: 'archive/ からの import は禁止です。lib/ または app/ を使用してください。'
          },
          {
            group: ['../../js/**', '../js/**', './js/**'],
            message: '旧 js/ パスは廃止されました。lib/ を使用してください。'
          }
        ]
      }]
    }
  }
];
```

### 2.3 検証

```bash
# ESLint 実行
npm run lint

# 禁止パターンのテスト（一時的にテストファイルを作成）
echo "import { test } from '../archive/test';" > /tmp/test-import.ts
npx eslint /tmp/test-import.ts  # エラーが出れば OK
rm /tmp/test-import.ts
```

---

## 3. CI自動検出スクリプト（新規）

### 3.1 目的

CI パイプラインで archive 参照を自動検出し、PR をブロックする。

### 3.2 スクリプト作成

**scripts/check-legacy-imports.sh:**
```bash
#!/bin/bash
# scripts/check-legacy-imports.sh
# レガシーコードへの参照を検出するスクリプト

set -e

echo "🔍 Checking for legacy imports..."

# archive/ からの import を検索
ARCHIVE_IMPORTS=$(grep -r "from ['\"].*archive" app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 旧 js/ パスを検索
JS_IMPORTS=$(grep -r "from ['\"].*js/" app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# 結果判定
if [ -n "$ARCHIVE_IMPORTS" ] || [ -n "$JS_IMPORTS" ]; then
  echo "❌ ERROR: Legacy imports detected!"
  echo ""
  if [ -n "$ARCHIVE_IMPORTS" ]; then
    echo "=== archive/ imports ==="
    echo "$ARCHIVE_IMPORTS"
  fi
  if [ -n "$JS_IMPORTS" ]; then
    echo "=== js/ imports ==="
    echo "$JS_IMPORTS"
  fi
  echo ""
  echo "Please update these imports to use lib/ or app/ instead."
  exit 1
fi

echo "✅ No legacy imports found."
exit 0
```

**実行権限付与:**
```bash
chmod +x scripts/check-legacy-imports.sh
```

### 3.3 package.json への追加

```json
{
  "scripts": {
    "check:legacy": "bash scripts/check-legacy-imports.sh",
    "lint:all": "npm run lint && npm run check:legacy"
  }
}
```

### 3.4 GitHub Actions への追加（任意）

**.github/workflows/ci.yml に追加:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run check:legacy
```

---

## 4. 実行順序

```
1. CL-01 確認（5分）
   ↓
2. CL-03 確認（5分）
   ↓
3. CL-04 確認（10分）
   ↓
4. ESLint ルール追加（15分）
   ↓
5. CI スクリプト作成（15分）
   ↓
6. 動作検証（10分）
   ↓
7. CL-02 整理（任意、30分）
```

**合計推定時間:** 1〜1.5時間

---

## 5. 完了チェックリスト

| # | 項目 | 確認 |
|---|------|------|
| 1 | `js/` フォルダが存在しない | [ ] |
| 2 | `archive/` 内にレガシーコードが保存されている | [ ] |
| 3 | `docs/` が小文字になっている | [ ] |
| 4 | `DOCS/` への参照が 0 件 | [ ] |
| 5 | `tsconfig.json` で archive が exclude されている | [ ] |
| 6 | 旧パス参照 `from '../../js/...'` が 0 件 | [ ] |
| 7 | ESLint `no-restricted-imports` ルールが動作する | [ ] |
| 8 | `npm run check:legacy` が Pass | [ ] |
| 9 | `npm run lint` が Pass | [ ] |
| 10 | `npm run build` が Pass | [ ] |

---

## 6. 次のワークストリームへの引き継ぎ

### 6.1 他ワークストリームへの影響

| ワークストリーム | 影響 |
|----------------|------|
| B（パフォーマンス） | なし |
| C（UI検証） | なし |
| D（UAT・ゲート） | ESLint Pass が前提条件 |

### 6.2 完了報告フォーマット

```markdown
## Phase 9.93-A 完了報告

**完了日時:** YYYY-MM-DD HH:MM
**担当:** [名前]

### 実施内容
- [ ] CL-01〜04 確認完了
- [ ] ESLint ルール追加
- [ ] CI スクリプト作成

### 検証結果
- `npm run lint`: Pass / Fail
- `npm run check:legacy`: Pass / Fail
- `npm run build`: Pass / Fail

### 残課題
- （あれば記載）

### 備考
- （特記事項があれば記載）
```

---

**次のドキュメント:** `PHASE9.93-B-PERFORMANCE.md`
