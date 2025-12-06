# Phase 14.6〜14.9 統合ランブック

**Version:** 4.0
**制定日:** 2025-12-03
**最終更新:** 2025-12-03

---

## 📋 概要

このランブックは以下のフェーズを統合しています：

- **Phase 14.6.6:** テーマカラーのマルチテナント対応
- **Phase 14.6.7:** 各タブのクエリ最適化
- **Phase 14.8:** パフォーマンス調査・改善
- **Phase 14.9:** UI/UX改善（LP、タスク表示、競合解決など）

---

## 📊 2025-12-03 変更履歴

### UI/UX改善

| コミット | 内容 |
|---------|------|
| `daa23b0` | ブランドガイドラインのアコーディオンアイコン色をメインカラーに統一 |
| `443619d` | ログイン画面にテナント固有テーマカラーを適用 |
| `bcf36fb` | タブ順序変更: レポートラインをダッシュボードの次に移動 |
| `cdff8f2` | SAテナント管理のアイコン色をプライマリカラーに統一 |
| `8e16545` | OKR/ActionMap選択カードをグレー背景に変更 + ホバー影修正 |
| `8600808` | Brand Guidelines 10-element update + Theme color fixes |
| `ac11b39` | タブホバー時の同系色シャドウを復元 |
| `782c690` | OKR・アクションマップの緑/青色をCSS変数に変更 |
| `e41231a` | テーマカラー対応: ハードコードされた色をCSS変数に変更 |
| `df0a80a` | 残りのハードコード色をCSS変数に変換 |
| `c287648` | OKR・アクションマップのデザインを明るく立体的に刷新 |

### LP改善

| コミット | 内容 |
|---------|------|
| `dbac8ff` | LP: PC表示での改行を修正 |
| `2533e66` | LP: フォームをシンプルなグリッドレイアウトに変更 |
| `9c44e3d` | LP: フォームフィールドを最適化（5→3必須項目） |
| `c626829` | LP: CTAボタン下に不安軽減テキストを追加 |
| `cf4ea0b` | LP: お客様の声の行間ズレを修正 |
| `9bab707` | ヒーローセクションのリード文を2行表示に調整 |
| `0aab3e2` | テナント別LP構造を整備（default/shared分離） |

### スマホ対応

| コミット | 内容 |
|---------|------|
| `7029f43` | リーンキャンバス: スマホで内枠がはみ出る問題を修正 |
| `2240651` | 管理者設定タブのスマホ横スクロール対応 |
| `cfcdd9e` | 4象限タブ・SAタブのスマホ横スクロール対応 |
| `48b0e7a` | OKR・アクションマップのスマホ表示最適化 |
| `8075121` | CollapsibleSectionにoverflowX: auto追加 |
| `0bac0d7` | スマホ横スクロール対応: リーンキャンバス、OKR、アクションマップ、見込み客 |

### タスク管理・4象限

| コミット | 内容 |
|---------|------|
| `f89b19b` | 4象限タスクは絵文字のみ表示（スートマーク削除） |
| `01b1898` | 4象限タスクのスートマーク前に絵文字を追加 |
| `e09dff5` | タスク操作時のGoogle自動同期を実装 |
| `49b73ba` | タスク履歴・引き継ぎロジックを改善 |
| `53f4b18` | Googleカレンダー/タスク連携の絵文字を更新 |
| `4465ccb` | 習慣タブ: 読書 → ごきげんでいる に変更 |
| `4fe80b7` | TODO toggle時のID型不一致を修正 |
| `91ffe5c` | ドラッグ&ドロップのセンサー設定を改善 |

### ステータス・カラー

| コミット | 内容 |
|---------|------|
| `efcf5c0` | ステータスアイコンのサイズを20%大きく |
| `690a268` | 失注タブを茶色に統一 |
| `33767a3` | 失注タブをメインカラーの濃淡デザインに統一 |
| `5d91e9c` | チャネル別アプローチの数字を下寄せに変更 |

### パフォーマンス・最適化

| コミット | 内容 |
|---------|------|
| `10a7a7a` | データ競合時の自動リトライを強化（1回→最大3回） |
| `1becc8e` | Phase 14.6.7: 各タブのクエリ最適化 |
| `f121d1b` | Phase 14.6.6: rgba カラーを CSS 変数に変換 |
| `1040fae` | CSS Module の色定義を CSS 変数に統一 |
| `1c7b010` | ダッシュボード全コンポーネントにスケルトンUI追加 |

### テーマカラー

| コミット | 内容 |
|---------|------|
| `27ce26b` | Phase 14.6.6: テナント別テーマカラー設定機能を実装 |
| `c72b0ac` | Phase 14.6.6: Teal/Cyan系色をプライマリカラーに統一（追加分） |
| `d563fea` | Phase 14.6.6: 同系色ハードコードを CSS 変数に変換（追加分） |
| `99365f7` | テーマカラー適用の空文字チェックと背景グラデーション対応 |
| `fd64fb2` | ログイン画面とグリッド背景のカラーをCSS変数化 |

---

## 🎨 Part 1: テーマカラー マルチテナント対応

### 1.1 基本色のHSL分析

| 色名 | HEX | HSL | 用途 |
|------|-----|-----|------|
| **Primary** | #00B8C4 | `hsl(184, 100%, 38%)` | メインカラー |
| **Primary Dark** | #008A94 | `hsl(184, 100%, 29%)` | ホバー、濃い部分 |
| **Primary Light** | #00E5F5 | `hsl(184, 100%, 48%)` | 明るいアクセント |

### 1.2 明度・彩度の関係（HSL）

```
基準色 (Primary):     H=184°  S=100%  L=38%
├─ Dark (-9% L):      H=184°  S=100%  L=29%  (比率: 0.76)
└─ Light (+10% L):    H=184°  S=100%  L=48%  (比率: 1.26)
```

### 1.3 透明度バリエーション（CSS変数）

| 変数名 | 透明度 | 用途 |
|--------|--------|------|
| `--primary-alpha-4` | 4% | グリッド背景 |
| `--primary-alpha-6` | 6% | グリッド背景（濃） |
| `--primary-alpha-10` | 10% | カードボーダー、シャドウ |
| `--primary-alpha-15` | 15% | シャドウホバー、背景 |
| `--primary-alpha-20` | 20% | バッジ背景 |
| `--primary-alpha-25` | 25% | ボックスシャドウ |
| `--primary-alpha-30` | 30% | ボタンシャドウ |
| `--primary-alpha-35` | 35% | 強調シャドウ |
| `--primary-alpha-40` | 40% | ホバーシャドウ |

### 1.4 失注タブ専用カラー

| 変数名 | 値 | 用途 |
|--------|-----|------|
| `--lost-brown` | #A0522D | 失注メインカラー（シエナ茶） |
| `--lost-brown-dark` | #8B4513 | 失注ダーク（サドルブラウン） |
| `--lost-brown-alpha-10` | rgba(160, 82, 45, 0.1) | 失注背景 |
| `--lost-brown-alpha-15` | rgba(160, 82, 45, 0.15) | 失注バッジ |
| `--lost-brown-alpha-30` | rgba(160, 82, 45, 0.3) | 失注シャドウ |

### 1.5 テナント別テーマプリセット

| テナント | Hue | Primary | 用途 |
|----------|-----|---------|------|
| デフォルト | 184° | `hsl(184,100%,38%)` | ターコイズ |
| オレンジ | 30° | `hsl(30,100%,50%)` | エネルギッシュ |
| ブルー | 210° | `hsl(210,100%,45%)` | ビジネス向け |
| グリーン | 145° | `hsl(145,70%,40%)` | エコ・成長 |
| パープル | 270° | `hsl(270,70%,50%)` | クリエイティブ |
| レッド | 0° | `hsl(0,80%,50%)` | アクティブ |

---

## 📂 Part 2: テナント別LP構造

### 2.1 ディレクトリ構造

```
components/
└── landing/
    ├── default/       ← デフォルトLP（app テナント）
    │   ├── LandingPage.tsx
    │   ├── LandingPage.module.css
    │   ├── HeroSection.tsx
    │   ├── FeaturesSection.tsx
    │   ├── PricingSection.tsx
    │   └── FAQSection.tsx
    ├── shared/        ← 共通コンポーネント（全テナント共通）
    │   ├── ContactForm.tsx
    │   ├── LandingHeader.tsx
    │   └── LandingFooter.tsx
    └── {tenant}/      ← テナント別LP（例: company1/）
        ├── LandingPage.tsx
        └── ...
```

### 2.2 新規テナントLPの作成手順

1. **ディレクトリ作成**
   ```bash
   mkdir -p components/landing/{tenant-subdomain}
   ```

2. **LPコンポーネント作成**
   - `default/` からコピーしてカスタマイズ
   - 共通コンポーネントは `shared/` からインポート

3. **app/page.tsx でテナント判定**
   ```tsx
   // 現在はデフォルトLPのみ
   import LandingPage from '@/components/landing/default/LandingPage';
   ```

---

## 🚀 Part 3: パフォーマンス最適化

### 3.1 k6 テスト結果（2025-12-03）

```
VU: 10（同時10ユーザー）
Duration: 1分

http_req_duration:
  avg=611ms, P95=1.09s, max=2.39s

health check fast: 87%（13%が遅延）
```

| 指標 | 現状 | 目標 | 乖離 |
|------|------|------|------|
| API P95 | 1.09s | 350ms | **3.1倍遅い** |
| health check | 13%遅延 | 0%遅延 | ❌ |

### 3.2 完了済み最適化

| タブ | ファイル | 状態 |
|------|---------|------|
| ダッシュボード | `useDashboardStats` | ✅ 1ループで全カウント集計（O(n)） |
| 見込客 | `leads/useLeadsViewModel` | ✅ useWorkspaceData使用 |
| 既存客 | `useClientsViewModel` | ✅ useWorkspaceData使用 |
| タスク管理 | `task/useTaskViewModel` | ✅ useWorkspaceData使用 |
| OKR | `okr/useOKRViewModel` | ✅ useWorkspaceData使用 |
| ActionMap | `action-map/useActionMapViewModel` | ✅ useWorkspaceData使用 |
| MVV | `useMVVViewModel` | ✅ useWorkspaceData使用 |
| レポート | `useReportsViewModel` | ✅ useWorkspaceData + 1ループ集計 |
| 設定 | `settings/useDataBackup` | ✅ Contextデータ使用 |
| テンプレート | `templates/useTemplatesViewModel` | ✅ useWorkspaceData使用 |
| ブランド | `brand/useBrandViewModel` | ✅ useWorkspaceData使用 |

### 3.3 データ競合の自動リトライ強化

**変更内容:**
- 最大3回まで自動リトライ（以前は1回）
- リトライ間に待機時間を追加（100ms × 試行回数）
- リトライ成功時はログ出力
- 3回失敗した場合のみ競合モーダルを表示

**ファイル:** `lib/contexts/WorkspaceDataContext.tsx`

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

const attemptSave = async (dataToSave, currentVersion, attempt) => {
  const response = await fetch(...);

  if (response.status === 409) {
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      const reloadResult = await fetch(...);
      const reMergedData = { ...reloadResult.data, ...newData };
      return attemptSave(reMergedData, reloadResult.version, attempt + 1);
    }
    // 3回失敗した場合のみモーダル表示
  }
  // ...
};
```

---

## 🎯 Part 4: 4象限タスク表示

### 4.1 スート絵文字マッピング

| スート | 絵文字 | 色 | 意味 |
|--------|--------|-----|------|
| スペード | ⬛ | 黒 | すぐやる（緊急かつ重要） |
| ハート | 🟥 | 赤 | 予定に入れ実行（重要） |
| ダイヤ | 🟨 | 黄 | 任せる＆自動化（緊急なだけ） |
| クラブ | 🟦 | 青 | 未来創造20%タイム |
| ジョーカー | 🃏 | - | 分類待ち |

### 4.2 Googleカレンダー/タスク連携

タスクタイトルに絵文字プレフィックスを追加：
- `⬛松本さん`（スペード）
- `🟥運動`（ハート）
- `🟨メール返信`（ダイヤ）
- `🟦新機能調査`（クラブ）

**ファイル:** `lib/types/task.ts`

```typescript
export const SUIT_EMOJI: Record<Suit, string> = {
  spade: '⬛',
  heart: '🟥',
  diamond: '🟨',
  club: '🟦',
};

export function toCalendarTitle(task: Task): string {
  const emoji = task.suit ? SUIT_EMOJI[task.suit] : '🃏';
  return `${emoji}${task.title}`;
}
```

---

## 📱 Part 5: ステータスアイコン

### 5.1 サイズ変更（20%増）

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| KanbanColumn.tsx | size={17} | size={20} |
| ConversionFunnel.tsx | size={15} | size={18} |
| ApproachesManagement.tsx | size={10} | size={12} |
| FunnelStatusBar.tsx | size={12} | size={14} |

---

## ✅ チェックリスト

### テーマカラー
- [x] CSS変数システムがHSLベースに移行完了
- [x] 全てのハードコード色がCSS変数に置換
- [x] 失注タブ専用カラー（茶色）を追加
- [x] SAダッシュボードでテーマカラー選択UI実装
- [x] テーマ変更がリアルタイムで反映

### LP
- [x] テナント別LP構造（default/shared）を整備
- [x] フォームフィールド最適化（5→3必須項目）
- [x] スマホ対応（横スクロール）

### パフォーマンス
- [x] 全9タブのクエリ最適化確認
- [x] スケルトンUI追加
- [x] データ競合の自動リトライ強化（3回）
- [ ] 100 VU負荷テストでP95 < 700ms達成

### タスク管理
- [x] 4象限タスクは絵文字のみ表示
- [x] Google連携の絵文字更新
- [x] ドラッグ&ドロップ改善

---

## 📚 関連ドキュメント

- `docs/guides/TENANT-MANAGEMENT-GUIDE.md` - テナント管理ガイド
- `docs/guides/Performance-Specification-v1.0.md` - パフォーマンス仕様

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-03 | 初版制定（テーマカラー マルチテナント対応） |
| v2.0 | 2025-12-03 | Phase 14.6.7の内容を統合 |
| v3.0 | 2025-12-03 | Phase 14.8の内容を統合、パフォーマンス最適化 |
| v4.0 | 2025-12-03 | 2025-12-03の全変更履歴を統合（LP構造、4象限絵文字、競合リトライ、ステータスアイコン等） |

---

**作成日:** 2025-12-03
**作成者:** Claude Code
**バージョン:** 4.0
