# CSS 移行方針決定書（Phase 9.93-B）

**作成日:** 2025-11-25
**担当:** Phase 9.93-B Performance Workstream
**ステータス:** 決定済み

---

## 1. 概要

Phase 9.92 で旧 UI を React に移行した際、すべてのスタイルは `app/globals.css` に集約されている。本ドキュメントでは、今後の CSS 管理方針を決定する。

---

## 2. 現状分析

### 2.1 globals.css の状態

| 指標 | 値 |
|------|-----|
| 総行数 | 786 行 |
| CSS 変数 | 16 変数（`:root` に定義） |
| グローバルスタイル | 約 200 行 |
| コンポーネント固有スタイル | 約 500 行 |
| アニメーション | 約 80 行 |

### 2.2 問題点

| 問題 | 影響 |
|------|------|
| **クラス名の衝突リスク** | グローバルスコープのため、同名クラスが衝突する可能性 |
| **保守性の低下** | 786 行の単一ファイルは見通しが悪い |
| **未使用 CSS の残存** | 旧 UI からの移行で不要になったスタイルが残っている可能性 |
| **コロケーションの欠如** | コンポーネントとスタイルが離れており、変更時の影響把握が困難 |

### 2.3 現在の CSS 構造

```
app/globals.css (786行)
├── Global Reset & Base Styles
├── CSS Variables (Legacy UI Theme)
├── Body & HTML
├── Typography
├── Animations
├── Layout (container, tabs, sections)
├── Cards & Buttons
├── Forms & Inputs
├── Dashboard Components
├── Prospects/Clients Components
├── Admin Components
└── Utility Classes
```

---

## 3. 選択肢の比較

### Option A: Tailwind CSS

**メリット:**
- ユーティリティファーストで高速開発
- ビルド時に未使用クラスを削除（PurgeCSS）
- Next.js と良好に統合
- エコシステムが充実

**デメリット:**
- 既存 CSS の書き直しが必要
- 学習コストが高い
- JSX 内にクラス名が多くなり可読性が低下する可能性

**移行コスト:** 高（全コンポーネントの書き直し）

### Option B: CSS Modules

**メリット:**
- スコープが自動的に分離される
- 既存の CSS 知識がそのまま使える
- 段階的な移行が可能
- コロケーション（コンポーネントと同じディレクトリにスタイル配置）

**デメリット:**
- ファイル数が増加
- 動的スタイルの扱いがやや面倒
- グローバルスタイルとの共存が必要

**移行コスト:** 中（段階的移行可能）

### Option C: CSS-in-JS (styled-components / emotion)

**メリット:**
- JavaScript との完全な統合
- 動的スタイルが容易
- スコープが完全に分離

**デメリット:**
- ランタイムオーバーヘッド
- SSR での複雑性
- Next.js 15 の RSC との相性問題

**移行コスト:** 高（パラダイムシフト）

### Option D: 現状維持 + 整理

**メリット:**
- 追加の学習コストなし
- 即座に効果が出る
- リスクが低い

**デメリット:**
- 根本的な問題は解決しない
- スケーラビリティに限界

**移行コスト:** 低

---

## 4. 決定

### 選択: **Option B: CSS Modules**（段階的移行）+ **Option D: 現状整理**

**理由:**
1. 既存の CSS 知識を活かせる
2. 段階的な移行が可能でリスクが低い
3. Next.js との相性が良い（ネイティブサポート）
4. コロケーションによる保守性向上
5. 短期的には globals.css を整理して即効性を確保

---

## 5. 移行計画

### Phase 1: globals.css の整理（Phase 9.93 内）

**目標:** globals.css の行数を 50% 削減

**作業内容:**
1. 未使用 CSS セレクタの特定と削除
2. 重複スタイルの統合
3. CSS 変数の整理
4. コメントの追加による構造化

**対象セレクタ（削除候補）:**
- 旧 UI 固有のクラス（`.legacy-*`）
- 未使用のアニメーション
- 重複したカラー定義

### Phase 2: 新規コンポーネントは CSS Modules で実装（Phase 10 以降）

**ルール:**
```
新規コンポーネント作成時:
├── app/_components/example/
│   ├── Example.tsx
│   └── Example.module.css  ← CSS Modules を使用
```

**例:**
```tsx
// app/_components/example/Example.tsx
import styles from './Example.module.css';

export function Example() {
  return <div className={styles.container}>...</div>;
}
```

```css
/* app/_components/example/Example.module.css */
.container {
  padding: 20px;
  border-radius: 8px;
  background: var(--glass);  /* グローバル変数は継続使用 */
}
```

### Phase 3: 既存コンポーネントの段階的移行（Phase 10-11）

**優先度順:**
| 優先度 | コンポーネント | 理由 |
|--------|---------------|------|
| 高 | KPICards | 頻繁に変更される可能性 |
| 高 | ConversionFunnel | 複雑なスタイル |
| 中 | ProspectsManagement | 大規模コンポーネント |
| 中 | ClientsManagement | 大規模コンポーネント |
| 低 | SettingsTab | 変更頻度が低い |

---

## 6. グローバル CSS 変数の維持

CSS Modules 移行後も、以下のグローバル変数は `globals.css` に残す:

```css
/* app/globals.css - 維持するセクション */
:root {
  /* カラーテーマ */
  --primary: #00B8C4;
  --primary-dark: #008A94;
  --text-dark: #111111;
  --text-light: #555555;
  --bg-gradient: linear-gradient(135deg, #f8feff 0%, #f0f9fa 100%);
  --border: #E3E3E3;
  --success: #4CAF50;
  --warning: #FF9800;
  --error: #F44336;
  --shadow: 0 4px 20px rgba(0, 184, 196, 0.1);
  --glass: rgba(255, 255, 255, 0.8);
}
```

CSS Modules 内から参照:
```css
/* Example.module.css */
.card {
  background: var(--glass);       /* OK: グローバル変数を参照 */
  border: 1px solid var(--border);
}
```

---

## 7. 完了条件

### Phase 9.93 内

- [x] CSS 移行方針が決定されている（本ドキュメント）
- [ ] globals.css の未使用セレクタを特定（TODO: Phase 9.93 残タスク）
- [ ] コメントによる構造化（TODO: Phase 9.93 残タスク）

### Phase 10 以降

- [ ] 新規コンポーネントは CSS Modules で実装
- [ ] KPICards を CSS Modules に移行
- [ ] ConversionFunnel を CSS Modules に移行
- [ ] globals.css の行数が 400 行以下

---

## 8. 参考

- [Next.js CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
- [CSS Variables MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

**最終更新:** 2025-11-25
**次のアクション:** Phase 10 で新規コンポーネントに CSS Modules を適用
