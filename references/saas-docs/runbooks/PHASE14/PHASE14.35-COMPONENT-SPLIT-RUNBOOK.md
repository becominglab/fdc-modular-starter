# Phase 14.35: 巨大コンポーネント分割 Runbook

| 項目 | 内容 |
|------|------|
| **Status** | **Complete** |
| **Phase** | 14.35（PHASE14.4マルチテナント対応の前提作業） |
| **目的** | AIによる機能追加時のコンテキスト負荷軽減 |
| **戦略** | 先に分割してから機能追加（AI最適化アプローチ） |
| **完了日** | 2025-12-02 |

---

## 1. 最終結果

### 500行以上のファイル: 0件

すべての巨大コンポーネントを500行以下に分割完了。

| 項目 | 数量 |
|------|------|
| 分割完了 | **28ファイル** |
| 残り（500行以上） | **0ファイル** |
| 総削減率 | **約65%** |

---

## 2. 分割完了一覧

### 2.1 第1バッチ（11ファイル）

| # | コンポーネント | 分割前 | 分割後 | 削減率 |
|---|---------------|--------|--------|--------|
| 1 | AdminTab.tsx | 1791 | ~250 | ~86% |
| 2 | ClientsManagement.tsx | 1191 | ~200 | ~83% |
| 3 | leads/page.tsx | 1180 | ~180 | 85% |
| 4 | ProspectsManagement.tsx | 1063 | ~250 | ~76% |
| 5 | EmailScriptTab.tsx | 1421 | ~280 | ~80% |
| 6 | LeanCanvasTab.tsx | 1299 | ~110 | ~92% |
| 7 | OrgManagement.tsx | 1229 | ~300 | ~76% |
| 8 | brand/page.tsx | 985 | ~300 | ~70% |
| 9 | UnifiedMVVTab.tsx | 979 | ~300 | ~69% |
| 10 | TemplatesTab.tsx | 907 | 199 | 78% |
| 11 | TodaySchedule.tsx | 830 | 328 | 60% |

### 2.2 第2バッチ - Track A: Todo系（5ファイル）

| # | ファイル | 分割前 | 分割後 | 削減率 |
|---|---------|--------|--------|--------|
| 12 | UmeHabitManager.tsx | 783 | 260 | 66.8% |
| 13 | TaskFormModal.tsx | 756 | 352 | 53.4% |
| 14 | TaskHistoryReport.tsx | 750 | 147 | 80.4% |
| 15 | TaskBoardTab.tsx | 712 | 200 | 71.9% |
| 16 | ElasticHabitsPanel.tsx | 711 | 221 | 68.9% |

### 2.3 第2バッチ - Track B: 設定・管理系（4ファイル）

| # | ファイル | 分割前 | 分割後 | 削減率 |
|---|---------|--------|--------|--------|
| 17 | SettingsTab.tsx | 691 | 156 | 77.4% |
| 18 | sa-workspace-members/route.ts | 590 | 25 | 95.8% |
| 19 | clients/page.tsx | 580 | 208 | 64.1% |
| 20 | settings/security/page.tsx | 567 | 247 | 56.4% |

### 2.4 第2バッチ - Track C: レポート・分析系（4ファイル）

| # | ファイル | 分割前 | 分割後 | 削減率 |
|---|---------|--------|--------|--------|
| 21 | ReportsContent.tsx | 638 | 388 | 39.2% |
| 22 | LostDealsTab.tsx | 605 | 223 | 63.1% |
| 23 | ReportsTab.tsx | 562 | 291 | 48.2% |
| 24 | TodoBoard.tsx | 510 | 280 | 45.1% |

### 2.5 第2バッチ - Track D: その他（4ファイル）

| # | ファイル | 分割前 | 分割後 | 削減率 |
|---|---------|--------|--------|--------|
| 25 | BrandTab.tsx | 626 | 171 | 72.7% |
| 26 | LeanCanvasSectionContent.tsx | 611 | 75 | 87.7% |
| 27 | OrgChartTab.tsx | 519 | 204 | 60.7% |
| 28 | dashboard/page.tsx | 507 | 145 | 71.4% |

---

## 3. 分割パターン（参考）

### 3.1 ディレクトリ構造

```
app/_components/[component-name]/
├── ComponentName.tsx           # メイン（300行以下）
└── [component-name]/           # サブディレクトリ（kebab-case）
    ├── index.ts               # 再エクスポート
    ├── types.ts               # 型定義
    ├── constants.ts           # 定数
    ├── utils.ts               # ユーティリティ
    ├── SubComponent1.tsx      # サブコンポーネント（300行以下）
    └── SubComponent2.tsx
```

### 3.2 分割判断基準

| 抽出対象 | 条件 |
|---------|------|
| **モーダル/ダイアログ** | 独立したUI状態を持つ |
| **テーブル/リスト** | データ表示ロジックが複雑 |
| **フォーム** | バリデーション含む |
| **アクションボタン群** | 複数操作をまとめたUI |
| **フィルター/検索** | 状態管理が独立 |

---

## 4. DOD（Definition of Done）

### Phase 14.35 完了条件 - すべて達成

- [x] 優先度「高」（AdminTab, ClientsManagement, leads/page）分割完了
- [x] `friendly-driscoll` を main にマージ
- [x] 残り17ファイルの4並列分割完了
- [x] **500行以上のファイルが0件に削減**
- [x] PHASE14.4 マルチテナント対応を開始可能

---

## 5. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [PHASE14.4 マルチテナント](./PHASE14.4-FDC-MULTITENANT-WORKSPACE-RUNBOOK.md) | 本Phaseの後続作業 |
| [FDC Grand Guide](../FDC-GRAND-GUIDE.md) | 全体設計ガイド |

---

---

## 6. 第3バッチ: 追加分割（Phase 14.35-B）

### 6.1 背景

2025-12-03 の再調査で、以下の4ファイルが500行以上に成長していることを確認：

| ファイル | 行数 | 分類 |
|---------|------|------|
| `useLeanCanvasViewModel.ts` | 598 | ViewModel Hook |
| `useActionMapViewModel.ts` | 560 | ViewModel Hook（統合レイヤー） |
| `EditTenantModal.tsx` | 516 | UIコンポーネント |
| `SADashboard.tsx` | 503 | UIコンポーネント |

### 6.2 分割判断

| ファイル | 判断 | 理由 |
|---------|------|------|
| `useLeanCanvasViewModel.ts` | ❌ 分割不要 | ロジックはセクション分離済み、共通APIを使用。分割すると複雑性増加 |
| `useActionMapViewModel.ts` | ❌ 既に分割済み | 統合レイヤーとして設計。実ロジックは `useActionMapCRUD` / `useActionItemCRUD` / `useActionMapProgress` に委譲済み |
| `EditTenantModal.tsx` | ✅ 分割実施 | スタイル174行、ユーティリティ30行を分離可能 |
| `SADashboard.tsx` | ✅ 分割実施 | テナント管理ロジック100行をカスタムHookに抽出可能 |

### 6.3 分割計画

#### 6.3.1 EditTenantModal.tsx（516行 → ~312行）

**分割内容:**

| 分割先 | 行数 | 内容 |
|-------|------|------|
| `lib/utils/color.ts` | ~30行 | `hexToRgb`, `rgbToHex`, `calculateDarkPreview`, `calculateLightPreview` |
| `EditTenantModal.styles.ts` | ~174行 | `styles` オブジェクト |
| `EditTenantModal.tsx` | ~312行 | コンポーネント本体（分離後） |

**メリット:**
- カラーユーティリティは他コンポーネントでも再利用可能
- スタイルの分離でコンポーネントの可読性向上

#### 6.3.2 SADashboard.tsx（503行 → ~380行）

**分割内容:**

| 分割先 | 行数 | 内容 |
|-------|------|------|
| `lib/hooks/useTenantManagement.ts` | ~120行 | テナントCRUD操作（fetch, create, edit, delete） |
| `SADashboard.tsx` | ~380行 | コンポーネント本体（分離後） |

**メリット:**
- テナント管理ロジックの再利用性向上
- SADashboard のテスタビリティ向上
- 関心の分離（UI vs ビジネスロジック）

### 6.4 実施結果

| # | ファイル | 分割前 | 分割後 | 削減率 | ステータス |
|---|---------|--------|--------|--------|-----------|
| 29 | EditTenantModal.tsx | 516 | 286 | 44.6% | ✅ 完了 |
| 30 | SADashboard.tsx | 503 | 399 | 20.7% | ✅ 完了 |

### 6.5 新規作成ファイル

| ファイル | 行数 | 内容 |
|---------|------|------|
| `lib/utils/color.ts` | 66 | カラー計算ユーティリティ（hex/rgb変換、明暗計算） |
| `app/_components/admin/sa-dashboard/EditTenantModal.styles.ts` | 205 | EditTenantModal用スタイル定義 |
| `lib/hooks/useTenantManagement.ts` | 206 | テナントCRUD操作Hook |

### 6.6 分割不要と判断したファイル

| ファイル | 行数 | 理由 |
|---------|------|------|
| `useLeanCanvasViewModel.ts` | 598 | ロジックはセクション分離済み。共通APIを使用しており、分割すると複雑性が増加 |
| `useActionMapViewModel.ts` | 560 | 統合レイヤーとして設計済み。実ロジックは別Hook（CRUD/Progress）に委譲済み |

---

*作成日: 2025-11-29*
*完了日: 2025-12-02 - 28ファイル分割完了、500行以上のファイル0件達成*
*追記日: 2025-12-03 - 第3バッチ（Phase 14.35-B）追加分割完了（30ファイル分割達成）*
