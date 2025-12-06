# Performance Baseline (Phase 9.93-B)

**計測日:** 2025-11-25
**計測環境:** Next.js 15.5.6, Node.js 24.5.0
**担当:** Phase 9.93-B Performance Workstream

---

## 1. 基準値サマリ

| 指標 | 基準値 (Phase 9.92完了時) | Phase 9.93-B 後 | 改善率 | 達成状況 |
|------|--------------------------|----------------|--------|---------|
| 初期バンドルサイズ（共有） | 102 KB | 102 KB | 0% | - (変更なし) |
| Dashboard First Load JS | **177 KB** | **145 KB** | **-18%** | ✅ 達成 |
| Login First Load JS | 157 KB | 157 KB | 0% | - (対象外) |
| Reports First Load JS | 106 KB | 106 KB | 0% | - (動的ロード化) |
| Total static/chunks | 1.5 MB | 1.2 MB | -20% | ✅ 達成 |

---

## 2. 詳細バンドルサイズ

### 2.1 ルート別 First Load JS

| ルート | Size | First Load JS |
|--------|------|---------------|
| `/` (root) | 146 B | 102 kB |
| `/dashboard` | 56.2 kB | 177 kB |
| `/login` | 55 kB | 157 kB |
| `/leads` | 9.53 kB | 111 kB |
| `/clients` | 4.91 kB | 107 kB |
| `/reports` | 3.98 kB | 106 kB |
| `/brand` | 5.33 kB | 107 kB |
| `/mvv` | 4.82 kB | 107 kB |
| `/settings` | 561 B | 113 kB |
| `/admin` | 1.35 kB | 107 kB |
| `/admin/sa` | 1.99 kB | 108 kB |
| `/admin/system` | 2.61 kB | 105 kB |

### 2.2 共有チャンク

| チャンク | サイズ |
|---------|--------|
| `493-*.js` (React base) | 168 KB |
| `4bd1b696-*.js` (dependencies) | 169 KB |
| `598-*.js` (UI components) | 201 KB |
| `framework-*.js` | 185 KB |
| `main-*.js` | 125 KB |
| `polyfills-*.js` | 110 KB |
| **合計 First Load JS shared** | **102 kB** |

### 2.3 静的アセット

| ディレクトリ | サイズ |
|-------------|--------|
| `.next/static/chunks/` | 1.5 MB |
| `.next/static/` (total) | 1.5 MB |

---

## 3. 最適化対象

### 3.1 コード分割対象（next/dynamic）

| 優先度 | コンポーネント | 理由 | ステータス |
|--------|---------------|------|-----------|
| 高 | `ZoomScriptTab` | 大きな静的コンテンツ、ダッシュボードから分離可能 | 🔄 実施中 |
| 高 | `TemplatesTab` | 独立したタブ、遅延ロード可能 | 🔄 実施中 |
| 高 | `ReportsTab` | 独立したタブ、遅延ロード可能 | 🔄 実施中 |
| 中 | `LeanCanvasTab` | 独立したタブ | 📋 計画中 |
| 中 | `AdminTab` / `SADashboard` | 管理者のみ使用 | 📋 計画中 |

### 3.2 現在の問題点

1. **Dashboard ページが巨大 (56.2 KB)**
   - すべてのタブコンポーネントを静的 import している
   - ZoomScriptTab, TemplatesTab, ReportsTab などが初期ロード時に含まれる

2. **共有チャンクの肥大化**
   - framework (185 KB) + dependencies (169 KB) = 354 KB が共通で読み込まれる

3. **Lucide React アイコン**
   - 多数のアイコンがバンドルに含まれている

---

## 4. 改善計画

### Phase 9.93-B 目標

1. **PERF-02: next/dynamic によるコード分割**
   - ZoomScriptTab, TemplatesTab, ReportsTab を動的インポート化
   - 期待効果: Dashboard First Load JS を 15-20% 削減

2. **PERF-03: RSC PoC**
   - Reports タブで Server Components を検証
   - 期待効果: バンドルサイズ削減 + TTFB 改善

3. **PERF-05: CI 自動チェック導入**
   - `scripts/check-bundle-size.js` でビルドサイズを自動監視
   - しきい値超過時に警告

---

## 5. Lighthouse 基準値

> **注意**: Lighthouse 計測は本番環境または `next start` での計測が必要です。
> 開発環境での計測は参考値となります。

### 目標スコア

| 指標 | 目標値 |
|------|--------|
| Performance | 70+ |
| First Contentful Paint (FCP) | < 1.8s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.8s |
| Total Blocking Time (TBT) | < 200ms |
| Cumulative Layout Shift (CLS) | < 0.1 |

---

## 6. 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2025-11-25 | 初回計測・ドキュメント作成 |

---

**次のアクション:**
1. PERF-02: next/dynamic を適用
2. 再ビルドしてサイズ変化を計測
3. PERF-03: RSC PoC を実施
