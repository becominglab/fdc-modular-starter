# Phase 10 ランブック：TODO機能拡張（4象限 × カレンダー × 習慣化）v3.4

> **重要**: このドキュメントは PHASE10 DESIGN および RUNBOOK を統合した正式仕様である。
> Phase 10 に関するすべての開発は本ファイルを唯一の参照源として扱うこと。

## 0. 実装状況サマリー（2025-11-29 更新）

### ✅ 実装完了フェーズ

| サブフェーズ | 状態 | 概要 |
|-------------|------|------|
| **Phase 10-A** | ✅ 完了 | DB基盤・型定義・Zod スキーマ・楽観的排他制御 |
| **Phase 10-B** | ✅ 完了 | 4象限ボードUI・D&D・Gzip圧縮 |
| **Phase 10-C** | ✅ 完了 | Elastic Habits パネル・ストリーク・バッジ |
| **Phase 10-D** | ✅ 完了 | Google Calendar/Tasks連携・TimeAllocation |
| **Phase 10-E** | ✅ 完了 | 梅習慣×タスク連携システム |
| **Phase 10-F** | ✅ 完了 | Google Tasks双方向同期・絵文字プレフィックス対応 |

### 主要実装ファイル

| カテゴリ | ファイル | 説明 |
|---------|---------|------|
| **型定義** | `lib/types/task.ts` | Task, Suit, TaskStatus, googleTaskId |
| **型定義** | `lib/types/elastic-habit.ts` | ElasticHabit, UmeHabit, ElasticLevel |
| **型定義** | `lib/types/calendar.ts` | TaskLog, DailySummary, MonthlySummary |
| **型定義** | `lib/types/todo.ts` | 再エクスポート（後方互換） |
| **4象限ボード** | `app/_components/todo/TodoBoard.tsx` | D&Dマトリクス + 習慣ブロック |
| **習慣パネル** | `app/_components/todo/ElasticHabitsPanel.tsx` | 松竹梅選択UI |
| **梅習慣** | `app/_components/todo/UmeHabitManager.tsx` | 5分習慣CRUD |
| **時間配分** | `app/_components/todo/TimeAllocationBar.tsx` | 5色バー表示 |
| **圧縮** | `lib/core/compression.ts` | Gzip + Base64 |
| **Google連携** | `lib/google/calendar-client.ts` | Calendar API |
| **Google連携** | `lib/google/tasks-client.ts` | Tasks API |
| **Tasks同期** | `app/api/google/tasks/route.ts` | Google Tasks CRUD |
| **Tasks同期** | `app/api/google/tasks/sync/route.ts` | 双方向同期エンドポイント |
| **同期UI** | `app/_components/todo/GoogleTasksSyncButton.tsx` | 同期ボタンUI |

---

## 1. 目的と戦略

### 1.1 Phase 10 の位置づけ

本フェーズは、FDC の核心機能である **「アイゼンハワーマトリクス（4象限）」** と **「Elastic Habits（柔軟な習慣化）」** を実装するフェーズです。

**戦略的変更点（Phase 9.8 統合）**:
Phase 9.8 で積み残した「スケーラビリティ・ガバナンス課題（楽観的ロック、圧縮、管理画面）」を、**本フェーズのサブタスクとして完全に統合** します。
「TODO」という最も更新頻度が高い機能を実装しながらロック機構や圧縮を適用することで、実戦的な検証と堅牢化を同時に行います。

### 1.2 達成目標（Definition of Success）

1.  **時間管理の革命**: 15分単位のブロックと4象限マトリクスによる直感的なタスク管理。 ✅
2.  **習慣の定着**: 「松・竹・梅」システムによる、挫折しない習慣化ロジックの実装。 ✅
3.  **カレンダーとの融合**: Googleカレンダーの新機能（Block time for tasks）を活用した「集中時間」の確保。 ✅
4.  **完全なデータ整合性**: マルチデバイス間での同時編集でもデータが消失しない（Optimistic Locking + Conflict UX）。 ✅
5.  **運用基盤の確立**: 管理者機能とAI制御の実装完了。 ✅

## 2. 詳細仕様（Specification）

### 2.1 データモデル設計（Schema）

`Task` 型および DB スキーマ定義です。

```typescript
type Task = {
  id: string;
  // --- 基本情報 ---
  title: string;
  description?: string;

  // --- 4象限 (Eisenhower Matrix) ---
  // spade: 緊急かつ重要 (Do First)   -> 黒 ⬛
  // heart: 重要なこと (Schedule)     -> 赤 🟥 (Elastic Habits)
  // diamond: 緊急なだけ (Delegate)   -> 黄 🟨
  // club: 未来創造 (Create Future)   -> 青 🟦 (Future Work)
  suit: 'spade' | 'heart' | 'diamond' | 'club';

  // --- 時間ブロック (Time Blocking) ---
  // 15分刻み (00, 15, 30, 45)
  startAt?: string;          // "09:00", "14:15" など
  durationMinutes?: number;  // 15, 30, 45, 60... (15の倍数推奨)
  suggestedDuration?: number; // AI/過去実績からの推奨時間（後述）

  // --- Elastic Habits (松竹梅) ---
  isElasticHabit?: boolean;
  elasticLevel?: 'ume' | 'take' | 'matsu'; // 梅(Min), 竹(Avg), 松(Max)
  streakCount?: number;      // 連続達成日数（UX強化）
  lastCompletedAt?: string;  // 最終完了日（ストリーク計算用）

  // --- 連携 ---
  googleCalendarEventId?: string;

  // --- 小タスク (1ブロック内の同種タスク) ---
  subTasks?: { id: string; title: string; completed: boolean }[];

  // --- システム制御 ---
  status?: 'not_started' | 'in_progress' | 'done'; // Phase 11連携用
  updatedAt: number;
};

// WorkspaceData 全体構造（JSON）
type AppData = {
  // ...existing fields
  todos: Task[];
  version: number; // 楽観的ロック用 (Phase 9.8 BR-01)
};
```

### 2.2 4象限の日本語ラベル定義（UX強化）

初見ユーザーがアイゼンハワーマトリクスを直感的に理解できるよう、**日本語ラベルを併記**します。

| Suit | 記号 | 日本語ラベル | 英語参照 | 色 | 説明 |
|------|------|-------------|----------|-----|------|
| spade | ♠ | **緊急かつ重要** | Do First | 黒 ⬛ | 今すぐ自分でやるべきタスク |
| heart | ♥ | **重要なこと** | Schedule | 赤 🟥 | 計画的に時間を確保。Elastic Habits 対象 |
| diamond | ♦ | **緊急なだけ** | Delegate | 黄 🟨 | 他人に任せる or 素早く片付ける |
| club | ♣ | **未来創造** | Create Future | 青 🟦 | 将来への種まき。焦らず育てる |

**UI表示例**:
```
┌─────────────────┬─────────────────┐
│ ♠ 緊急かつ重要   │ ♥ 重要なこと     │
│ Do First        │ Schedule        │
├─────────────────┼─────────────────┤
│ ♦ 緊急なだけ     │ ♣ 未来創造       │
│ Delegate        │ Create Future   │
└─────────────────┴─────────────────┘
```

### 2.3 推奨時間サジェスト機能（UX強化）

ユーザーが時間見積もりに悩む時間を削減するため、**タスクの種類・過去の実績から所要時間を提案**します。

```typescript
type DurationSuggestion = {
  suggestedMinutes: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string; // "過去の同カテゴリ平均", "タイトルから推定" など
};

// 推奨時間の計算ロジック
function suggestDuration(task: Partial<Task>, history: Task[]): DurationSuggestion {
  // 1. タイトルキーワードから推定（例: "会議" → 60分, "電話" → 15分）
  // 2. 同じユーザーの過去タスク履歴から平均を算出
  // 3. Elastic Habits の場合、松/竹/梅に応じたデフォルト値
  // ...
}
```

**UIフロー**:
1. タスク作成時、タイトル入力後に「推奨: 30分」と表示
2. ユーザーは採用/変更を選択可能
3. 実際の所要時間との差分をフィードバックとして学習（将来拡張）

### 2.4 容量・ライフサイクルポリシー

**容量制限**:
- **通常運用目標**: 200KB 以下
- **ハード上限**: 250KB
- **対策**: Phase 10-B で実装する **Gzip 圧縮レイヤー** により、実質容量を2倍以上（約500KB相当）確保する。

**アーカイブポリシー**:
- 完了後 **180日** 経過した Task はアーカイブ対象とする（表示から除外）。
- `subTasks` は最大 10件、`description` は最大 500文字の UI 制限を設ける。

### 2.5 Google カレンダー連携仕様（v3.3 Update - November 17, 2025）

**重要**: Google Calendar に「Block off time for tasks」機能が追加されました（2025年11月17日）。
これにより、カレンダー上で直接タスクの時間をブロックできるようになりました。

#### 2.5.1 Google Calendar 新機能「Block off time for tasks」

> **公式発表（November 17, 2025）**:
> Users can now easily block off time on their calendar to work on a specific task.
> On your calendar, select an empty slot > click task. From here, you can add the
> relevant task and description, and customize details like visibility and do not
> disturb settings. You'll also see the task on your task list and get reminded
> until the task is completed.

**FDC での活用方針**:

1. **タスクの時間予約はGoogle Calendar側で行う**
   - FDC で作成したタスクは、ユーザーが Google Calendar の新機能を使って「いつやるか」を予約
   - カレンダーで時間をブロックすると、通知オフ（Do Not Disturb）状態を作れる

2. **FDC の役割**:
   - タスクの分類（4象限）
   - 習慣タスクの自動生成（松竹梅）
   - 進捗・ストリークの管理
   - Google Calendar との双方向同期

3. **連携フロー**:
   ```
   [FDC] タスク作成 → [Google Tasks] 同期 → [Google Calendar] Block off time
                                          ↓
   [FDC] 完了状態を同期 ← [Google Tasks] タスク完了
   ```

- **タイトル規則**: `[♠] 会議` のようにスート記号を自動付与。
- **同期方向**:
  - **FDC → Google Tasks**（作成・更新）：標準機能
  - **Google Tasks → FDC**（完了状態の同期）
- **削除**: FDC でタスク削除時、Google Tasks は**削除しない**（安全側優先）。

### 2.6 Elastic Habits（松竹梅）定義 v2

#### 2.6.1 対象象限

**Elastic Habits は ♥（重要なこと）と ♣（未来創造）のみ対象**

| 象限 | Elastic Habits | 理由 |
|------|----------------|------|
| ♠ 緊急かつ重要 | ❌ 対象外 | 緊急タスクは「今すぐやる」ため習慣化不要 |
| ♥ 重要なこと | ✅ 対象 | 計画的に時間を確保すべき習慣（読書、運動など） |
| ♦ 緊急なだけ | ❌ 対象外 | 緊急タスクは「さっさと片付ける」ため習慣化不要 |
| ♣ 未来創造 | ✅ 対象 | 将来への投資習慣（学習、執筆、スキルアップなど） |

#### 2.6.2 習慣テンプレートと自動タスク生成

**コンセプト**: 「やる気がない日は梅、ある日は松」を選ぶことで継続率を高める。

**データモデル**:
```typescript
type HabitTemplate = {
  id: string;
  title: string;
  suit: 'heart' | 'club';  // ♥ または ♣ のみ
  levels: {
    ume: { minutes: number; description: string };   // 梅（最小）
    take: { minutes: number; description: string };  // 竹（標準）
    matsu: { minutes: number; description: string }; // 松（最大）
  };
  streakCount: number;
  lastCompletedAt?: string;
};

// 例: 読書習慣（♥ 重要なこと）
const readingHabit: HabitTemplate = {
  id: 'reading',
  title: '読書',
  suit: 'heart',
  levels: {
    ume: { minutes: 5, description: '1ページだけ読む' },
    take: { minutes: 15, description: '1章読む' },
    matsu: { minutes: 30, description: 'じっくり読書' },
  },
  streakCount: 14,
};

// 例: 学習習慣（♣ 未来創造）
const learningHabit: HabitTemplate = {
  id: 'learning',
  title: 'プログラミング学習',
  suit: 'club',
  levels: {
    ume: { minutes: 10, description: 'ドキュメントを1つ読む' },
    take: { minutes: 30, description: 'チュートリアルを進める' },
    matsu: { minutes: 60, description: '新機能を実装する' },
  },
  streakCount: 7,
};
```

**UIフロー（習慣タブ）**:
1. ♥ と ♣ の習慣テンプレートを表示
2. 各習慣について「今日のレベル」を選択（梅/竹/松ボタン）
3. 選択すると**その日のタスクが自動生成**され、対応する象限に追加される
4. タスク完了時にストリークが更新される

#### 2.6.1 達成履歴のビジュアル表示（UX強化）

習慣化モチベーション向上のため、**成功体験の可視化**を実装します。

```typescript
// Elastic Habits の達成状態
type HabitProgress = {
  habitId: string;
  title: string;
  streakCount: number;           // 連続達成日数
  longestStreak: number;         // 過去最長ストリーク
  totalCompletions: number;      // 累計達成回数
  weeklyCompletions: number[];   // 直近7日の達成（0/1配列）
  monthlyCompletions: number[];  // 直近30日の達成
};
```

**UIコンポーネント**:

```
┌─────────────────────────────────────────────┐
│ 🔥 読書習慣                    ストリーク: 14日  │
│                                              │
│ 今週: ● ● ● ● ● ○ ○  (5/7)                │
│                                              │
│ 🏆 最長記録: 21日  |  累計: 156回達成         │
│                                              │
│ [梅 5分] [竹 15分] [松 30分]                  │
└─────────────────────────────────────────────┘
```

**バッジシステム**:
- 🔥 7日連続達成
- 🌟 30日連続達成
- 👑 100日連続達成
- 💎 過去最長ストリーク更新

---

## 3. Phase 10 サブフェーズ構成

### Phase 10-A: DB基盤と整合性（Foundation）✅ 完了

**目的**: TODOデータの保存構造を作り、同時に**データ整合性（ロック機構）**を確立する。

**実装タスク**:
1.  ✅ **Schema**: `lib/types/todo.ts` に `Task`, `UmeHabit`, `TaskLog` 型を定義。
2.  ✅ **Locking (BR-01)**: API に `version` チェック（CAS）を実装。
3.  ✅ **Conflict UI (BR-06)**: 409 エラー発生時の解決モーダル実装。
4.  ✅ **Validation (BR-03)**: Zod による `sanitizeAppData` を実装。
5.  ✅ **API**: `PUT /api/workspaces/[id]/data` が TODO の更新を正しく処理。

**DOD**: ✅ 全項目達成
- [x] TODOデータの保存・読み込みができる。
- [x] 2つのタブで同時保存すると、409エラーと解決モーダルが出る。
- [x] 必須フィールドが欠けたデータをロードしてもUIが落ちない（補完される）。

### Phase 10-B: 4象限ボード UI & 効率化（Board UI）✅ 完了

**目的**: 直感的なドラッグ＆ドロップ UI を構築し、データ増大に備えて**圧縮**を適用する。

**実装タスク**:
1.  ✅ **Board UI**: `app/_components/todo/TodoBoard.tsx` で 2x2 マトリクスを実装。
    - 日本語ラベル併記（SUIT_CONFIG で定義）
2.  ✅ **Task Card**: `TodoCard.tsx` でスート別の色分けと時間表示。
3.  ✅ **推奨時間サジェスト**: `DurationSuggestion` 型で定義。
4.  ✅ **Compression (BR-02)**: `lib/core/compression.ts` で Gzip 圧縮を実装。
    - Gzip + Base64 エンコード
    - 非圧縮データのフォールバック対応
5.  ✅ **Perf Monitor (BR-08)**: 処理時間計測を実装。

**DOD**: ✅ 全項目達成
- [x] タスクをドラッグして象限（スート）を変更できる。
- [x] 各象限に日本語ラベル（「♠ 緊急かつ重要」等）が表示されている。
- [x] タスク作成時に推奨時間が表示される。
- [x] 保存されたデータサイズが非圧縮時の 50% 以下になっている。
- [x] パフォーマンス計測ログがコンソールに出力される。

### Phase 10-C: Elastic Habits & ガバナンス（Habits/AI）✅ 完了

**目的**: 習慣化ロジックを実装し、AI/セキュリティ設定をユーザーに開放する。

**実装タスク**:
1.  ✅ **Elastic Logic**: `ElasticHabitsPanel.tsx` で松竹梅選択UI実装。
2.  ✅ **ストリークカウンター & バッジ**: `BADGE_CONFIG`, `getTaskBadges()` 実装。
3.  ✅ **Security Settings (GOV-03)**: AI機能の ON/OFF トグル実装。
4.  ✅ **Client Versioning (BR-07)**: バージョン不整合時リロード機構実装。

**DOD**: ✅ 全項目達成
- [x] 「竹」を選ぶと、設定された時間のタスクがボードに追加される。
- [x] ストリークカウンター（連続達成日数）が正しく表示・更新される。
- [x] 7日連続達成でバッジが表示される。
- [x] 設定画面で AI を OFF にすると、AI 機能がエラー（403）になる。
- [x] デプロイ直後にクライアントが自動リロードされる。

### Phase 10-D: Google Tasks連携 & 時間有効活用ダッシュボード（Integration）✅ 完了

**目的**: Google Tasks/Calendar との連携を実装し、**時間の有効活用度を可視化**する。

> **重要な方針変更（2025年11月）**:
> Google Calendar に「Block off time for tasks」機能が追加されたため、
> FDC はタスクの「いつやるか」を管理せず、Google Calendar/Tasks に委譲する。
> FDC は「何をやるか（4象限分類）」と「時間の有効活用度」に集中する。

**実装タスク**:

#### 10-D-1: Google Tasks/Calendar 連携

1.  **Google Tasks 同期**:
    - `googleapis` の Tasks API を使用
    - FDC タスク作成時に Google Tasks に同期（タイトルは `[♠] タイトル` 形式）
    - Google Tasks での完了状態を FDC に同期（ポーリング方式）
    - **時間予約は Google Calendar の新機能「Block off time」で行う**（FDC は関与しない）

2.  **Google Calendar 4色分け連携**:
    - カレンダー予定を4象限で色分け
    - FDC同期時: タイトルに `[♠]` プレフィックスを付与
    - 既存予定: colorId で判定（Graphite→♠, Tomato→♥, Banana→♦, Blueberry→♣）
    - 判定できない予定 → 🃏 ジョーカー

#### 10-D-2: 時間有効活用ダッシュボード（Joker Time）

**コンセプト**: 1日の活動可能時間を5つに分類し、「ジョーカー時間」を減らすほど有効活用度が上がる。

```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 今日の時間配分（2025-11-28 木）                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⏰ 活動可能時間: 17h（24h - 睡眠7h）                             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ♠ 緊急かつ重要    2.0h ███░░░░░░░░░░░░░░░░░░░░░░░░  11.8%  │ │
│ │ ♥ 重要なこと      3.5h █████░░░░░░░░░░░░░░░░░░░░░░  20.6%  │ │
│ │ ♦ 緊急なだけ      1.0h █░░░░░░░░░░░░░░░░░░░░░░░░░░   5.9%  │ │
│ │ ♣ 未来創造        2.5h ████░░░░░░░░░░░░░░░░░░░░░░░  14.7%  │ │
│ │ 🃏 ジョーカー      8.0h ████████████░░░░░░░░░░░░░░░  47.1%  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 📊 時間有効活用度: 52.9%    目標: 70%  あと 2.9h で達成！        │
└─────────────────────────────────────────────────────────────────┘
```

**データモデル**:

```typescript
// ユーザー設定
type TimeSettings = {
  sleepHours: number;        // 平均睡眠時間（デフォルト: 7h）
  targetEffectiveness: number; // 目標有効活用率（デフォルト: 70%）
};

// 時間配分（日次/週次/月次）
type TimeAllocation = {
  date: string;              // "2025-11-28" or "2025-W48" or "2025-11"
  period: 'daily' | 'weekly' | 'monthly';

  availableMinutes: number;  // 活動可能時間（分）

  // 4象限 + ジョーカー（分単位）
  spadeMinutes: number;      // ♠ 緊急かつ重要
  heartMinutes: number;      // ♥ 重要なこと
  diamondMinutes: number;    // ♦ 緊急なだけ
  clubMinutes: number;       // ♣ 未来創造
  jokerMinutes: number;      // 🃏 未分類/空き時間

  // 計算値
  allocatedMinutes: number;  // 4象限の合計
  effectivenessRate: number; // 有効活用率 = allocated / available * 100
};
```

**時間の集計方法**:

1. **FDC タスク（estimatedMinutes）**:
   - 「今日のフォーカス」に追加されたタスクの推定時間を suit 別に合計

2. **Google Calendar 予定**:
   - colorId または タイトルプレフィックス `[♠]` で suit を判定
   - 判定できない予定は 🃏 ジョーカー
   - FDC タスクと重複しない予定のみカウント

3. **ジョーカー時間**:
   - `jokerMinutes = availableMinutes - (spade + heart + diamond + club)`
   - ジョーカー率が低いほど時間を有効活用している

**Google Calendar colorId マッピング**:

| colorId | 色名 | Suit | 説明 |
|---------|------|------|------|
| 8 | Graphite（黒系） | ♠ spade | 緊急かつ重要 |
| 11 | Tomato（赤） | ♥ heart | 重要なこと |
| 5 | Banana（黄） | ♦ diamond | 緊急なだけ |
| 9 | Blueberry（青） | ♣ club | 未来創造 |
| その他 | - | 🃏 joker | 未分類 |

#### 10-D-3: 習慣UI改善（♥/♣ 専用）

1.  **習慣タブを ♥ と ♣ のみに絞る**:
    - 習慣テンプレートに `suit: 'heart' | 'club'` を追加
    - 各習慣について「今日のレベル」を選択（梅/竹/松ボタン）
    - 選択すると対応する象限にタスクが自動生成

2.  **ストリーク管理の改善**:
    - 習慣タスクが完了したら自動的にストリーク更新
    - 「今日のタスクが未完了」の場合、翌日0時にストリークをリセット
    - 週間達成表示（● ○ 形式）

#### 10-D-4: 週次・月次レポート

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 時間有効活用レポート              [今日] [今週] [今月]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 今週の推移                                                       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 月  52% ████████████████░░░░░░░░░░░░░░░░                  │   │
│ │ 火  68% █████████████████████░░░░░░░░░░░                  │   │
│ │ 水  71% ██████████████████████░░░░░░░░░░  ← 目標達成！    │   │
│ │ 木  45% ██████████████░░░░░░░░░░░░░░░░░░  ← 今日          │   │
│ │ 金  --                                                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 週平均: 59%    ベスト: 水曜 71%                                  │
│                                                                 │
│ 💡 改善ポイント: ♦（緊急なだけ）が多すぎます。委譲を検討しては？  │
└─────────────────────────────────────────────────────────────────┘
```

**DOD**: ✅ 全項目達成
- [x] FDC でタスクを作ると Google Tasks に反映される。
- [x] Google Tasks で完了にすると FDC のタスクも完了になる。
- [x] Google Calendar の予定が4色 + ジョーカーで分類される。
- [x] 今日の時間配分が5色バーで可視化される（TimeAllocationBar.tsx）。
- [x] 時間有効活用度（%）がリアルタイムで表示される。
- [x] 習慣タブで ♥ と ♣ の習慣のみが表示される。
- [x] 松竹梅を選ぶと、その日のタスクが自動生成される。
- [x] 週次/月次の有効活用度レポートが表示される（DailySummary/MonthlySummary）。

### Phase 10-E: 梅習慣×タスク連携システム ✅ 完了（2025-11-28）

**目的**: 5分単位の梅習慣を15分タスクに紐付け、習慣化の継続を支援する。

**実装ファイル**:
- `lib/types/todo.ts` - UmeHabit, LinkedUmeHabit, TaskLog 型
- `app/_components/todo/UmeHabitManager.tsx` - 梅習慣CRUD
- `app/_components/todo/ElasticHabitsPanel.tsx` - 習慣×タスク連携

**実装タスク**:
1.  ✅ **UmeHabit マスタ**: 5分固定の習慣を ♥/♣ 象限で管理
2.  ✅ **LinkedUmeHabit**: 15分タスクに最大3つの梅習慣を紐付け
3.  ✅ **ストリーク管理**: `updateUmeHabitStreak()` で連続達成日数を計算
4.  ✅ **日付カットオフ**: 午前3時を日付の境界として深夜作業に対応
5.  ✅ **アーカイブ機能**:
    - `archiveWeeklyLogs()`: 7日超のTaskLogをDailySummaryに集計（日曜日実行）
    - `archiveMonthlyLogs()`: 前月分のDailySummaryをMonthlySummaryに集計（月初1日実行）

**DOD**: ✅ 全項目達成
- [x] 梅習慣マスタのCRUD（作成・編集・削除）ができる
- [x] 梅習慣を15分タスクに紐付けできる（最大3つ）
- [x] 梅習慣完了時にストリークが更新される
- [x] 午前3時カットオフで深夜作業が同日扱いになる
- [x] 週次・月次のアーカイブが正しく動作する

### Phase 10-F: Google Tasks双方向同期 ✅ 完了（2025-11-29）

**目的**: モバイルでのタスク管理を支援するため、Google Tasks との完全な双方向同期を実装。

**実装ファイル**:
- `app/api/google/tasks/route.ts` - Google Tasks CRUD API
- `app/api/google/tasks/sync/route.ts` - 双方向同期エンドポイント
- `app/_components/todo/GoogleTasksSyncButton.tsx` - 同期ボタンUI
- `lib/hooks/useTaskViewModel.ts` - syncToGoogleTasks, syncFromGoogleTasks
- `lib/types/task.ts` - googleTaskId フィールド追加

**実装タスク**:
1.  ✅ **Google Tasks API エンドポイント**:
    - GET: タスクリスト一覧取得
    - POST: タスク作成（絵文字プレフィックス付き）
    - PATCH: タスク更新（完了状態など）
    - DELETE: タスク削除

2.  ✅ **双方向同期エンドポイント** (`/api/google/tasks/sync`):
    - POST: FDC → Google Tasks（絵文字プレフィックス⬛️🟥🟨🟦付きで同期）
    - GET: Google Tasks → FDC（完了状態取得、新規タスクインポート）
    - 「FDC Todo」タスクリストを自動作成
    - notes に `[FDC:taskId]` を埋め込み双方向追跡

3.  ✅ **絵文字プレフィックス対応**:
    - ⬛️ = spade（すぐやる）
    - 🟥 = heart（予定に入れ実行）
    - 🟨 = diamond（任せる＆自動化）
    - 🟦 = club（未来創造20%タイム）

4.  ✅ **UIコンポーネント**:
    - GoogleTasksSyncButton: ドロップダウンメニュー付き同期ボタン
      - 双方向同期
      - FDC → Tasks（送信のみ）
      - Tasks → FDC（受信のみ）

5.  ✅ **カレンダーイベント連携強化**:
    - 予定タブの日付切り替え（昨日/今日/明日）が正しく動作
    - 絵文字プレフィックス付きカレンダーイベントの自動4象限分類
    - タスク追加時にカレンダーイベントを絵文字プレフィックスでリネーム

**DOD**: ✅ 全項目達成
- [x] FDC タスクが Google Tasks に絵文字プレフィックス付きで同期される
- [x] Google Tasks での完了が FDC に反映される
- [x] Google Tasks/Calendar で絵文字プレフィックス付きタスクを作成するとFDCにインポートできる
- [x] 予定タブの日付切り替えが正しくカレンダー予定を取得する
- [x] 4象限のタイトル色がスートに応じて変化する

---

## 4. Claude Code 用プロンプト

### Phase 10-A プロンプト

```markdown
あなたは FDC Phase 10-A 担当エンジニアです。
TODO機能のデータ基盤を作成し、同時に**楽観的排他制御**を確立します。

実施事項:
1. **Schema**: `lib/types/state.ts` に `Task` 型と `todos` 配列を追加。
   - `status` フィールドを含めること（Phase 11 連携用）
   - `streakCount`, `lastCompletedAt` フィールドを含めること（Elastic Habits 強化用）
2. **Validator (BR-03)**: `lib/core/validator.ts` を作成し、Zod で `sanitizeAppData` を実装（TODO配列の補完含む）。
3. **Locking API (BR-01)**:
   - `app/api/workspaces/[id]/data/route.ts` の PUT 処理を修正。
   - DBの `version` カラムと比較し、不一致なら 409 を返す。一致なら `version + 1` で保存。
4. **Conflict UI (BR-06)**:
   - `lib/core/apiClient.ts` で 409 を捕捉。
   - 「リロードして最新化」か「自分の変更で強制上書き」を選べるモーダル (`js/ui/components/ConflictModal.js`) を統合。

DOD:
- [ ] TODO を含むデータの保存・取得ができる。
- [ ] 同時保存で競合モーダルが表示され、解決（上書き/リロード）できる。
```

### Phase 10-B プロンプト

```markdown
あなたは FDC Phase 10-B 担当エンジニアです。
4象限ボードUIを実装し、データ容量対策として**圧縮**を導入します。

実施事項:
1. **Board UI**: `app/(app)/todo/page.tsx` に `dnd-kit` で 2x2 マトリクスを実装。
   - スート（♠♥♦♣）による自動振り分け。
   - **重要**: 各象限に日本語ラベルを併記すること：
     - ♠ 緊急かつ重要
     - ♥ 重要なこと
     - ♦ 緊急なだけ
     - ♣ 未来創造
2. **Task Card**: カードコンポーネント実装（タイトル、時間、松竹梅バッジ）。
3. **推奨時間サジェスト**: タスク作成時に過去履歴・キーワードから推奨時間を提案。
4. **Compression (BR-02)**:
   - `lib/core/compression.ts` (Gzip) を実装。
   - 保存直前・読込直後に圧縮/解凍を挟む。
   - **重要**: 解凍失敗時は「非圧縮データ」とみなして続行するフォールバックを入れること。
5. **Perf Monitor (BR-08)**:
   - 圧縮・暗号化の処理時間を `console.time` 等で計測・出力。

DOD:
- [ ] ドラッグ＆ドロップでスート変更が保存される。
- [ ] 日本語ラベルが各象限に表示されている。
- [ ] DB保存サイズが圧縮により半減している。
```

### Phase 10-C プロンプト

```markdown
あなたは FDC Phase 10-C 担当エンジニアです。
Elastic Habits（松竹梅習慣）と、運用ガバナンス機能を実装します。

実施事項:
1. **Elastic Habits**:
   - 習慣マスタ（読書、運動など）から「松/竹/梅」を選んでタスク化するUI。
   - `elasticLevel` に応じて所要時間を自動設定。
2. **ストリークカウンター**:
   - 連続達成日数（`streakCount`）の計算・表示。
   - 週間達成表示（● ● ● ● ○ ○ ○ 形式）。
   - バッジシステム（7日🔥, 30日🌟, 100日👑）。
3. **Security Settings (GOV-03)**:
   - `/settings/security` ページ作成。
   - `ai_enabled` トグル（DB連動）、暗号鍵ローテーションボタン。
4. **Client Versioning (BR-07)**:
   - APIレスポンスヘッダーのバージョン確認と、不一致時のリロード機構。

DOD:
- [ ] 松竹梅ボタンからタスクが生成される。
- [ ] ストリークカウンターが正しく表示・更新される。
- [ ] AI設定をOFFにするとAI APIが拒否される。
```

### Phase 10-D プロンプト

```markdown
あなたは FDC Phase 10-D 担当エンジニアです。
Google Tasks/Calendar連携と**時間有効活用ダッシュボード**を実装し、Phase 10 を完成させます。

**重要な方針（2025年11月17日更新）:**
Google Calendar に「Block off time for tasks」機能が追加されたため、
FDC はタスクの「いつやるか」を管理せず、Google Tasks/Calendar に委譲します。
FDC は「何をやるか（4象限分類）」と「時間の有効活用度」に集中します。

実施事項:

### 10-D-1: Google Tasks/Calendar 連携
1. **Google Tasks 同期**:
   - `googleapis` の Tasks API を使用
   - FDC タスク作成時に Google Tasks に同期
   - タイトルは `[♠] タイトル` の形式
   - Google Tasks での完了状態を FDC に同期（ポーリング方式）

2. **Google Calendar 4色分け連携**:
   - カレンダー予定を4象限で色分け
   - FDC同期時: タイトルに `[♠]` プレフィックスを付与
   - 既存予定: colorId で判定
     - colorId: 8 (Graphite) → ♠
     - colorId: 11 (Tomato) → ♥
     - colorId: 5 (Banana) → ♦
     - colorId: 9 (Blueberry) → ♣
     - その他 → 🃏 ジョーカー

### 10-D-2: 時間有効活用ダッシュボード
1. **TimeAllocation 型**:
   - `lib/types/time-allocation.ts` を作成
   - `spadeMinutes`, `heartMinutes`, `diamondMinutes`, `clubMinutes`, `jokerMinutes`
   - `effectivenessRate = (4象限合計 / 活動可能時間) * 100`

2. **TimeAllocationBar コンポーネント**:
   - 5色の横バーで時間配分を可視化
   - ジョーカー率が低いほど有効活用度が高い

3. **ユーザー設定**:
   - `sleepHours`: 平均睡眠時間（デフォルト: 7h）
   - `targetEffectiveness`: 目標有効活用率（デフォルト: 70%）

### 10-D-3: 習慣UI改善（♥/♣ 専用）
1. **ElasticHabitsPanel.tsx を更新**:
   - 習慣テンプレートに `suit: 'heart' | 'club'` を追加
   - ♥ と ♣ のみ表示
   - 「今日のレベル」を選択すると、その日のタスクが自動生成

### 10-D-4: 週次・月次レポート
1. **TimeReport コンポーネント**:
   - 日次/週次/月次切り替え
   - 有効活用度の推移グラフ
   - 改善ポイントの提案

DOD:
- [ ] FDC タスクが Google Tasks に同期される
- [ ] Google Tasks での完了が FDC に反映される
- [ ] Google Calendar の予定が4色 + ジョーカーで分類される
- [ ] 今日の時間配分が5色バーで可視化される
- [ ] 時間有効活用度（%）がリアルタイムで表示される
- [ ] 習慣タブで ♥ と ♣ のみ表示
- [ ] 週次/月次レポートが表示される
```

---

## 5. 運用・リスク管理

*   **データ消失リスク**: Phase 10-A で実装する「楽観的ロック」と「Conflict UI」が最重要防衛線です。ここを妥協せず実装してください。
*   **API リスク**: Google Calendar API の Focus Time 対応プロパティは公式ドキュメントで最新仕様を確認してください。
*   **リリース**: 各サブフェーズ（10-A, B, C, D）完了ごとに main ブランチへマージし、Vercel プレビュー環境で検証を行ってください。

---

## 6. UX強化機能サマリー（v3.3 追加）

Phase 10 で実装する UX 強化機能の一覧：

| # | 機能 | 対象サブフェーズ | 効果 |
|---|------|-----------------|------|
| 1 | 日本語ラベル併記 | 10-B | 初見ユーザーの理解向上 |
| 2 | 推奨時間サジェスト | 10-B | 時間見積もりの負担軽減 |
| 3 | ストリークカウンター | 10-C | 習慣化モチベーション向上 |
| 4 | 達成バッジシステム | 10-C | 成功体験の可視化 |
| 5 | Google Calendar 4色分け | 10-D | 予定の4象限分類 |
| 6 | **時間有効活用ダッシュボード** | 10-D | **ジョーカー時間の可視化** |
| 7 | 週次/月次レポート | 10-D | 時間活用の振り返り |

---

## 7. Phase 11 連携（TODO → Action Map）

### 7.1 Phase 10-D 実装後の役割分担

Phase 10-D 実装後、FDC と Google Calendar の役割を以下のように整理します。

```
┌─────────────────────────────────────────────────────────────┐
│ FDC の役割（Phase 10-D 以降）                                │
├─────────────────────────────────────────────────────────────┤
│ ✅ 4象限分類（緊急度×重要度）                                 │
│ ✅ Elastic Habits（松竹梅）のストリーク管理                   │
│ ✅ 「今日のフォーカス」タスク選択（Phase 11 で実装）           │
│ ✅ Action Map → TODO の階層可視化（Phase 11 で実装）          │
├─────────────────────────────────────────────────────────────┤
│ Google Calendar/Tasks の役割                                 │
├─────────────────────────────────────────────────────────────┤
│ 📅 時間ブロックの管理（Block off time for tasks）             │
│ 📅 リマインダー・通知                                        │
│ 📅 実績としてのカレンダー記録                                │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Elastic Habits の適用対象（Phase 10-D 仕様）

松竹梅（Elastic Habits）は以下の象限にのみ適用します：

| 象限 | Elastic Habits | 理由 |
|------|---------------|------|
| ♠ 緊急かつ重要 | ❌ 対象外 | 緊急タスクに「梅（最小）」は不適切 |
| ♥ 重要なこと | ✅ 対象 | 計画的な習慣化に最適 |
| ♦ 緊急なだけ | ❌ 対象外 | 習慣化の対象ではない |
| ♣ 未来創造 | ✅ 対象 | 長期投資型の習慣に最適 |

### 7.3 Phase 11 で追加予定のフィールド

Phase 11（Action Map）実装時に、Task 型に以下のフィールドを追加予定：

```typescript
// Task 型への追加フィールド（Phase 11 で実装）
export interface Task {
  // 既存フィールド...

  // 今日のフォーカス
  isTodayFocus?: boolean;       // 今日のフォーカスに含まれるか
  focusDate?: string;           // フォーカス対象日（ISO日付）

  // Action Map 連携
  actionItemId?: string;        // 紐づく Action Item の ID
  actionMapId?: string;         // 紐づく Action Map の ID
}
```

### 7.4 3レイヤービュー設計（Phase 11 で実装）

Phase 11 で TODO 画面に以下の3ビューを追加予定：

1. **今日のフォーカス**: `isTodayFocus: true` のタスクのみ表示
2. **4象限バックログ**: Phase 10 で実装済みのボード（全タスク）
3. **Action Map ドリルダウン**: Action Map → Action Item → TODO の階層表示

詳細は `PHASE11-ACTION-MAP-RUNBOOK.md` セクション12を参照。

---
