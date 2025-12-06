# Phase 9.94-B: UX向上ワークストリーム

**作成日:** 2025-11-25
**親ランブック:** `docs/PHASE9.94-POLISH-RUNBOOK.md`
**担当:** ____
**期間:** Day 1-5

---

## 1. 目的

アクセシビリティ基準（WCAG 2.1 AA）を満たし、モバイル体験を最適化する。

---

## 2. 必読ドキュメント

| ドキュメント | パス | 確認 |
|-------------|------|------|
| **Phase 9.94 メインランブック** | `docs/PHASE9.94-POLISH-RUNBOOK.md` | [ ] |
| **開発ガイド** | `docs/guides/DEVELOPMENT.md` | [ ] |
| **CSS 移行方針** | `docs/CSS-MIGRATION-DECISION.md` | [ ] |

---

## 3. 現状と目標

| 指標 | 現状 | 目標 | 根拠 |
|------|------|------|------|
| Lighthouse Accessibility | 未計測 | **95+** | WCAG 2.1 AA 準拠 |
| モバイル対応 | 基本対応 | **完全対応** | 全ページ 375px 対応 |
| キーボード操作 | 部分対応 | **完全対応** | Tab/Enter で全操作可能 |
| スクリーンリーダー | 未対応 | **基本対応** | aria-label 付与 |
| タッチターゲット | 不明 | **44px以上** | Apple HIG 基準 |

---

## 4. タスク一覧

| # | タスク | 期日 | 完了判定 | 完了 |
|---|--------|------|---------|------|
| B-01 | Accessibility 監査（axe DevTools） | Day 1 | 問題点リスト作成 | [ ] |
| B-02 | aria-label / role 属性追加 | Day 2 | 主要コンポーネント対応 | [ ] |
| B-03 | キーボードナビゲーション修正 | Day 2-3 | Tab 順序正常化 | [ ] |
| B-04 | カラーコントラスト修正 | Day 2 | WCAG AA 準拠（4.5:1） | [ ] |
| B-05 | モバイルブレークポイント見直し | Day 3 | 375px で崩れなし | [ ] |
| B-06 | タッチターゲット拡大 | Day 3 | 44px 以上 | [ ] |
| B-07 | フォーム要素のラベル関連付け | Day 3 | label/for 属性設定 | [ ] |
| B-08 | スキップリンク設置 | Day 4 | メインコンテンツへジャンプ | [ ] |
| B-09 | IA 再編検討資料作成 | Day 4-5 | ナビゲーション改善案 | [ ] |

---

## 5. 実装詳細

### 5.1 B-01: Accessibility 監査

**axe DevTools を使用:**
1. Chrome 拡張「axe DevTools」をインストール
2. 各ページで DevTools → axe タブ → 「Scan ALL of my page」
3. 問題点を以下のテンプレートに記録

```markdown
## アクセシビリティ監査結果

**監査日:** YYYY-MM-DD
**ツール:** axe DevTools v4.x

### Critical Issues
| ページ | 問題 | 要素 | 対処 |
|--------|------|------|------|
| /dashboard | | | |

### Serious Issues
| ページ | 問題 | 要素 | 対処 |
|--------|------|------|------|

### Moderate Issues
| ページ | 問題 | 要素 | 対処 |
|--------|------|------|------|
```

**CLI での監査:**
```bash
npx @axe-core/cli http://localhost:3000/dashboard
```

### 5.2 B-02: aria-label / role 属性追加

**対象コンポーネント:**

```tsx
// ナビゲーション
<nav aria-label="メインナビゲーション" role="navigation">
  <ul role="list">
    <li><a href="/dashboard" aria-current={isActive ? 'page' : undefined}>ダッシュボード</a></li>
  </ul>
</nav>

// ボタン（アイコンのみ）
<button aria-label="メニューを開く" onClick={handleOpen}>
  <MenuIcon aria-hidden="true" />
</button>

// モーダル
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">確認</h2>
  ...
</div>

// タブパネル
<div role="tablist" aria-label="ダッシュボードタブ">
  <button role="tab" aria-selected={active} aria-controls="panel-1">
    タブ1
  </button>
</div>
<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
  ...
</div>
```

### 5.3 B-03: キーボードナビゲーション修正

**チェックリスト:**
- [ ] Tab でフォーカスが論理的な順序で移動
- [ ] Enter/Space でボタン・リンクが動作
- [ ] Escape でモーダルが閉じる
- [ ] 矢印キーでタブ/メニュー内を移動

**フォーカストラップ（モーダル用）:**
```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### 5.4 B-04: カラーコントラスト修正

**WCAG AA 基準:**
- 通常テキスト: 4.5:1 以上
- 大きなテキスト（18pt以上/14pt太字以上）: 3:1 以上
- アイコン・グラフ: 3:1 以上

**チェックツール:**
- Chrome DevTools → Elements → Styles → コントラスト比表示
- https://webaim.org/resources/contrastchecker/

**現在のカラー確認と修正:**
```css
/* app/globals.css */
:root {
  --text-dark: #111111;    /* OK: 黒背景との比 */
  --text-light: #555555;   /* 要確認: 白背景との比 */
  --primary: #00B8C4;      /* 要確認: 白背景との比 */
}

/* 修正例 */
:root {
  --text-light: #4A4A4A;   /* コントラスト比改善 */
  --primary: #007B83;      /* より濃い色に変更 */
}
```

### 5.5 B-05: モバイルブレークポイント見直し

**ブレークポイント定義:**
```css
/* app/globals.css */
:root {
  --breakpoint-sm: 375px;   /* iPhone SE */
  --breakpoint-md: 768px;   /* iPad */
  --breakpoint-lg: 1024px;  /* iPad Pro */
  --breakpoint-xl: 1280px;  /* Desktop */
}

/* メディアクエリ例 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .sidebar.open {
    transform: translateX(0);
  }
}

@media (max-width: 375px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  .tab-list {
    overflow-x: auto;
    white-space: nowrap;
  }
}
```

**テストデバイス:**
- iPhone SE (375px)
- iPhone 14 (390px)
- iPad (768px)
- iPad Pro (1024px)

### 5.6 B-06: タッチターゲット拡大

**最小サイズ: 44px × 44px**

```css
/* ボタン */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* アイコンボタン */
.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* リンク（リスト内） */
.list-item a {
  display: block;
  padding: 12px 16px;
  min-height: 44px;
}

/* タブ */
.tab {
  min-height: 44px;
  padding: 12px 20px;
}
```

### 5.7 B-07: フォーム要素のラベル関連付け

```tsx
// 明示的な関連付け
<label htmlFor="email">メールアドレス</label>
<input id="email" type="email" name="email" />

// 暗黙的な関連付け（ラベルで囲む）
<label>
  メールアドレス
  <input type="email" name="email" />
</label>

// プレースホルダーはラベルの代わりにならない（NG）
<input type="email" placeholder="メールアドレス" /> // ❌

// 視覚的に隠したラベル（スクリーンリーダー用）
<label htmlFor="search" className="sr-only">検索</label>
<input id="search" type="search" placeholder="検索..." />
```

```css
/* スクリーンリーダー専用クラス */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 5.8 B-08: スキップリンク設置

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a href="#main-content" className="skip-link">
          メインコンテンツへスキップ
        </a>
        <header>...</header>
        <nav>...</nav>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  z-index: 100;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}
```

### 5.9 B-09: IA 再編検討資料

**現在のナビゲーション構造:**
```
Dashboard
├── Overview (KPI)
├── Leads タブ
├── Clients タブ
├── Reports タブ
├── Templates タブ
├── Lean Canvas タブ
├── TODO タブ
├── Zoom Scripts タブ
└── Settings (Admin)
```

**検討項目:**
- タブの論理的なグループ化
- 使用頻度に基づく優先順位
- モバイルでのアクセシビリティ
- ハンバーガーメニューの導入検討

---

## 6. 依存関係

| 依存先 | 内容 | 影響 |
|--------|------|------|
| なし | 独立して進行可能 | - |

---

## 7. 完了条件（DOD）

| # | 条件 | 検証方法 | 達成 |
|---|------|---------|------|
| 1 | Lighthouse Accessibility 95+ | Lighthouse レポート | [ ] |
| 2 | axe DevTools で Critical 0件 | 手動チェック | [ ] |
| 3 | 全ページ 375px で表示崩れなし | 実機確認 | [ ] |
| 4 | キーボードのみで主要操作可能 | 手動テスト | [ ] |
| 5 | タッチターゲット 44px 以上 | DevTools で計測 | [ ] |
| 6 | フォーム要素に label 関連付け | コードレビュー | [ ] |
| 7 | スキップリンクが動作 | 手動テスト | [ ] |
| 8 | IA 改善提案書が作成 | ドキュメント確認 | [ ] |

---

## 8. 日次進捗記録

| 日付 | 完了タスク | ブロッカー | 明日の予定 |
|------|-----------|-----------|-----------|
| Day 1 | | | |
| Day 2 | | | |
| Day 3 | | | |
| Day 4 | | | |
| Day 5 | | | |

---

**最終更新:** 2025-11-25
