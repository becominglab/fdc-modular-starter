# Phase 9.92 全タブ再生ランブック：Legacy UI → React 完全移行プロジェクト

**最終更新:** 2025-11-25
**ステータス:** ✅ **完了（全13タブの React/ViewModel 移行完了）**
**アプローチ:** 1タブずつ、既存UIを維持しながら、過去の実装を確認して正確にロジックを移管する

---

## 🎯 Phase 9.92 の目的と範囲

### 本フェーズの本質

Phase 9.92 は **「全タブ再生プロジェクト」** です。

- **「ダッシュボードだけ」で終わらせるのではなく**、ダッシュボードを起点として、**全10タブを1タブずつ順番に再生していく** フェーズです。
- **UI（見た目）は再構築しない** — 既存の React コンポーネント構造と見た目を前提とし、レイアウト・クラス名を原則変更しません。
- **Phase 9.92 では「UIを作り直す」のではなく「ロジックだけを再生する」** ことに集中します。
- **旧 UI（`archive/` 配下のレガシーコード）を仕様書として使用** — 既存の挙動を忠実に再現します。

### Phase 9.9 / 9.91 からの残務引き継ぎ

本フェーズは、Phase 9.9 / 9.91 で未完了だった **UI/ロジック系の残務** を統合して実施します。

**Phase 9.9 からの引き継ぎ（UI実装タスク）:**
- リードステータス刷新（4ステータス制への移行）
- 失注タブの実装
- 成約→既存客への移行フロー
- SAダッシュボードの実装

**Phase 9.91 からの引き継ぎ（構造系）:**
- レガシーコードの隔離完了を前提とした実装
- 標準化されたディレクトリ構造での開発

これらの残務は、各タブの再生プロセスに組み込んで実装します。

### 全タブ再生の流れ

1. **Phase 9.92-1: ダッシュボードタブの再生**
   既存UIを維持したまま、Dashboardのロジックを `useDashboardViewModel()` に集約する。

2. **Phase 9.92-2: Leadsタブの再生**
   同様に、既存UIを維持したまま、Leadsタブのロジックを `useLeadsViewModel()` に集約する。

3. **Phase 9.92-3〜10: 他タブ（TODO / Client / Zoom / etc.）の再生**
   各タブごとに ViewModel Hook を定義し、**1タブずつ完全に移管してから次のタブへ進む**。

### 重要原則

1. **1タブずつ完全移行**: 複数タブを同時に進めない
2. **既存UIを維持**: 色・余白・フォントサイズ・角丸まで旧UIと一致させる
3. **過去の実装を確認しながら移管**: 旧UIの挙動を忠実に再現する
4. **レガシー関数は「マッピングして移す」**: 「捨てる」のではなく、対応表を作って移管する
5. **DOM直接操作は禁止**: React の state/props に移管する
6. **UI は ViewModel の戻り値を受け取るだけ**: ロジックは Hook に集約
7. **各タブは DOD を満たしてから次へ**: Phase 9.92-1 が完了するまで Phase 9.92-2 には着手しない

---

## 0. React 実装ルール（Phase 9.92 共通ガードレール）

Phase 9.92 以降の UI 実装は、すべて次のルールに従うこと。
これを外れた実装は禁止。場当たり的な React 化を防ぐための最低条件とする。

### 0.0 Phase 9.92 の本質と責務分離

**Phase 9.92 の本質**:
- 全10タブを「1タブずつ完全移行」する **React 再生プロジェクト**
- 旧 TypeScript DOM 実装（`archive/phase9-legacy-js/tabs/*.ts`）を**仕様書として扱う**
- UI は再構築しない — **ロジックだけを React / ViewModel 化する**

**Phase 9.92 → 9.93 の責務分離**:
- **Phase 9.92（実装フェーズ）**:
  - 全10タブの React / ViewModel 化を完了
  - 旧 UI の機能をすべて React で動作させる
  - UI差異は許容（Phase 9.93 で修正）
  - 技術負債は文書化（`// TODO: Phase 9.93` コメント）
- **Phase 9.93（検証フェーズ）**:
  - UI差異・ロジック差異・Next.js固有バグをゼロ化
  - スクリーンショット比較で 95% 以上一致させる
  - 技術負債の解消（リファクタリング）
  - **UAT（ユーザー受入テスト）の実施** ← 実際の業務フローでの試用

**重要な注意点（分析レポートからの提言）**:
Phase 9.92/9.93 は「旧仕様の完全再現」を目指しているが、もし旧仕様自体に使いにくさやバグがあった場合、それも忠実に再現されてしまう。
そのため、Phase 9.93 では単なる「バグ修正」だけでなく、**実際の業務フローでの試用（UAT）** を実施し、「旧仕様通り動いているが、Reactになったら使いにくい」部分がないか確認する。

**旧 TypeScript DOM 実装の扱い**:
- `archive/phase9-legacy-js/tabs/*.ts` は**仕様書**として扱う
- 「捨てる」のではなく、「マッピングして移す」
- レガシー関数マッピング表を各タブで作成する

**React 採用理由と Next.js 15 移行との整合性**:
- **Next.js 15 との一体化**: App Router / RSC / Route Handlers と完全整合
- **状態管理の明確化**: DOM 直接操作 → React の state / props に統一
- **保守性の向上**: ViewModel パターンでロジックとUIを分離
- **Phase 9.93 以降の準備**: 技術負債を文書化し、リファクタ基盤を構築

### 0.1 画面とロジックの分離ルール

1. **1画面 = 1 ViewModel Hook**
   - 例：ダッシュボード → `useDashboardViewModel()`
   - 例：見込み客管理 → `useLeadsViewModel()`
   - 例：既存客管理 → `useClientsViewModel()`

2. **ViewModel Hook の責務**
   - API 呼び出し（fetch / Supabase クエリ）
   - データ整形・集計ロジック
   - イベントハンドラ定義（ボタン押下時に何をするか）
   - ローディング・エラー状態の管理

3. **画面コンポーネントの責務**
   - ViewModel から渡された値を表示するだけ
   - イベントハンドラを props 経由で子コンポーネントに渡す
   - コンポーネント内で直接 fetch しない

### 0.2 型と API 契約のルール

1. **API 入出力型は 1 ファイルに集約**
   - 例：`lib/types/api.ts` または `lib/types/index.ts`
   - ここに `DashboardStats`, `Lead`, `Client`, `TodoItem` などを定義する。

2. **Route Handler（`app/api/**/route.ts`）と ViewModel は、必ず同じ型定義を import して使う。**
   - 片方だけ `any` や独自の型を書かない。

3. **Zod 等のスキーマを使う場合も、型定義と同じファイルで管理する。**

4. **`any`, `unknown` を暫定的に使った場合は、必ず `// TODO: 型を具体化（Phase x.x）` を付けて技術負債として明示する。**

### 0.3 DOM 直接操作・副作用のルール

1. **DOM 直接操作禁止**
   - `document.getElementById`, `querySelector`, `innerHTML`, `classList.add/remove` は原則禁止。
   - どうしても必要な場合（サードパーティライブラリ等）は、専用のラッパーコンポーネントを作り、`useEffect` 内で局所的に閉じる。

2. **`window`, `document` へのアクセスは**
   - `typeof window !== 'undefined'` ガード付き、
   - かつ `useEffect` 内に限定する。

3. **副作用（データ保存・ログ出力など）はすべて ViewModel Hook 内に集約し、UI コンポーネント側では副作用を持たない。**

### 0.4 データフローと状態管理のルール

1. **状態は原則 `useState` / `useReducer` で ViewModel 内に保持し、props で下に流す。**

2. **画面をまたぐグローバル状態が必要な場合のみ、Context や Zustand 等の利用を検討する。**
   - それでも「どこからでも書き換え可能」な設計にはしない。

3. **「一時的に main.js のロジックを呼び出すブリッジ」は Phase 9.92 では使用禁止。**
   - すべて React の state/props に完全移行するフェーズとする。

### 0.5 実装単位と完了条件のルール

1. **1タブずつ完全移行**
   ダッシュボードが 100% 完了するまでは、他タブに着手しない。

2. **各タブは次の 3 レイヤが揃って Definition of Done (DOD) とみなす。**
   - ViewModel Hook（ロジック）
   - Presentational Components（UI）
   - API + 型定義（契約）

3. **各タブ完了時に必ず（実行責任: 各タブ担当者）**
   - `npm run type-check` → **エラー 0 件**が必須
   - `npm run build` → **警告 0 件、成功**が必須
   - 対象タブに関係する Playwright テスト → **Pass**が必須
   - テスト未整備なら `tests/e2e/phase992-{tab}.spec.ts` をスケルトン作成し、TODO として明記する

4. **Phase 9.92 全体完了時に必ず（実行責任: Phase 9.92 リード担当）**
   - 全タブの DOD 達成を確認
   - `npm run type-check` / `npm run build` を**プロジェクト全体**で実行
   - 全 E2E テストを実行し、**全 Pass** を確認
   - `docs/TECH-DEBT-INVENTORY.md` が作成されていることを確認
   - **Phase 9.93 開始の前提条件**: 上記すべてが達成されていること

### 0.6 ViewModel 層の明確な責務

**ViewModel Hook が持つべき責務**:

1. **データ取得（Read）**
   - API 呼び出し（`fetch`, Supabase クエリ）
   - ローディング・エラー状態の管理
   - データのキャッシュ管理

2. **データ加工（Transform）**
   - サーバーから取得したデータを UI 用に整形
   - 集計・フィルタリング・ソート
   - 計算ロジック（合計値、平均値、パーセンテージ等）

3. **イベントハンドラ（Write）**
   - ボタン押下時の処理
   - フォーム送信処理
   - データの追加・更新・削除

4. **副作用の管理（Side Effects）**
   - `useEffect` でのデータ取得
   - タイマー・インターバル処理
   - グローバル状態の更新

**ViewModel Hook が持つべきでない責務**:
- ❌ UI の描画（JSX を返さない）
- ❌ DOM 直接操作
- ❌ CSS スタイルの管理
- ❌ 複雑な UI ロジック（条件分岐による表示制御は UI コンポーネント側）

### 0.7 React 移行プロトコル（js/tabs/*.ts → React 実装）

**ステップ1: レガシー実装の調査**
1. `archive/phase9-legacy-js/tabs/*.ts` を読む
2. 主要関数をリストアップ（`init`, `render`, `update`, `delete` 等）
3. DOM 操作箇所を特定（`getElementById`, `querySelector`, `innerHTML`）
4. イベントリスナー登録箇所を特定（`addEventListener`, `window.xxx =`）
5. データフローを図示（API → State → DOM）

**ステップ2: レガシー関数マッピング表の作成**

各タブごとに、次のフォーマットで対応表を作成する：

```markdown
| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `loadDashboardData()` | `useDashboardViewModel().loadData()` | `DashboardPage` | API呼び出し + 集計 |
| `updateConversionGoal()` | `useDashboardViewModel().updateGoal()` | `ConversionFunnel` | 目標値保存 |
| `toggleTodo()` | `useDashboardViewModel().toggleTodo()` | `TODOList` | TODO完了切り替え |
```

**ステップ3: ViewModel Hook の設計**

1. **Hook 名の決定**
   - 例：`useDashboardViewModel()`, `useLeadsViewModel()`

2. **戻り値の型定義**
   ```typescript
   interface DashboardViewModel {
     // データ
     stats: DashboardStats | null;
     loading: boolean;
     error: string | null;

     // イベントハンドラ
     loadData: () => Promise<void>;
     updateGoal: (goal: number) => Promise<void>;
     toggleTodo: (id: string) => Promise<void>;
   }
   ```

3. **API 呼び出し部分の実装**
   - `lib/core/apiClient.ts` の既存関数を使用
   - ローディング・エラー状態を管理

**ステップ4: UI コンポーネントの接続**

1. **既存の UI コンポーネントを確認**
   - `app/_components/dashboard/*.tsx`

2. **ViewModel から渡された値を表示するように修正**
   ```tsx
   export default function DashboardPage() {
     const { stats, loading, error, loadData, updateGoal } = useDashboardViewModel();

     if (loading) return <div>読み込み中...</div>;
     if (error) return <div>エラー: {error}</div>;

     return <KPICards stats={stats} />;
   }
   ```

3. **イベントハンドラを Hook から受け取る**
   ```tsx
   <button onClick={() => updateGoal(200)}>目標値を更新</button>
   ```

**ステップ5: DOM 直接操作の除去**

旧実装で `document.getElementById` や `innerHTML` を使っていた箇所を、React の state/props に置き換える。

**例**:
```typescript
// 旧実装
document.getElementById('kpi-cards').innerHTML = `<div>${stats.total}</div>`;

// React 実装
const [stats, setStats] = useState<DashboardStats | null>(null);
return <div>{stats?.total}</div>;
```

**ステップ6: window 公開関数の除去**

旧実装で `window.xxx = function() { ... }` としていた関数を、React イベントハンドラに置き換える。

**例**:
```typescript
// 旧実装
window.updateGoal = function(goal: number) { ... };

// React 実装
const updateGoal = useCallback(async (goal: number) => { ... }, []);
return <button onClick={() => updateGoal(200)}>更新</button>;
```

### 0.8 UI/UX 互換性ルール

**Phase 9.92 では「見た目を変えない」ことを最優先とする**

1. **色・余白・フォントサイズ・角丸まで旧UIと一致させる**
   - 旧 UI の CSS を `app/globals.css` に移植
   - CSS 変数（`:root`）を維持
   - レイアウトグリッドを維持

2. **アニメーション・トランジションも維持する**
   - `transition: width 0.3s ease` 等のトランジション
   - ホバー時のエフェクト

3. **レスポンシブデザインも維持する**
   - モバイル・タブレット・デスクトップ対応
   - メディアクエリを維持

4. **旧UIとの差異は Phase 9.93 で修正**
   - Phase 9.92 では UI 差異を許容
   - Phase 9.93 でスクリーンショット比較を実施

### 0.9 将来の拡張性を担保するための技術負債マーキングルール

**★ Phase 9.92 と 9.93 の責務境界（CODEXレビュー対応）**:

| 項目 | Phase 9.92 のアウトプット | Phase 9.93 のアウトプット |
|------|--------------------------|--------------------------|
| コード分割 | `// TODO` コメント記載のみ、**着手なし** | 対象タブへの `next/dynamic` 適用（目標: 4タブ中2タブ以上） |
| RSC/SSR化 | `// TODO` コメント記載のみ、**着手なし** | PoC 完了 + ドキュメント作成（`docs/RSC-POC-REPORT.md`） |
| CSS移行 | `/* TODO */` コメント記載のみ、**着手なし** | 方針決定 + 新規実装への適用開始（globals.css の 50% 削減は努力目標） |
| TECH-DEBT-INVENTORY | **ファイル作成・全項目列挙** | 列挙された項目の **50% 以上解消** |

**重要**: Phase 9.92 では技術負債の**記録のみ**を行い、解消には着手しない。これにより「移行完了」と「最適化」の責務が明確に分離される。

Phase 9.92 では以下の3点について「今は対処しないが、Phase 9.93 で対処する」ことを明示的にコードコメントで記録する。

#### 0.9.1 コード分割の先送り

重いタブコンポーネントに以下のコメントを記載：
```tsx
// TODO: Phase 9.93 - dynamic import 検討（バンドルサイズ最適化）
```

**対象タブ（描画コストが高いもの）**:
- Reports（グラフライブラリ）
- ZoomScript（動画プレビュー）
- Templates（エディタコンポーネント）
- LeanCanvas（キャンバス描画）

#### 0.9.2 RSC/SSR化の先送り

クライアントフェッチを行っている箇所に以下のコメントを記載：
```tsx
// TODO: Phase 9.93+ - RSC化検討（サーバーサイドフェッチ移行）
```

**対象箇所**:
- `useDashboardViewModel()` 内の統計データ取得
- `useReportsViewModel()` 内の集計データ取得
- その他、重い集計系API呼び出し

#### 0.9.3 CSS スコープ化の先送り

`app/globals.css` に追加したレガシーCSSブロックに以下のコメントを記載：
```css
/* TODO: Phase 9.93 - Tailwind/CSS Modules 移行対象 */
```

**対象**:
- 旧UIから移植したクラス定義
- グローバルに定義しているコンポーネント固有スタイル

### 0.10 技術負債インベントリの作成

Phase 9.92 完了時に、上記の TODO コメントを `docs/TECH-DEBT-INVENTORY.md` に一覧化する。

**テンプレート**:
```markdown
# 技術負債インベントリ（Phase 9.92 → 9.93）

## 1. コード分割対象

| ファイル | TODO コメント位置 | 優先度 |
|---------|------------------|-------|
| `app/(app)/reports/page.tsx` | Line XX | 高 |
| `app/(app)/zoom-script/page.tsx` | Line XX | 高 |

## 2. RSC化対象

| ViewModel Hook | 対象API | 優先度 |
|---------------|---------|-------|
| `useDashboardViewModel()` | `/api/dashboard/stats` | 中 |
| `useReportsViewModel()` | `/api/reports/summary` | 高 |

## 3. CSS移行対象

| globals.css 行範囲 | 移行先コンポーネント | 優先度 |
|-------------------|---------------------|-------|
| Line XX-XX | `KPICards.tsx` | 中 |
| Line XX-XX | `ConversionFunnel.tsx` | 中 |
```

---

## 1. 全タブインベントリと優先順位

以下の順序で、1タブずつ完全に移行します。

### 1.0 レガシーファイル存在確認（実装前必須）

**⚠️ 各タブの実装を開始する前に、以下のコマンドでレガシーファイルの存在を確認すること：**

```bash
# レガシーファイルの存在確認
ls -la archive/phase9-legacy-js/tabs/

# 期待される出力例:
# dashboard.ts
# leads.ts
# clients.ts
# mvvOkr.ts
# brand.ts
# leanCanvas.ts
# todo.ts
# zoomMeetings.ts
# templates.ts
# reports.ts
```

**ファイルが存在しない場合の対応**:
1. `dist/js/main.js` から該当タブのロジックを抽出
2. 抽出したコードを `archive/phase9-legacy-js/tabs/{tab}.ts` として保存
3. 保存後、本ランブックの手順に従って移行を進める

**レガシーファイル検証チェックリスト**:
- [ ] `archive/phase9-legacy-js/tabs/` ディレクトリが存在する
- [ ] 各タブに対応する `.ts` ファイルが存在する
- [ ] 各ファイルに主要関数（`load*`, `render*`, `update*`）が含まれている

### 1.1 タブ一覧

| Phase | タブID | タブ名 | Legacy 実装ファイル | 新 ViewModel Hook | 完了状態 | 完了日 | 担当者 |
|-------|--------|--------|---------------------|-------------------|----------|--------|--------|
| **9.92-1** | `dashboard` | ダッシュボード | `archive/phase9-legacy-js/tabs/dashboard.ts` | `useDashboardViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-2** | `prospects` | 見込み客管理 | `archive/phase9-legacy-js/tabs/leads.ts` | `useLeadsViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-3** | `customers` | 既存客管理 | `archive/phase9-legacy-js/tabs/clients.ts` | `useClientsViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-4** | `mvv` | MVV・OKR | `archive/phase9-legacy-js/tabs/mvvOkr.ts` | `useMVVOKRViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-5** | `brand` | ブランド指針 | `archive/phase9-legacy-js/tabs/brand.ts` | `useBrandViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-6** | `lean` | リーンキャンバス | `archive/phase9-legacy-js/tabs/leanCanvas.ts` | `useLeanCanvasViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-7** | `todo` | TODO管理 | `archive/phase9-legacy-js/tabs/todo.ts` | `useTodoViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-8** | `zoom-script` | Zoom会議 | `archive/phase9-legacy-js/tabs/zoomMeetings.ts` | `useZoomScriptViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-9** | `templates` | テンプレート集 | `archive/phase9-legacy-js/tabs/templates.ts` | `useTemplatesViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-10** | `reports` | レポート | `archive/phase9-legacy-js/tabs/reports.ts` | `useReportsViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-11** | `settings` | 設定 | `archive/phase9-legacy-js/tabs/settings.ts` | `useSettingsViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-12** | `admin` | 管理者設定（EXEC用） | `archive/phase9-legacy-js/tabs/admin.ts` | `useAdminViewModel()` | ✅ 完了 | 2025-11-25 | Claude |
| **9.92-13** | `sa` | SAダッシュボード | 新規実装 | `useSADashboardViewModel()` | ✅ 完了 | 2025-11-25 | Claude |

### 1.2 アクセス権限マトリクス

| タブ | MEMBER | MANAGER | EXEC | fdc_admin |
|------|--------|---------|------|-----------|
| ダッシュボード〜レポート (1-10) | ✅ | ✅ | ✅ | ✅ |
| 設定 (11) | ❌ | 👁 閲覧のみ | ✏️ 編集可 | ✏️ 編集可 |
| 管理者設定 (12) | ❌ | 👁 MEMBER一覧閲覧 | ✏️ 全メンバー管理 | ✏️ 全メンバー管理 |
| SAダッシュボード (13) | ❌ | ❌ | ❌ | ✅ 全WS管理 |

**権限の説明**:
- **MEMBER**: 一般社員。業務タブのみアクセス可能
- **MANAGER**: マネージャー。設定閲覧 + MEMBER一覧の閲覧が可能
- **EXEC**: 経営者/管理者。自社ワークスペースの全メンバー管理（招待・削除・ロール変更）が可能
- **fdc_admin**: システム管理者。全ワークスペース横断での管理が可能

### 1.3 進捗更新ルール

**完了状態の更新タイミング**:
- `⏸️ 待機中` → `🔄 実装中`: タブの実装を開始した時点
- `🔄 実装中` → `✅ 完了`: DOD をすべて満たした時点

**更新責任者**: 各タブの実装担当者が、上記表の「完了状態」「完了日」「担当者」を更新する

**更新手順**:
1. タブの DOD チェックリストをすべて確認
2. `npm run type-check` と `npm run build` が成功することを確認
3. 本ランブックの該当行を編集し、完了状態を更新
4. コミットメッセージ: `docs: Phase 9.92-X {タブ名} 完了状態を更新`

---

## 2. レガシー実装インベントリ（タブ別）

### 2.1 レガシー関数 → ViewModel 対応表のテンプレート

各タブの移行時に、以下のフォーマットで対応表を作成すること。

```markdown
| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `loadDashboardData()` | `useDashboardViewModel().loadData()` | `DashboardPage` | API呼び出し + 集計 |
| `updateConversionGoal()` | `useDashboardViewModel().updateGoal()` | `ConversionFunnel` | 目標値保存 |
| `toggleTodo()` | `useDashboardViewModel().toggleTodo()` | `TODOList` | TODO完了切り替え |
```

### 2.2 タブ別レガシー関数一覧

#### ダッシュボードタブ（Phase 9.92-1）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/dashboard.ts`

主要関数:
- `loadDashboardData()` - KPI統計の読み込み
- `renderKPICards()` - KPI統計カード表示
- `renderConversionFunnel()` - コンバージョンファネル表示
- `renderOKRSummary()` - OKR進捗サマリー表示
- `renderTODOList()` - TODO上位5件表示
- `renderLostReasons()` - 失注理由TOP3表示
- `renderApproachesManagement()` - アプローチ管理表示
- `updateConversionGoal()` - 目標値更新
- DOM直接操作系: `getElementById()`, `innerHTML`, `addEventListener()`

#### 見込み客管理タブ（Phase 9.92-2）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/leads.ts`

主要関数:
- `loadLeads()` - 見込み客一覧読み込み
- `renderLeadsList()` - リストビュー表示
- `renderKanbanView()` - カンバンビュー表示
- `addLead()` - 見込み客追加
- `updateLeadStatus()` - ステータス変更
- `showLostSurvey()` - 失注アンケートモーダル表示
- `addTag()` - タグ追加
- `removeTag()` - タグ削除
- `addHistory()` - 履歴追加
- `importCSV()` - CSV インポート

#### 既存客管理タブ（Phase 9.92-3）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/clients.ts`

主要関数:
- `loadClients()` - 既存客一覧読み込み
- `renderClientCards()` - カルテ一覧表示
- `toggleClientExpand()` - カルテ展開/折りたたみ
- `updateClientStatus()` - ステータス変更
- `updateContractDeadline()` - 契約期限更新
- `updateNextMeeting()` - 次回ミーティング更新
- `addClientNote()` - メモ追加
- `checkDeadlineAlerts()` - 期限警告チェック

#### MVV・OKRタブ（Phase 9.92-4）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/mvvOkr.ts`

主要関数:
- `loadMVVOKR()` - MVV・OKRデータ読み込み
- `renderMVVSection()` - MVV表示
- `renderOKRSection()` - OKR表示
- `updateMission()` - Mission更新
- `updateVision()` - Vision更新
- `updateValues()` - Values更新
- `updateObjective()` - Objective更新
- `updateKeyResult()` - Key Result更新
- `calculateProgress()` - 進捗計算

#### ブランド指針タブ（Phase 9.92-5）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/brand.ts`

主要関数:
- `loadBrand()` - ブランド指針読み込み
- `renderBrandSections()` - 各セクション表示
- `updateCoreMessage()` - Core Message更新
- `updateToneManner()` - Tone & Manner更新
- `updateWordsToUse()` - Words to Use更新
- `updateWordsToAvoid()` - Words to Avoid更新

#### リーンキャンバスタブ（Phase 9.92-6）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/leanCanvas.ts`

主要関数:
- `loadLeanCanvas()` - リーンキャンバスデータ読み込み
- `render9Blocks()` - 9ブロック表示
- `updateBlock()` - ブロック更新
- `renderProductLineup()` - 商品ラインナップ表示
- `addProduct()` - 商品追加
- `updateProduct()` - 商品更新
- `deleteProduct()` - 商品削除

#### TODO管理タブ（Phase 9.92-7）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/todo.ts`

主要関数:
- `loadTodos()` - TODO一覧読み込み
- `renderTodoList()` - TODO一覧表示
- `addTodo()` - TODO追加
- `toggleTodo()` - TODO完了切り替え
- `deleteTodo()` - TODO削除
- `filterTodos()` - TODOフィルタリング
- `sortTodos()` - TODOソート

#### Zoom会議タブ（Phase 9.92-8）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/zoomMeetings.ts`

主要関数:
- `loadEmotionPatterns()` - エモーションパターン読み込み
- `renderEmotionSelector()` - エモーション選択UI表示
- `generateScript()` - スクリプト生成
- `copyScript()` - スクリプトコピー

#### テンプレート集タブ（Phase 9.92-9）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/templates.ts`

主要関数:
- `loadTemplates()` - テンプレート一覧読み込み
- `renderTemplateList()` - テンプレート一覧表示
- `addTemplate()` - テンプレート追加
- `updateTemplate()` - テンプレート更新
- `deleteTemplate()` - テンプレート削除
- `recordUsage()` - 使用履歴記録
- `renderUsageHistory()` - 使用履歴表示

#### レポートタブ（Phase 9.92-10）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/reports.ts`

主要関数:
- `loadReportData()` - レポートデータ読み込み
- `renderApproachStats()` - アプローチ統計表示
- `renderConversionTrend()` - コンバージョン率推移表示
- `renderLostAnalysis()` - 失注分析表示
- `generateChart()` - チャート生成
- `exportReport()` - レポート出力

#### 設定タブ（Phase 9.92-11）

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/settings.ts`

**アクセス権限**: EXEC=編集可, MANAGER=閲覧のみ, MEMBER=アクセス不可

主要関数:
- `renderSettings()` - 設定画面全体のレンダリング
- `renderGoogleAuthStatus()` - Google認証状態表示
- `renderCalendarSection()` - Googleカレンダー連携セクション表示
- `window.exportData()` - データエクスポート（JSONダウンロード）
- `window.importData()` - データインポート（JSONアップロード）
- `window.resetAllData()` - 全データリセット
- `window.copyProfile()` - プロフィールコピー
- `window.handleConnectCalendar()` - カレンダー一覧取得
- `window.handleCreateTestEvent()` - テストイベント作成

**実装すべきUI**:
- ユーザー情報表示（ID、メール、名前、ロール）
- Google認証状態（ログイン/ログアウトボタン）
- Googleカレンダー連携（カレンダー選択、テストイベント作成）
- データ管理（エクスポート/インポート/リセット）

#### 管理者設定タブ（Phase 9.92-12）✅ 完了

**Legacy ファイル**: `archive/phase9-legacy-js/tabs/admin.ts`

**アクセス権限**:
- MEMBER: アクセス不可
- MANAGER: MEMBER一覧の閲覧のみ
- EXEC: 全メンバー管理（招待・削除・ロール変更）
- fdc_admin: 全ワークスペース管理

主要関数:
- `initAdminTab()` - タブ初期化
- `renderAdminTab()` - 管理者タブ全体のレンダリング
- `renderAdminContent()` - 管理者情報表示
- `renderWorkspaceMembersSection()` - Workspaceメンバー一覧表示
- `renderAuditLogsSection()` - 監査ログ表示
- `fetchWorkspaceMembers()` - メンバー一覧API取得
- `fetchAuditLogs()` - 監査ログAPI取得
- `handleRemoveMember()` - メンバー削除
- `renderAccessDenied()` - アクセス拒否メッセージ

**実装すべきUI**:
- 管理者情報カード（名前、メール、ロール）
- Workspaceメンバー一覧テーブル（ユーザー、ロール、参加日、操作）
- メンバー招待フォーム（Phase 9.92-12 で新規追加）
- 監査ログ一覧（アクション、ユーザー、日時）
- 権限に応じたアクセス制御

**Phase 9.92-12 実装完了（2025-11-25）**:

ファイル構成:
- ViewModel: `lib/hooks/useAdminViewModel.ts`
- UI: `app/_components/admin/AdminTab.tsx`
- Page: `app/(app)/admin/page.tsx`

レガシー関数マッピング:
| Legacy 関数名 | 新 ViewModel 関数名 | 備考 |
|---------------|---------------------|------|
| `initAdminTab()` | `useEffect` 自動呼出 | グローバル登録不要 |
| `renderAdminTab()` | `AdminTab` コンポーネント | UI は JSX で表現 |
| `isGlobalAdmin()` | `isGlobalAdmin` (state) | 管理者権限チェック |
| `fetchWorkspaceMembers()` | `members` (state) + `refreshMembers()` | API連携 |
| `fetchAuditLogs()` | `auditLogs` (state) + `refreshAuditLogs()` | API連携 |
| `handleRemoveMember()` | `removeMember()` | メンバー削除 |
| `renderAccessDenied()` | `AccessDenied` コンポーネント | コンポーネント分離 |

実装済み機能:
- ✅ 管理者情報セクション（名前、メール、ロール、権限状態）
- ✅ Workspaceメンバー一覧テーブル（ユーザー、ロールバッジ、参加日、操作）
- ✅ メンバー削除機能（確認ダイアログ付き）
- ✅ 監査ログ一覧（アクションラベル、ユーザー、詳細、日時）
- ✅ 権限に応じたアクセス制御（hasAdminAccess, canManageMembers）
- ✅ ローディング状態とエラー表示

#### SAダッシュボード（Phase 9.92-13）

**Legacy ファイル**: 新規実装（既存の `app/(app)/admin/sa/page.tsx` を拡張）

**アクセス権限**: fdc_admin のみ

主要関数（新規設計）:
- `useSADashboardViewModel()` - SAダッシュボード用ViewModel
- `fetchAllWorkspaces()` - 全ワークスペース一覧取得
- `fetchActiveUsers()` - 現在ログイン中ユーザー取得
- `forceLogout()` - 強制ログアウト実行

**実装すべきUI**:
- 全ワークスペース統計（ワークスペース数、ユーザー数、メンバーシップ数）
- ワークスペース一覧テーブル（名前、オーナー、メンバー数、作成日）
- 現在ログイン中ユーザー一覧
- 強制ログアウトボタン
- システム設定（グローバル設定）

---

## 3. Phase 9.92-1: ダッシュボードタブ完全移行手順

### 3.1 現状確認

**現在のファイル構成**:
- ViewModel: 各機能ごとに分離（`useDashboardStats`, `useLeads`, `useClients`, `useOKR`, `useTODOs`, `useLostReasons`, `useApproaches`）
- UI: `app/(app)/dashboard/page.tsx`
- コンポーネント: `app/_components/dashboard/*.tsx`

**移行方針**:
- 既存の Hook 群を活かしつつ、統合的な `useDashboardViewModel()` を作成するか、現状の分離設計を維持するか検討
- **推奨**: 現状の分離設計を維持し、各 Hook を「ViewModel の一部」として扱う

### 3.2 ステップ1: KPI統計カードの実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行55-71

**目標UI**:
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 見込み客数  │ 商談中      │ 成約数      │ 成約率      │
│   150       │    23       │    12       │   8.0%      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**実装仕様**:

1. **レイアウト**:
   - 4カードを横並び（グリッド: `repeat(auto-fit, minmax(250px, 1fr))`）
   - 各カードの背景: `var(--glass)`, `backdrop-filter: blur(10px)`
   - 各カードの影: `var(--shadow)`
   - 各カードの角丸: `12px`
   - カード内パディング: `20px`

2. **色**:
   - タイトル: `var(--text-light)`, `font-size: 14px`
   - 数値: `var(--text-dark)`, `font-size: 32px`, `font-weight: 600`
   - ボトムボーダー: `3px solid var(--primary)`（左下に配置）

3. **データソース**:
   - `useDashboardStats()` フックから取得
   - 見込み客数: `stats.totalProspects`
   - 商談中: `stats.activeDeals`
   - 成約数: `stats.wonDeals`
   - 成約率: `stats.conversionRate`

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `loadDashboardData()` | `useDashboardStats()` | `KPICards` | API呼び出し + 集計 |
| `renderKPICards()` | `<KPICards stats={stats} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `document.getElementById('kpi-cards')` | React state + JSX | - | DOM操作を削除 |

**実装チェックリスト**:
- [x] 4カードが横並びで表示される
- [x] レスポンシブ（モバイルでは縦積み）
- [x] 数値が正しく計算される
- [x] 背景がガラスモーフィズム（ぼかし効果）
- [ ] ホバー時に影が濃くなる（`var(--shadow-hover)`）← 要確認

**コンポーネント構造**:
```tsx
// app/_components/dashboard/KPICards.tsx
interface KPICardsProps {
  stats: {
    totalProspects: number;
    activeDeals: number;
    wonDeals: number;
    conversionRate: string;
  };
}

export function KPICards({ stats }: KPICardsProps) {
  // 実装済み
}
```

---

### 3.3 ステップ2: コンバージョンファネルの実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行74-196

**目標UI**:
```
⚪ 未接触    [████████░░] 120/200 (60%)  [目標: 200]
🔵 反応あり  [██████░░░░]  60/100 (60%)  [目標: 100]
🟡 商談中    [████░░░░░░]  12/30  (40%)  [目標:  30]
🟢 既存先    [██████░░░░]  30/50  (60%)  [目標:  50]
🟣 契約満了  [██░░░░░░░░]   2/10  (20%)  [想定:  10]
🟤 失注      [███░░░░░░░]   6/20  (30%)  [想定:  20]
```

**実装仕様**:

1. **レイアウト**:
   - 6段のプログレスバー
   - 各段の高さ: `30px`
   - 角丸: `15px`
   - 段間隔: `15px`

2. **色（重要！）**:
   - ⚪ 未接触: `linear-gradient(90deg, #CCCCCC, #E0E0E0)`
   - 🔵 反応あり: `linear-gradient(90deg, #2196F3, #64B5F6)`
   - 🟡 商談中: `linear-gradient(90deg, #FFD700, #FFE55C)`
   - 🟢 既存先: `linear-gradient(90deg, #4CAF50, #81C784)`
   - 🟣 契約満了: `linear-gradient(90deg, #9C27B0, #BA68C8)`
   - 🟤 失注: `linear-gradient(90deg, #D2691E, #E89B6D)`

3. **機能**:
   - 目標値入力欄（`<input type="number">`）
   - 入力値変更時に1秒後に自動保存（デバウンス）
   - 達成率計算: `Math.min((実績 / 目標) * 100, 100)`

4. **データソース**:
   - `useLeads()` と `useClients()` から集計
   - 目標値: 別途 API または localStorage で管理（要実装確認）

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderConversionFunnel()` | `<ConversionFunnel prospects={leads} clients={clients} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `updateConversionGoal()` | ConversionFunnel 内の `handleGoalChange()` | `ConversionFunnel` | デバウンス処理込み |
| `document.querySelectorAll('.funnel-stage')` | React state + map() | - | DOM操作を削除 |

**実装チェックリスト**:
- [x] 6段すべてが正しい色で表示される
- [x] 絵文字が各段の左に表示される
- [ ] 目標値入力欄が動作する ← 要確認
- [ ] 入力値が1秒後に保存される ← 要確認
- [x] 達成率が正しく計算される
- [ ] プログレスバーがアニメーションで伸びる（`transition: width 0.3s ease`）← 要確認

---

### 3.4 ステップ3: OKR進捗サマリーの実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行199-225

**目標UI**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 売上1億円達成
[████████████████████░░░░] 75%

✓ Key Result 1: ████████████████████ 100%
✓ Key Result 2: ████████████████░░░░  80%
△ Key Result 3: ████████░░░░░░░░░░░░  40%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**実装仕様**:

1. **レイアウト**:
   - カード全体: `background: var(--glass)`, `padding: 20px`, `border-radius: 12px`
   - Objective（目標文）: `font-size: 16px`, `font-weight: 600`
   - 全体進捗バー: 高さ `25px`, 角丸 `12px`
   - 各KRバー: 高さ `8px`, 角丸 `4px`

2. **色**:
   - 全体進捗バー: `linear-gradient(90deg, var(--primary), var(--primary-light))`
   - 進捗率: `var(--primary)`, `font-weight: 600`
   - KR達成（100%）: アイコン `✓`, 緑色
   - KR未達: アイコン `△`, グレー

3. **データソース**:
   - `useOKR()` フックから取得
   - `okr.objective`
   - `okr.keyResults`
   - 平均進捗: `keyResults.reduce((sum, kr) => sum + kr.current / kr.target * 100, 0) / keyResults.length`

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderOKRSummary()` | `<OKRSummary okr={okr} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `calculateProgress()` | OKRSummary 内のロジック | `OKRSummary` | 平均進捗計算 |

**実装チェックリスト**:
- [x] Objectiveが表示される
- [x] 平均進捗バーが表示される
- [x] Key Results が表示される
- [x] 各KRの進捗バーが表示される
- [x] 100%達成のKRに✓が表示される

---

### 3.5 ステップ4: TODO上位5件の実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行227-261

**目標UI**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 優先TODO（上位5件）

☐ 🔴 A社への提案書作成  期限: 11/28 [営業]
☐ 🟡 B社とのMTG準備     期限: 11/29 [営業]
☑ 🔵 議事録作成          期限: 11/27 [事務]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**実装仕様**:

1. **レイアウト**:
   - 各TODO: 横並び（チェックボックス・優先度・タイトル・期限・カテゴリ）
   - チェックボックス: `18px × 18px`
   - 優先度インジケーター: 🔴🟡🔵（高・中・低）
   - 期限: 右寄せ

2. **色**:
   - 完了済みTODO: テキストに `line-through`, 色は `var(--text-light)`
   - 期限超過: 赤背景 `rgba(244, 67, 54, 0.1)`, 赤文字
   - 期限3日以内: 黄背景 `rgba(255, 152, 0, 0.1)`, 黄文字

3. **データソース**:
   - `useTODOs()` フックから取得
   - ソート順: 未完了 → 優先度高 → 期限近い順
   - 上位5件のみ表示

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderTODOList()` | `<TODOList todos={todos} onToggle={toggleTodo} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `toggleTodo()` | `useTODOs().toggleTodo()` | `TODOList` | API呼び出し |
| `sortTodos()` | useTODOs 内のソート処理 | - | Hook内で実装 |

**実装チェックリスト**:
- [x] TODO が5件表示される
- [x] チェックボックスが動作する
- [x] 完了済みTODOに打ち消し線が表示される
- [ ] 期限が色分けされる ← 要確認
- [x] 優先度アイコンが表示される

---

### 3.6 ステップ5: 失注理由TOP3の実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行263-320

**目標UI**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 失注理由TOP3

1. 価格が合わない    ██████████████░░░░ 45% (9件)
2. タイミングが悪い  ██████████░░░░░░░░ 30% (6件)
3. 競合に負けた      ██████░░░░░░░░░░░░ 25% (5件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**実装仕様**:

1. **レイアウト**:
   - 各理由: 横並び（順位・理由名・プログレスバー・パーセント・件数）
   - プログレスバー: 高さ `20px`, 角丸 `10px`

2. **色**:
   - 1位: `linear-gradient(90deg, #f44336, #ef5350)`
   - 2位: `linear-gradient(90deg, #FF9800, #FFB74D)`
   - 3位: `linear-gradient(90deg, #FFC107, #FFCA28)`

3. **データソース**:
   - `useLostReasons()` フックから取得
   - `lostReason` でグルーピング
   - 件数降順でソート
   - TOP3のみ表示

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderLostReasons()` | `<LostReasons lostReasons={lostReasons} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `calculateLostStats()` | useLostReasons 内の集計処理 | - | Hook内で実装 |

**実装チェックリスト**:
- [x] 失注理由が表示される
- [x] パーセントが正しく計算される
- [x] プログレスバーが色分けされる
- [x] 件数が表示される

---

### 3.7 ステップ6: アプローチ管理の実装確認

**旧UI参照**: `archive/phase9-legacy-js/tabs/dashboard.ts` 行368-446

**目標UI**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 チャネル別アプローチ状況

リアル営業    ⚪30 🔵15 🟡8 🟠5 🟤2  (60件)
HP経由        ⚪50 🔵20 🟡5 🟠3 🟤7  (85件)
メルマガ      ⚪80 🔵30 🟡10 🟠8 🟤12 (140件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**実装仕様**:

1. **レイアウト**:
   - 各チャネル: 横並び（チャネル名・ステータス別件数）
   - ステータスアイコン: ⚪未接触 🔵反応あり 🟡商談中 🟠成約 🟤失注
   - **注意**: コンバージョンファネルは6段階（🟢既存先・🟣契約満了含む）だが、アプローチ管理は5段階（🟠成約を使用）

2. **色**:
   - チャネル名: `var(--text-dark)`, `font-weight: 600`
   - ステータス件数: 各色

3. **データソース**:
   - `useApproaches()` フックから取得
   - `channel` でグルーピング
   - 各チャネル内で `status` でカウント

**Legacy 関数マッピング**:

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderApproachesManagement()` | `<ApproachesManagement channelStats={channelStats} />` | `dashboard/page.tsx` | コンポーネント化済み |
| `groupByChannel()` | useApproaches 内の集計処理 | - | Hook内で実装 |

**実装チェックリスト**:
- [x] チャネルごとに集計される
- [x] ステータス別件数が表示される
- [x] 絵文字が表示される

---

### 3.8 Phase 9.92-1 完了条件（Definition of Done）

Phase 9.92-1 を「完了」とみなす条件：

#### 機能要件
- [x] KPI統計カードが4枚表示され、数値が正しく計算される
- [x] コンバージョンファネルが6段表示され、色が旧UIと一致する
- [ ] 目標値入力が動作し、1秒後に保存される ← **要実装**
- [x] OKR進捗サマリーが表示され、平均進捗が計算される
- [x] TODO上位5件が表示され、チェックボックスが動作する
- [x] 失注理由TOP3が表示され、プログレスバーが色分けされる
- [x] アプローチ管理がチャネル別に集計される

#### 非機能要件
- [ ] レスポンシブ（モバイル・タブレット・デスクトップ）← 要確認
- [ ] ガラスモーフィズム効果が適用されている ← 要確認
- [ ] ホバー時のアニメーションが動作する ← 要確認
- [ ] 旧UIとスクリーンショット比較で95%以上一致する ← **要実施**

#### 技術要件
- [ ] `npm run type-check` が通る
- [ ] `npm run build` が成功する
- [ ] 既存のPlaywrightテストが通る
- [x] DOM直接操作（`innerHTML`, `getElementById`など）を使用していない
- [x] すべてのロジックが ViewModel Hook に集約されている
- [ ] API 型定義が `lib/types/*.ts` で管理されている ← 要確認

---

## 4. 他タブ共通パターン（Phase 9.92-2〜10）

### 4.1 タブ移行の標準フロー

各タブの移行は、以下の7ステップで進めます。

#### ステップ1: レガシー実装の調査
- `archive/phase9-legacy-js/tabs/*.ts` を読み、主要関数をリストアップ
- DOM操作箇所を特定
- データフローを図示

#### ステップ2: ViewModel Hook の設計
- Hook名を決定（例: `useLeadsViewModel()`）
- 戻り値の型を定義
- API 呼び出し部分を実装

#### ステップ3: API 型定義の整備
- `lib/types/*.ts` に型を追加
- Route Handler と Hook で同じ型を使用

#### ステップ4: UI コンポーネントの接続
- 既存の UI コンポーネントを確認
- ViewModel から渡された値を表示するように修正
- イベントハンドラを Hook から受け取る

#### ステップ5: レガシー関数マッピング表の作成
- 「2.1 レガシー関数 → ViewModel 対応表のテンプレート」に従って作成

#### ステップ6: 動作確認
- ローカル環境で UI を確認
- 旧UIとの差分をスクリーンショット比較
- `npm run type-check` と `npm run build` を実行

#### ステップ7: 最小テストの作成（CODEXレビュー対応）

**各タブ完了時に、以下の最小テストを作成すること（テスト未整備時のスケルトン）**:

**E2E テストテンプレート** (`tests/e2e/phase992-{tab}.spec.ts`):
```typescript
// tests/e2e/phase992-dashboard.spec.ts
import { test, expect } from '@playwright/test';

// ========================================
// 認証ヘルパー関数（全テストで共通使用）
// ========================================
async function loginAsTestUser(page: Page) {
  // 方法1: Supabase Auth UI 経由でログイン
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
  await page.click('[data-testid="login-button"]');

  // ログイン完了を待機（ダッシュボードにリダイレクトされるまで）
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

// 方法2: Supabase セッショントークンを直接設定（高速化用）
async function loginWithStoredSession(page: Page) {
  // .env.test から取得したセッショントークンを使用
  const accessToken = process.env.TEST_ACCESS_TOKEN;
  const refreshToken = process.env.TEST_REFRESH_TOKEN;

  if (accessToken && refreshToken) {
    await page.goto('/');
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + 3600000 // 1時間後
      }));
    }, { accessToken, refreshToken });
  } else {
    // フォールバック: 通常のログインフロー
    await loginAsTestUser(page);
  }
}

test.describe('Phase 9.92 Dashboard Tab', () => {
  test.beforeEach(async ({ page }) => {
    // 認証処理（上記のヘルパー関数を使用）
    await loginWithStoredSession(page);
    await page.goto('/dashboard');
    // ページのロード完了を待機
    await page.waitForLoadState('networkidle');
  });

  test('ページが正常に表示される', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    // 主要コンポーネントの表示確認
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('KPI統計カードが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
    // 4枚のカードが存在することを確認
    await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(4);
  });

  test('データ取得エラー時にエラー表示される', async ({ page }) => {
    // API をモックしてエラーを返す
    await page.route('/api/dashboard/stats', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.reload();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});

// ========================================
// 環境変数の設定例（.env.test）
// ========================================
// TEST_USER_EMAIL=test@example.com
// TEST_USER_PASSWORD=testpassword
// TEST_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// TEST_REFRESH_TOKEN=abc123...
```

**ユニットテストテンプレート** (`lib/hooks/__tests__/useXxxViewModel.test.ts`):
```typescript
// lib/hooks/__tests__/useDashboardViewModel.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardViewModel } from '../useDashboardViewModel';

describe('useDashboardViewModel', () => {
  it('初期状態でloadingがtrueである', () => {
    const { result } = renderHook(() => useDashboardViewModel());
    expect(result.current.loading).toBe(true);
  });

  it('データ取得後にstatsが設定される', async () => {
    // TODO: モックAPIを設定
    const { result } = renderHook(() => useDashboardViewModel());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // TODO: stats の検証を追加
  });

  it('エラー時にerrorが設定される', async () => {
    // TODO: エラーケースのテスト
  });
});
```

**最小テスト要件（各タブで必須）**:
| テスト種別 | 最小ケース数 | 必須項目 |
|-----------|-------------|---------|
| E2E | 3件以上 | ページ表示、主要機能、エラーハンドリング |
| ユニットテスト | 3件以上 | 初期状態、正常系、異常系 |

#### ステップ8: DOD チェック
- 機能要件・非機能要件・技術要件をすべて満たすまで修正

### 4.2 ViewModel Hook のテンプレート

```tsx
// lib/hooks/useXxxViewModel.ts
import { useState, useEffect, useCallback } from 'react';

export function useXxxViewModel() {
  // === State ===
  const [data, setData] = useState<XxxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === API Calls ===
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/xxx');
      if (!res.ok) throw new Error('Failed to load data');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // === Event Handlers ===
  const handleAdd = useCallback(async (item: XxxItem) => {
    try {
      const res = await fetch('/api/xxx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed to add item');
      await loadData(); // Reload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [loadData]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<XxxItem>) => {
    try {
      const res = await fetch(`/api/xxx/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update item');
      await loadData(); // Reload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/xxx/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      await loadData(); // Reload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [loadData]);

  // === Effects ===
  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Return ===
  return {
    data,
    loading,
    error,
    loadData,
    handleAdd,
    handleUpdate,
    handleDelete,
  };
}
```

### 4.3 UI コンポーネントの接続パターン

```tsx
// app/(app)/xxx/page.tsx
'use client';

import { useXxxViewModel } from '@/lib/hooks/useXxxViewModel';
import { XxxList } from '@/app/_components/xxx/XxxList';

export default function XxxPage() {
  const { data, loading, error, handleAdd, handleUpdate, handleDelete } = useXxxViewModel();

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div className="container">
      <h1>XXX管理</h1>
      <XxxList
        items={data}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

---

## 5. Phase 9.92-2〜10 の概要

> **📝 注意**: 以下は各タブの概要です。各タブの実装を開始する際に、「3. Phase 9.92-1: ダッシュボードタブ完全移行手順」と同等の詳細セクション（ステップ1〜8、Legacy関数マッピング表、実装チェックリスト）を本ランブック内に追記してください。
>
> **詳細セクション追記テンプレート**:
> ```markdown
> ## X. Phase 9.92-N: {タブ名}タブ完全移行手順
>
> ### X.1 現状確認
> [現在のファイル構成と移行方針を記載]
>
> ### X.2 ステップ1: {機能名}の実装確認
> **旧UI参照**: `archive/phase9-legacy-js/tabs/{tab}.ts` 行XX-XX
> **目標UI**: [ASCII図で表現]
> **実装仕様**: [レイアウト・色・機能を詳細記載]
> **Legacy 関数マッピング**: [表形式で記載]
> **実装チェックリスト**: [チェックボックス形式]
>
> ### X.N Phase 9.92-N 完了条件（DOD）
> [機能要件・非機能要件・技術要件を記載]
> ```

### Phase 9.92-2: 見込み客管理タブ（Leads）

**含まれる機能**:
1. リストビュー / カンバンビュー切り替え
2. 見込み客追加フォーム
3. ステータス変更（ドラッグ&ドロップまたはドロップダウン）
4. 失注アンケート（モーダル）
5. タグ管理
6. 履歴管理
7. CSVインポート

**完了条件**:
- [ ] リストビューとカンバンビューが切り替わる
- [ ] 見込み客が追加できる
- [ ] ステータス変更が動作し、サーバーに保存される
- [ ] 失注時にアンケートモーダルが表示される
- [ ] タグが追加・削除できる
- [ ] 履歴が時系列で表示される

**ViewModel**: `useLeadsViewModel()`

**⚠️ 実装開始時に追記必須**: 詳細移行手順セクション（セクション番号: 3.X）

---

### Phase 9.92-3: 既存客管理タブ（Clients）

**含まれる機能**:
1. 既存客カルテ一覧
2. 次回ミーティング・契約期限の色分け表示
3. 取引履歴（最新3件）
4. カルテ展開/折りたたみ
5. ステータス変更（既存客 ⇔ 契約満了）
6. メモ追加

**完了条件**:
- [ ] カルテが一覧表示される
- [ ] 次回ミーティングが3日以内で黄色、過ぎていたら赤色になる
- [ ] 契約期限が30日以内で黄色、過ぎていたら赤色になる
- [ ] カルテを展開すると編集フォームが表示される
- [ ] ステータス・期限・ミーティング・メモが保存される

**ViewModel**: `useClientsViewModel()`

---

### Phase 9.92-4: MVV・OKRタブ

**含まれる機能**:
1. Mission, Vision, Value の表示・編集
2. Objective の表示・編集
3. Key Results の表示・編集・進捗バー
4. Emotion Patterns の表示・編集

**完了条件**:
- [ ] MVVが表示・編集できる
- [ ] OKRが表示・編集できる
- [ ] Key Results の進捗バーが動作する
- [ ] Emotion Patterns が表示・編集できる

**ViewModel**: `useMVVOKRViewModel()`

---

### Phase 9.92-5: ブランド指針タブ

**含まれる機能**:
1. Core Message
2. Tone & Manner
3. Words to Use
4. Words to Avoid

**完了条件**:
- [ ] 各項目が表示・編集できる
- [ ] 保存が動作する

**ViewModel**: `useBrandViewModel()`

---

### Phase 9.92-6: リーンキャンバスタブ

**含まれる機能**:
1. リーンキャンバスの9ブロック表示・編集
2. 商品ラインナップ（Front, Middle, Back）

**完了条件**:
- [ ] 9ブロックが表示・編集できる
- [ ] 商品が追加・編集・削除できる

**ViewModel**: `useLeanCanvasViewModel()`

---

### Phase 9.92-7: TODO管理タブ ✅ 完了（2025-11-25）

**含まれる機能**:
1. TODO一覧（優先度・期限・カテゴリ付き）
2. TODO追加フォーム
3. TODO完了チェックボックス
4. TODO削除
5. フィルター機能（期間・カテゴリ・ステータス）
6. ガントチャート表示

**完了条件**:
- [x] TODOが一覧表示される
- [x] TODOが追加できる
- [x] TODOを完了にできる
- [x] TODOが削除できる
- [x] フィルター機能が動作する
- [x] ガントチャートが表示される

**ViewModel**: `useTodoViewModel()`

**実装ファイル**:
- `lib/hooks/useTodoViewModel.ts`
- `app/_components/todo/TodoTab.tsx`

---

### Phase 9.92-8: Zoom会議タブ

**含まれる機能**:
1. Zoom会議スクリプト生成
2. エモーション選択
3. スクリプトコピー

**完了条件**:
- [ ] エモーションが選択できる
- [ ] スクリプトが生成される
- [ ] スクリプトがコピーできる

**ViewModel**: `useZoomScriptViewModel()`

---

### Phase 9.92-9: テンプレート集タブ

**含まれる機能**:
1. テンプレート一覧（Messenger, Email, Proposal, Closing）
2. テンプレート追加フォーム
3. テンプレート編集
4. テンプレート削除
5. 使用履歴

**完了条件**:
- [ ] テンプレートが一覧表示される
- [ ] テンプレートが追加できる
- [ ] テンプレートが編集できる
- [ ] 使用履歴が表示される

**ViewModel**: `useTemplatesViewModel()`

---

### Phase 9.92-10: レポートタブ

**含まれる機能**:
1. ロール別レポート表示（EXEC / MANAGER / MEMBER）
2. KPIサマリ表示
3. ファネル統計表示
4. Cross-Workspaceレポート（EXEC のみ）
5. CSVエクスポート機能

**完了条件**:
- [x] ロール別レポートサマリが表示される
- [x] KPIカード（見込み客数、既存客数、タスク数）が表示される
- [x] ファネル統計が表示される
- [x] EXEC は Cross-Workspace レポートを閲覧できる
- [x] CSV エクスポート（KPI / メンバー / 監査）が動作する
- [x] ReportsTab.tsx が作成されている
- [x] dashboard/page.tsx に接続されている
- [x] npm run type-check が通る
- [x] npm run build が通る

**ViewModel**: `useReportsViewModel()`

**UIコンポーネント**: `app/_components/reports/ReportsTab.tsx`

**実装日**: 2025-11-25

---

## 6. UI 側の接続ルール（全タブ共通）

### 6.1 page.tsx の構造

各タブの `page.tsx` は、次の構造に従うこと：

```tsx
'use client';

import { useXxxViewModel } from '@/lib/hooks/useXxxViewModel';
import { XxxComponent } from '@/app/_components/xxx/XxxComponent';

export default function XxxPage() {
  // ViewModel Hook を呼び出す
  const { data, loading, error, ...handlers } = useXxxViewModel();

  // ローディング・エラー表示
  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  // UI コンポーネントに props を渡す
  return (
    <div className="container">
      <h1>タイトル</h1>
      <XxxComponent data={data} {...handlers} />
    </div>
  );
}
```

### 6.2 コンポーネントの props

UI コンポーネントは、次のような props を受け取ること：

```tsx
interface XxxComponentProps {
  data: XxxItem[];
  onAdd: (item: XxxItem) => void;
  onUpdate: (id: string, updates: Partial<XxxItem>) => void;
  onDelete: (id: string) => void;
}

export function XxxComponent({ data, onAdd, onUpdate, onDelete }: XxxComponentProps) {
  // UI のみを実装
  // ロジックは props 経由で受け取る
}
```

### 6.3 JSX構造を変えない前提での差し替え手順

1. 既存の JSX を確認
2. `useState`, `useEffect` などのロジックを ViewModel Hook に移動
3. UI コンポーネントは props で受け取った値を表示するだけに変更
4. イベントハンドラは props 経由で渡す

---

## 7. よくある失敗パターンと対策

### 失敗パターン1: 複数タブを同時に実装してしまう

**問題**: 中途半端なタブが複数できて、どれも完成しない

**対策**: **1タブずつ完成させる**。Phase 9.92-1 が100%完了してから Phase 9.92-2 に進む。

---

### 失敗パターン2: 色やサイズが旧UIと微妙に違う

**問題**: 「だいたい同じ」で進めると、積み重なって違和感のあるUIになる

**対策**: **ピクセルパーフェクト**を目指す。旧UIのCSSをコピーして使う。

---

### 失敗パターン3: DOM直接操作を残してしまう

**問題**: `innerHTML`, `getElementById` を使うと、Reactのstate管理と衝突する

**対策**:
- すべて React の state/props で実装する。
- どうしても必要な場合は専用ラッパーコンポーネント + `useEffect` に隔離する。

---

### 失敗パターン4: ロジックがコンポーネント内に散らばる

**問題**: 複数のコンポーネントで API 呼び出しやデータ整形を行うと、保守性が低下する

**対策**:
- 1画面 = 1 ViewModel Hook のルールを徹底する。
- UI コンポーネントは props で渡された値を表示するだけにする。

---

### 失敗パターン5: 型定義を各ファイルで独自に作成してしまう

**問題**: Route Handler と ViewModel で異なる型を使うと、データ不整合が起こる

**対策**:
- API 入出力型は `lib/types/*.ts` に集約する。
- `any` を暫定的に使った場合は、必ず `// TODO: 型を具体化（Phase x.x）` を付けて技術負債として明示する。

---

### 失敗パターン6: 過去の実装を確認せずに「想像で作る」

**問題**: 旧UIとの挙動差異が発生し、ユーザーが混乱する

**対策**:
- 必ず `archive/phase9-legacy-js/tabs/*.ts` を読んでから実装する。
- レガシー関数マッピング表を作成し、漏れなく移管する。
- 旧UIのスクリーンショットと比較して、見た目を一致させる。

---

## 8. Phase 9.92 全体の完了条件（Definition of Done）

Phase 9.92 全体を「完了」とみなす条件：

### 機能要件
- [ ] 全10タブがそれぞれの DOD を満たしている
- [ ] 旧UIの機能がすべて React で動作する
- [ ] DOM直接操作を一切使用していない

### 非機能要件
- [ ] すべてのタブがレスポンシブ
- [ ] 旧UIとスクリーンショット比較で95%以上一致する
- [ ] ガラスモーフィズム効果が適用されている

### 技術要件
- [ ] `npm run type-check` が通る
- [ ] `npm run build` が成功する
- [ ] Playwright テストが全て Pass する
- [ ] すべてのロジックが ViewModel Hook に集約されている
- [ ] API 型定義が `lib/types/*.ts` で一元管理されている

### 技術負債ドキュメント要件
- [ ] セクション 0.9 の TODO コメントがコード内に記載されている
- [ ] `docs/TECH-DEBT-INVENTORY.md` が作成され、技術負債一覧が記録されている
- [ ] Phase 9.93 への引き継ぎ事項が明確化されている

---

## 9. Claude Code への指示テンプレート

### Phase 9.92-1 用

```markdown
あなたは Founders Direct Cockpit (FDC) プロジェクトの Phase 9.92-1 担当エンジニアです。

【作業指示】
1. `/Users/5dmgmt/プラグイン/foundersdirect` をプロジェクトルートとする
2. `docs/PHASE9.92-LEGACY-UI-REACT-RUNBOOK.md` の「3. Phase 9.92-1: ダッシュボードタブ完全移行手順」を参照
3. 各ステップで、旧UI（`archive/phase9-legacy-js/tabs/dashboard.ts`）のコードを参照し、色・レイアウト・機能を**100%正確に**復元する
4. 「0. React 実装ルール」をすべて遵守する：
   - 1画面 = 1 ViewModel Hook（0.1）
   - API 型定義は 1 ファイルに集約（0.2）
   - DOM 直接操作は禁止（0.3）
   - 状態は ViewModel 内で管理（0.4）
   - 1タブずつ完全移行（0.5）
5. 各ステップ完了後、`npm run type-check` と `npm run build` を実行して確認する

【完了レポート】
各ステップ完了時に以下を報告：
- 実装した機能
- 旧UIとの差分（ある場合）
- スクリーンショット比較結果
- 次のステップへの準備完了確認
```

### Phase 9.92-2〜10 用

```markdown
あなたは Founders Direct Cockpit (FDC) プロジェクトの Phase 9.92-X 担当エンジニアです。

【作業指示】
1. `/Users/5dmgmt/プラグイン/foundersdirect` をプロジェクトルートとする
2. `docs/PHASE9.92-LEGACY-UI-REACT-RUNBOOK.md` の「4. 他タブ共通パターン」を参照
3. 「4.1 タブ移行の標準フロー」に従って、7ステップで移行する
4. 「0. React 実装ルール」をすべて遵守する
5. 「2.2 タブ別レガシー関数一覧」を参照し、漏れなく移管する
6. 各ステップ完了後、`npm run type-check` と `npm run build` を実行して確認する

【完了レポート】
各ステップ完了時に以下を報告：
- 実装した機能
- レガシー関数マッピング表
- 旧UIとの差分（ある場合）
- スクリーンショット比較結果
- 次のステップへの準備完了確認
```

---

## 10. 参考資料

### 関連ドキュメント
- `docs/FDC-GRAND-GUIDE.md` — プロジェクト全体の設計方針
- `docs/PHASE9.9-BUGFIX-LEADS-RUNBOOK.md` — Phase 9.9 の権限・リード管理修正（必要に応じて参照）

### 現行の各タブ UI 実装
- `app/(app)/dashboard/page.tsx` — ダッシュボード（Phase 9.92-1）
- `app/(app)/leads/page.tsx` — 見込み客管理（Phase 9.92-2）
- `app/(app)/clients/page.tsx` — 既存客管理（Phase 9.92-3）
- `app/(app)/settings/page.tsx` — 設定

### レガシー実装
- `dist/js/main.js` — 旧バージョンの統合JS（参考）
- `archive/phase9-legacy-js/tabs/*.ts` — タブごとのレガシー実装
- 旧 `index.html` / `dist/index.html`（存在する場合）

### ViewModel Hook 実装例
- `lib/hooks/useDashboardStats.ts`
- `lib/hooks/useLeads.ts`
- `lib/hooks/useClients.ts`
- `lib/hooks/useOKR.ts`
- `lib/hooks/useTODOs.ts`
- `lib/hooks/useLostReasons.ts`
- `lib/hooks/useApproaches.ts`

---

## 11. 旧UIの設計仕様（基準値）

### カラーパレット（`:root` CSS変数）

```css
--primary: #00B8C4          /* メインカラー（ターコイズ） */
--primary-dark: #008A94     /* プライマリダーク */
--primary-light: #00E5F5    /* プライマリライト */
--text-dark: #111111        /* テキスト（濃） */
--text-medium: #333333      /* テキスト（中） */
--text-light: #555555       /* テキスト（淡） */
--bg-white: #FFFFFF         /* 背景（白） */
--bg-gray: #F7F7F7          /* 背景（グレー） */
--bg-gradient: linear-gradient(135deg, #f8feff 0%, #f0f9fa 100%)
--border: #E3E3E3           /* ボーダー */
--success: #4CAF50          /* 成功色 */
--warning: #FF9800          /* 警告色 */
--error: #F44336            /* エラー色 */
--shadow: 0 4px 20px rgba(0, 184, 196, 0.1)
--shadow-hover: 0 8px 30px rgba(0, 184, 196, 0.15)
--glass: rgba(255, 255, 255, 0.8)
```

### レイアウト基準値

- コンテナ最大幅: `1400px`
- パディング: `20px`
- カード角丸: `12px`
- ボタン角丸: `8px`
- 入力欄角丸: `4px`
- セクション間隔: `30px`
- カード内パディング: `20px`

### タイポグラフィ

- ベースフォント: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`
- 行高: `1.8`
- H1: `24px`, `font-weight: 600`
- H2: `20px`, `font-weight: 600`
- H3: `16px`, `font-weight: 600`
- Body: `14px`, `font-weight: 400`

---

## 12. FDC-GRAND-GUIDE 更新テンプレート

Phase 9.92 完了時（全10タブ移行完了時）に `docs/FDC-GRAND-GUIDE.md` を以下のように更新してください：

```markdown
### Phase 9.9: 緊急バグ修正 & ガバナンス強化
**ステータス**: ✅ 完了（残務は Phase 9.93 に委譲）
**目的**: 権限・リード管理・SAタブの実装
**残務**: Phase 9.93 で最終検証・修正を実施

### Phase 9.91: 大規模クリーンアップ & 構造改革
**ステータス**: ✅ 完了（残務は Phase 9.93 に委譲）
**目的**: レガシーコード隔離、ドキュメント標準化
**残務**: Phase 9.93 で最終検証を実施

### Phase 9.92: 全タブ再生プロジェクト
**ステータス**: ✅ 完了（全10タブReact移行完了）
**目的**: 旧UI完全再現 + 全10タブのReact/ViewModel化
**成果**: ダッシュボード、Leads、Clients、MVV、Brand、Lean、TODO、Zoom、Templates、Reportsの全タブが稼働
**次のアクション**: Phase 9.93 でバグ修正・整合性確保

### Phase 9.93: 最終バグ修正 & 完全整合性確保
**ステータス**: 🚧 実装中
**目的**: UI差異・ロジック差異・Next.js固有バグをゼロ化
**スコープ**: Phase 9.9/9.91 残務 + Phase 9.92 移行で発生した差異修正

### Phase 10: TODO機能本格実装（Elastic Search統合）
**ステータス**: ⏸️ 待機中（Phase 9.93 完了後に開始）
**目的**: TODO管理の高度化、Elastic Action Map実装
```

---

## 13. Phase 9.92-3: 既存客管理タブ完全移行手順

### 13.1 現状確認

**現在のファイル構成**:
- ViewModel: `lib/hooks/useClientsViewModel.ts`（新規作成）
- UI: `app/(app)/clients/page.tsx`（全面書き換え）

**移行方針**:
- レガシー実装（`archive/phase9-legacy-js/tabs/clients.ts`）を仕様書として使用
- 既存客（status='client'）と契約満了先（status='contract_expired'）を別セクションで表示
- カルテ展開/折りたたみ機能を React state で管理

### 13.2 Legacy 関数マッピング表

| Legacy 関数名 | 新 ViewModel 関数名 | 紐づく UI コンポーネント | 備考 |
|---------------|---------------------|---------------------------|------|
| `renderCustomers()` | `clients` (state) | `ClientsPage` | status='client' でフィルタ |
| `renderExpiredClients()` | `expiredClients` (computed) | `ClientsPage` | status='contract_expired' でフィルタ |
| `toggleCustomerExpand()` | `toggleExpand()` | `ClientCard` | カルテ展開/折りたたみ |
| `updateCustomerStatus()` | `updateStatus()` | `ClientCard` | ステータス変更 + 削除 |
| `updateCustomerDeadline()` | `updateDeadline()` | `ClientCard` | 契約期限更新 |
| `updateCustomerMeeting()` | `updateMeeting()` | `ClientCard` | 次回ミーティング更新 |
| `addCustomerNote()` | `addNote()` | `ClientCard` | 取引メモ追加 |
| `addExistingCustomer()` | `addClient()` | `ClientsPage` | 既存客追加 |
| `window.toggleCustomerExpand` | React state | - | DOM操作を削除 |
| `window.updateCustomerStatus` | React handler | - | DOM操作を削除 |
| `window.updateCustomerDeadline` | React handler | - | DOM操作を削除 |
| `window.updateCustomerMeeting` | React handler | - | DOM操作を削除 |
| `window.addCustomerNote` | React handler | - | DOM操作を削除 |
| `window.addExistingCustomer` | React handler | - | DOM操作を削除 |

### 13.3 実装した機能

1. **既存客カルテ一覧**
   - 既存客（status='client'）を一覧表示
   - カード形式で顧客名、会社名、連絡先、メモを表示
   - 左ボーダーカラー: `#4CAF50`（緑）

2. **契約満了先一覧**
   - 契約満了先（status='contract_expired'）を別セクションで表示
   - 左ボーダーカラー: `#9C27B0`（紫）

3. **カルテ展開/折りたたみ**
   - カードをクリックで展開/折りたたみ
   - 展開状態は `expandedClientId` で管理

4. **ステータス変更**
   - 既存先 ⇔ 契約満了 の変更
   - 削除オプション付き
   - 変更時に履歴を自動記録

5. **契約期限管理**
   - `<input type="date">` で設定
   - 期限切れ: 赤色表示
   - 30日以内: オレンジ色表示
   - それ以外: 緑色表示

6. **次回ミーティング管理**（既存先のみ）
   - `<input type="datetime-local">` で設定
   - 過ぎている: 赤色表示 + 「(過ぎています！)」
   - 3日以内: オレンジ色表示
   - それ以外: 通常色

7. **取引メモ追加**
   - テキストエリアで入力
   - 追加時に履歴を自動記録

8. **取引履歴表示**
   - 展開時に履歴を新しい順で表示
   - 日時、アクション名、メモを表示

9. **既存客追加フォーム**
   - 顧客名（必須）、会社名、連絡先（必須）、契約期限
   - 追加時に「既存先として追加」の履歴を自動記録

### 13.4 Phase 9.92-3 完了条件（Definition of Done）

#### 機能要件
- [x] 既存客カルテが一覧表示される
- [x] 契約満了先が別セクションで一覧表示される
- [x] カードをクリックでカルテが展開/折りたたみされる
- [x] ステータス変更が動作し、サーバーに保存される
- [x] 削除が動作し、確認ダイアログが表示される
- [x] 契約期限の更新が動作する
- [x] 次回ミーティングの更新が動作する（既存先のみ）
- [x] 取引メモの追加が動作する
- [x] 取引履歴が展開時に表示される
- [x] 既存客の追加が動作する

#### 非機能要件
- [x] 期限の色分け表示（赤/オレンジ/緑）
- [x] ガラスモーフィズム効果（backdrop-filter: blur）
- [x] レスポンシブ対応（グリッドレイアウト）

#### 技術要件
- [x] `npm run type-check` が通る
- [x] `npm run build` が成功する（警告のみ）
- [x] DOM直接操作（`innerHTML`, `getElementById`など）を使用していない
- [x] すべてのロジックが ViewModel Hook に集約されている
- [x] `// TODO: Phase 9.93` コメントが適切に記載されている

---

**最終更新:** 2025-11-25
**次のアクション**: Phase 9.92-4（MVV・OKRタブ）の実装を開始する
