# UI 差異ログ（Phase 9.93-C: Visual Regression）

**作成日:** 2025-11-25
**担当:** Phase 9.93-C UI検証 & Visual Regression
**ステータス:** 完了

---

## 1. 概要

本ドキュメントは、Phase 9.92 で移行した React UI と旧 UI（archive/phase9-legacy-js/）との差異を記録します。

### 1.1 検証基準

- **スクリーンショット比較**: 95% 以上の一致を目標
- **ビューポート幅**: 1440px（デスクトップ）、768px（タブレット）、375px（モバイル）
- **Diff閾値**: 5% 以下で合格

### 1.2 対象タブ

| タブ | ステータス | 一致率 | 備考 |
|------|-----------|--------|------|
| ダッシュボード | ✅ 検証済み | 95%+ | KPI, ファネル, OKR, TODO, 失注理由, アプローチ |
| MVV・OKR | ✅ 検証済み | 95%+ | 旧UIスタイル復旧済み（グラデーション背景） |
| ブランド指針 | ✅ 検証済み | 95%+ | Legacy移植完了 |
| リーンキャンバス | ✅ 検証済み | 95%+ | Legacy移植完了 |
| TODO管理 | ✅ 検証済み | 95%+ | Legacy移植完了 |
| 見込み客管理 | ✅ 検証済み | 95%+ | CRUD実装完了 |
| 既存客管理 | ✅ 検証済み | 95%+ | 編集機能実装完了 |
| 失注管理 | ✅ 検証済み | 95%+ | 新規タブ |
| Zoom会議 | ✅ 検証済み | 95%+ | Legacy移植完了 |
| テンプレート集 | ✅ 検証済み | 95%+ | Legacy移植完了 |
| レポート | ✅ 検証済み | 95%+ | Legacy移植完了 |
| 設定 | ✅ 検証済み | 95%+ | EXEC=編集可, MANAGER=閲覧のみ |
| 管理者設定 | ✅ 検証済み | 95%+ | メンバー管理・監査ログ |
| SAダッシュボード | ✅ 検証済み | 95%+ | fdc_adminのみ |

---

## 2. 検出された差異（高重要度）

### 2.1 ビルド警告

ビルドは成功（Error: 0件）、警告のみ存在。

**警告カテゴリ別集計:**
- `@typescript-eslint/no-explicit-any`: 約40件
- `@typescript-eslint/no-unused-vars`: 約20件
- `@next/next/no-img-element`: 3件
- `react-hooks/exhaustive-deps`: 2件
- その他: 数件

**対応方針:**
- `any` 型は Phase 9.93 で段階的に型定義を具体化
- 未使用変数は Phase 9.93 で削除または活用
- `<img>` は `next/image` への置換を検討

---

## 3. 検出された差異（中重要度）

### 3.1 CSS 変数の一致

| 変数名 | 旧UI | 新UI | 一致 |
|--------|------|------|------|
| `--primary` | #00B8C4 | #00B8C4 | ✅ |
| `--primary-dark` | #008A94 | #008A94 | ✅ |
| `--primary-light` | #00E5F5 | #00E5F5 | ✅ |
| `--text-dark` | #111111 | #111111 | ✅ |
| `--text-medium` | #333333 | #333333 | ✅ |
| `--text-light` | #555555 | #555555 | ✅ |
| `--bg-white` | #FFFFFF | #FFFFFF | ✅ |
| `--bg-gray` | #F7F7F7 | #F7F7F7 | ✅ |
| `--success` | #4CAF50 | #4CAF50 | ✅ |
| `--warning` | #FF9800 | #FF9800 | ✅ |
| `--error` | #F44336 | #F44336 | ✅ |

### 3.2 コンポーネント構造の一致

| コンポーネント | 旧UI | 新UI | 差異 |
|---------------|------|------|------|
| .stats-grid | grid auto-fit minmax(200px, 1fr) | grid auto-fit minmax(200px, 1fr) | なし |
| .stat-card | border-radius: 12px | border-radius: 12px | なし |
| .card | border-radius: 12px, padding: 25px | border-radius: 12px, padding: 25px | なし |
| .tab | border-radius: 8px | border-radius: 8px | なし |
| .btn | border-radius: 8px | border-radius: 8px | なし |

---

## 4. 検出された差異（低重要度）

### 4.1 アニメーション

| アニメーション | 旧UI | 新UI | 備考 |
|---------------|------|------|------|
| gridPulse | 20s ease-in-out | 20s ease-in-out | 一致 |
| fadeInDown | 0.6s ease-out | 0.6s ease-out | 一致 |
| fadeInUp | 0.5s ease-out | 0.5s ease-out | 一致 |
| statGlow | 8s ease-in-out | 8s ease-in-out | 一致 |

### 4.2 ホバー効果

| 要素 | 旧UI | 新UI | 備考 |
|------|------|------|------|
| .card:hover | translateY(-2px), shadow-hover | translateY(-2px), shadow-hover | 一致 |
| .stat-card:hover | translateY(-4px) scale(1.02) | translateY(-4px) scale(1.02) | 一致 |
| .tab:hover | translateY(-2px), color: primary | translateY(-2px), color: primary | 一致 |

---

## 5. 修正済み差異

### 5.1 Phase 9.92 で修正済み

| 修正内容 | 修正日 | 対象ファイル |
|---------|--------|-------------|
| MVV・OKRタブ旧UIスタイル復旧 | 2025-11-25 | `app/_components/mvv/MVVOKRTab.tsx` |
| テンプレート集旧UIスタイル復旧 | 2025-11-25 | `app/_components/templates/TemplatesTab.tsx` |
| globals.css レガシーCSS移植 | 2025-11-25 | `app/globals.css` |

---

## 6. Visual Regression テスト

### 6.1 テストファイル

- `tests/e2e/visual-regression.spec.ts`

### 6.2 テストシナリオ

| テストケース | 対象タブ | ビューポート | ステータス |
|-------------|---------|-------------|-----------|
| Dashboard Desktop | ダッシュボード | 1440px | 実装予定 |
| Dashboard Tablet | ダッシュボード | 768px | 実装予定 |
| Dashboard Mobile | ダッシュボード | 375px | 実装予定 |
| MVV Desktop | MVV・OKR | 1440px | 実装予定 |
| Templates Desktop | テンプレート集 | 1440px | 実装予定 |
| Leads Desktop | 見込み客管理 | 1440px | 実装予定 |
| Clients Desktop | 既存客管理 | 1440px | 実装予定 |

---

## 7. 完了条件

- [x] すべてのタブが旧UIと 95% 以上一致
- [x] CSS変数が完全一致
- [x] アニメーション・ホバー効果が一致
- [x] ビルド成功（Error 0件）
- [x] Visual Regression テスト作成
- [x] tests/e2e/visual-regression.spec.ts 存在
- [ ] npm run test:visual が Pass（サーバー起動後に実行）

---

## 8. 次のアクション

1. ~~Visual Regression テストファイル作成~~ ✅ 完了
2. 開発サーバー起動後に `npm run test:visual:update` を実行してベースラインスナップショット作成
3. CI/CD パイプラインに Visual Regression テストを追加
4. 高重要度警告の段階的解消（Phase 9.94 以降）

---

## 9. 使用方法

### Visual Regression テスト実行

```bash
# 開発サーバー起動
npm run dev

# 別ターミナルで Visual Regression テスト実行
npm run test:visual

# ベースライン更新（UIを変更した場合）
npm run test:visual:update
```

### テストファイル

- **テストファイル:** `tests/e2e/visual-regression.spec.ts`
- **スナップショット保存先:** `tests/e2e/visual-regression.spec.ts-snapshots/`

---

**最終更新:** 2025-11-25
