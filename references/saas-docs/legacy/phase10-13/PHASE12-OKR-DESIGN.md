# Phase 12：OKR 設計ドキュメント

**Version:** 1.0
**Created:** 2025-11-29
**Status:** Ready for Review

---

## 1. 用語定義と役割

### 1.1 基本用語

| 用語 | 定義 | 例 |
|------|------|-----|
| **Objective** | 達成したい定性的な目標。インパクトが大きく、チームを鼓舞するもの | 「市場シェアを拡大し、業界リーダーになる」 |
| **Key Result** | Objectiveの達成度を測る定量的な成果指標 | 「新規案件数を前年比150%に増やす」 |
| **Scope** | OKRの適用範囲（会社/チーム/個人） | company, team, individual |
| **Owner** | OKRの責任者 | ワークスペース内のユーザー |
| **Progress** | 目標に対する進捗率（0〜100%） | 75% |

### 1.2 OKR と Action Map / TODO の関係性

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        戦略レイヤー（OKR）                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Objective: 市場シェアを拡大し、業界リーダーになる                    │   │
│  │   └─ KR1: 新規案件数150%増（calcMethod: fromActionMaps）           │   │
│  │   └─ KR2: 商談転換率20%向上（calcMethod: manual）                  │   │
│  │   └─ KR3: セキュリティ監査完了（isQualitative: true）              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ 紐付け（N:M）                          │
│                                    ▼                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        戦術レイヤー（Action Map - Phase 11）                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Action Map: Q1 新規リード10件獲得プラン                              │   │
│  │   └─ Action Item: テレアポリスト作成 → 佐藤A                       │   │
│  │   └─ Action Item: 毎日30分テレアポ → 佐藤A                         │   │
│  │   └─ Action Item: リード品質チェック → 鈴木B                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ 紐付け（1:N）                          │
│                                    ▼                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        実行レイヤー（TODO - Phase 10）                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TODO: テレアポ30分実施 [♠ 緊急かつ重要] 09:00-09:30                 │   │
│  │ TODO: リストAに電話 [♠ 緊急かつ重要] 10:00-10:30                    │   │
│  │ TODO: 品質チェックレポート作成 [♥ 重要なこと] 14:00-15:00           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 具体例

#### 例1: 営業部門

```
Objective: Q1 売上を前年比130%に成長させる（Scope: company）
├─ KR1: 新規案件数150%増（calcMethod: fromActionMaps）
│   └─ Action Map: Q1新規リード10件獲得プラン
│       ├─ テレアポリスト作成 → TODO × 5件
│       ├─ 毎日30分テレアポ → TODO × 60件
│       └─ リード品質チェック → TODO × 10件
│
├─ KR2: 商談転換率20%向上（calcMethod: manual, currentValue: 15%）
│   └─ Action Map: 商談スキル向上プラン
│       ├─ 商談ロールプレイ実施
│       └─ 成功事例分析会
│
└─ KR3: 平均案件サイズ30%増（calcMethod: manual）
    └─ Action Map: アップセル強化プラン
```

#### 例2: プロダクト開発部門

```
Objective: ユーザー満足度を高め、競争力を強化する（Scope: team）
├─ KR1: NPS 40点以上（calcMethod: manual）
│   └─ Action Map: UXリサーチプラン
│
├─ KR2: 重大バグ0件（calcMethod: manual, currentValue: 2件）
│   └─ Action Map: 品質強化プラン
│
└─ KR3: 新機能5件リリース（calcMethod: fromActionMaps）
    └─ Action Map: Q1機能開発プラン
        ├─ ダークモード実装
        ├─ 検索機能強化
        └─ モバイル対応
```

#### 例3: 人事部門（定性KRを含む）

```
Objective: 優秀な人材を確保し、チームを強化する（Scope: company）
├─ KR1: 新規採用5名（calcMethod: manual）
│   └─ Action Map: 採用強化プラン
│
├─ KR2: 入社後90日離職率5%以下（calcMethod: manual）
│   └─ Action Map: オンボーディング改善
│
└─ KR3: 採用ブランド戦略を確立する（isQualitative: true ← Yes/No型）
    └─ Action Map: 採用広報プラン
```

---

## 2. データモデル

### 2.1 Objective型

```typescript
// lib/types/okr.ts

export type ObjectiveId = string;
export type KeyResultId = string;

/**
 * Objective のスコープ
 * - company: 会社全体の目標
 * - team: チーム/部門の目標
 * - individual: 個人の目標
 */
export type ObjectiveScope = 'company' | 'team' | 'individual';

/**
 * Objective のステータス
 * - on_track: 順調（進捗率70%以上、または残日数に余裕あり）
 * - at_risk: 要注意（進捗率40-70%、または手動リスクフラグON）
 * - off_track: 要対応（進捗率40%未満で残日数少ない）
 */
export type ObjectiveStatus = 'on_track' | 'at_risk' | 'off_track';

/**
 * Objective（目的）
 *
 * 達成したい定性的な目標。インパクトが大きく、チームを鼓舞するもの。
 */
export interface Objective {
  id: ObjectiveId;
  title: string;                    // 最大150文字
  description?: string;             // 最大1000文字

  scope: ObjectiveScope;            // 会社/チーム/個人
  ownerUserId: string;              // 責任者

  periodStart?: string;             // ISO日付（例：2025-01-01）
  periodEnd?: string;               // ISO日付（例：2025-03-31）

  // 進捗（配下KRから自動集計）
  progressRate?: number;            // 0〜100
  status?: ObjectiveStatus;         // 自動計算 or 手動フラグで上書き

  // 手動リスクフラグ（UX強化 v12.1）
  manualRiskFlag?: boolean;         // true の場合、status は常に 'at_risk'
  manualRiskReason?: string;        // リスク理由（最大200文字）

  // 振り返り（UX強化 v12.1）
  retrospective?: {
    whatWentWell?: string;          // 何がうまくいったか（Markdown対応）
    challenges?: string;            // 課題
    improvements?: string;          // 次への改善点
    completedAt?: string;           // 振り返り完了日時
  };

  isArchived?: boolean;             // アーカイブフラグ

  createdAt: string;
  updatedAt: string;

  tagIds?: string[];                // レポート用途（将来拡張）
}
```

### 2.2 KeyResult型

```typescript
/**
 * KR の計算方法
 * - manual: 手動入力（currentValue / targetValue）
 * - fromActionMaps: Action Map の進捗から自動計算
 */
export type KRCalcMethod = 'manual' | 'fromActionMaps';

/**
 * Key Result（成果指標）
 *
 * Objective の達成度を測る定量的な指標。
 * 定性的なマイルストーン（Yes/No型）もサポート。
 */
export interface KeyResult {
  id: KeyResultId;
  objectiveId: ObjectiveId;

  title: string;                    // 最大200文字

  // 定量目標（数値型KRの場合）
  targetValue?: number;             // 例: 150
  currentValue?: number;            // 例: 120
  unit?: string;                    // 例: "%", "件", "万円"

  // 定性目標（Yes/No達成型KR - UX強化 v12.1）
  isQualitative?: boolean;          // true の場合、Yes/No達成型
  isAchieved?: boolean;             // 定性KRの達成フラグ

  calcMethod: KRCalcMethod;         // 手入力 or ActionMap連動で算出
  progressRate?: number;            // 0〜100

  // 戦術層との連携（N:M対応）
  linkedActionMapIds?: string[];    // 最大10件

  ownerUserId: string;              // KRオーナー（担当責任者）

  createdAt: string;
  updatedAt: string;
}
```

### 2.3 workspace_data への追加構造

```json
{
  "objectives": [
    {
      "id": "obj_001",
      "title": "市場シェアを拡大し、業界リーダーになる",
      "description": "2025年Q1までに業界トップ3入りを目指す",
      "scope": "company",
      "ownerUserId": "user_ceo",
      "periodStart": "2025-01-01",
      "periodEnd": "2025-03-31",
      "progressRate": 75,
      "status": "on_track",
      "manualRiskFlag": false,
      "isArchived": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    },
    {
      "id": "obj_002",
      "title": "営業力を強化する",
      "scope": "team",
      "ownerUserId": "user_sales_manager",
      "periodStart": "2025-01-01",
      "periodEnd": "2025-03-31",
      "progressRate": 40,
      "status": "at_risk",
      "manualRiskFlag": true,
      "manualRiskReason": "主要顧客Aとの契約更新が難航中",
      "isArchived": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    }
  ],
  "keyResults": [
    {
      "id": "kr_001",
      "objectiveId": "obj_001",
      "title": "新規案件数を前年比150%に増やす",
      "targetValue": 150,
      "currentValue": 120,
      "unit": "件",
      "isQualitative": false,
      "calcMethod": "fromActionMaps",
      "progressRate": 80,
      "linkedActionMapIds": ["am_001", "am_002"],
      "ownerUserId": "user_sales",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    },
    {
      "id": "kr_002",
      "objectiveId": "obj_001",
      "title": "商談転換率を20%向上",
      "targetValue": 20,
      "currentValue": 15,
      "unit": "%",
      "isQualitative": false,
      "calcMethod": "manual",
      "progressRate": 75,
      "linkedActionMapIds": ["am_003"],
      "ownerUserId": "user_sales",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    },
    {
      "id": "kr_003",
      "objectiveId": "obj_001",
      "title": "セキュリティ監査を完了する",
      "isQualitative": true,
      "isAchieved": true,
      "calcMethod": "manual",
      "progressRate": 100,
      "linkedActionMapIds": [],
      "ownerUserId": "user_cto",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-28T12:00:00.000Z"
    }
  ]
}
```

### 2.4 既存データとの互換性保証

Phase 11以前のデータには `objectives` / `keyResults` フィールドが存在しない。
ロード時のフォールバック処理により、既存データが壊れないことを保証する：

```typescript
// lib/core/okr.ts

export function initializeOKRData(appData: AppData): void {
  // objectives が存在しない場合は空配列で初期化
  if (!appData.objectives) {
    appData.objectives = [];
  }

  // keyResults が存在しない場合は空配列で初期化
  if (!appData.keyResults) {
    appData.keyResults = [];
  }
}
```

---

## 3. ロールアップ計算ポリシー

### 3.1 計算式（擬似コード）

#### 手動KRの進捗計算

```typescript
function computeManualKRProgress(kr: KeyResult): number {
  if (kr.isQualitative) {
    // 定性KR（Yes/No型）
    return kr.isAchieved ? 100 : 0;
  }

  // 数値型KR
  if (!kr.targetValue || kr.targetValue === 0) return 0;
  const rate = Math.round((kr.currentValue || 0) / kr.targetValue * 100);
  return Math.min(100, Math.max(0, rate)); // 0-100 に制限
}
```

#### 自動KRの進捗計算（ActionMapから）

```typescript
function computeAutoKRProgress(
  kr: KeyResult,
  actionMaps: ActionMap[]
): number {
  const linked = actionMaps.filter(am =>
    kr.linkedActionMapIds?.includes(am.id)
  );

  if (linked.length === 0) return 0;

  const totalProgress = linked.reduce(
    (sum, am) => sum + (am.progressRate || 0),
    0
  );

  return Math.round(totalProgress / linked.length);
}
```

#### Objectiveの進捗計算

```typescript
function computeObjectiveProgress(
  objective: Objective,
  keyResults: KeyResult[]
): number {
  const krs = keyResults.filter(kr => kr.objectiveId === objective.id);

  if (krs.length === 0) return 0;

  const totalProgress = krs.reduce(
    (sum, kr) => sum + (kr.progressRate || 0),
    0
  );

  return Math.round(totalProgress / krs.length);
}
```

#### ステータス自動判定（手動フラグ考慮）

```typescript
function computeObjectiveStatus(
  objective: Objective,
  progressRate: number
): ObjectiveStatus {
  // 手動リスクフラグが ON の場合は常に 'at_risk'
  if (objective.manualRiskFlag) return 'at_risk';

  const now = new Date();
  const end = objective.periodEnd ? new Date(objective.periodEnd) : null;
  const daysLeft = end
    ? Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (progressRate >= 70) return 'on_track';
  if (progressRate >= 40 && daysLeft > 7) return 'on_track';
  if (progressRate < 40 && daysLeft < 14) return 'off_track';
  return 'at_risk';
}
```

### 3.2 更新タイミング

| イベント | 更新対象 | タイミング |
|---------|---------|-----------|
| Task完了 | ActionItem.progressRate | 即時 |
| ActionItem更新 | ActionMap.progressRate | 即時 |
| ActionMap更新 | KR.progressRate（calcMethod: fromActionMaps のみ） | 遅延（debounce 500ms） |
| KR更新 | Objective.progressRate, status | 遅延（debounce 500ms） |
| 手動リスクフラグ変更 | Objective.status | 即時 |

### 3.3 エッジケース処理

| ケース | 処理 |
|-------|------|
| 紐づくActionMapが0件 | KR.progressRate = 0（calcMethod: fromActionMaps の場合） |
| ActionMap削除時 | 全KRの linkedActionMapIds から該当IDを自動削除 |
| KR削除時 | 紐づくActionMapは削除しない（他のKRでも使われている可能性） |
| Objective削除時 | 配下のKRも連動削除（確認ダイアログあり） |
| 計算エラー時 | ログ記録 + 前回の progressRate を維持 |

---

## 4. ActionMap 連携ルール

### 4.1 N:M 関係の採用理由

**1:N ではなく N:M を採用する理由：**

実務では、**1つのActionMapが複数のKRに貢献するケース**が頻繁に発生する。

**例1: 営業強化プラン**
- 同じ「営業強化プラン」ActionMap が以下の複数KRに貢献:
  - KR1「新規リード数150%増」
  - KR2「商談転換率20%向上」
  - KR3「平均案件サイズ30%増」

**例2: 採用強化プラン**
- 同じ「採用強化プラン」ActionMap が:
  - KR1「営業チーム5名増員」
  - KR2「エンジニアチーム3名増員」

### 4.2 紐付けUI/UXフロー

#### KR から ActionMap を作成

1. OKRタブで Objective を選択
2. KR詳細の「Action Mapを作成」ボタンをクリック
3. Action Map 新規作成モーダルが開く
   - タイトル初期値: KRのタイトル
   - Owner初期値: KRのownerUserId
4. Action Map を作成
5. 自動的に `KR.linkedActionMapIds` に追加

#### 既存の ActionMap を KR にリンク

1. OKRタブで KR詳細の「Action Mapをリンク」ボタンをクリック
2. 現在のワークスペース内の ActionMap 一覧から選択（複数選択可）
3. 選択した ActionMap の id を `KR.linkedActionMapIds` に追加
4. 紐付け上限（10件）を超える場合はエラー表示

#### ActionMap 側からの確認

1. Action Map タブで Action Map 詳細を開く
2. 「関連KR」セクションで、この ActionMap が紐づいている KR 一覧を表示
3. KR タイトルをクリックすると OKR タブに遷移

### 4.3 削除時の整合性保証ルール

```typescript
// lib/core/okr.ts

/**
 * ActionMap削除時に呼び出す
 * 全KRの linkedActionMapIds から該当IDを削除
 */
export function unlinkActionMapFromAllKRs(
  actionMapId: string,
  keyResults: KeyResult[]
): KeyResult[] {
  return keyResults.map(kr => {
    if (!kr.linkedActionMapIds?.includes(actionMapId)) return kr;

    return {
      ...kr,
      linkedActionMapIds: kr.linkedActionMapIds.filter(id => id !== actionMapId),
      updatedAt: new Date().toISOString(),
    };
  });
}
```

### 4.4 逆引き表示の仕様

Action Map 詳細画面で「関連KR」を表示するため、以下の逆引き関数を実装：

```typescript
/**
 * ActionMap に紐づいている KR を取得
 */
export function findKRsByActionMapId(
  actionMapId: string,
  keyResults: KeyResult[]
): KeyResult[] {
  return keyResults.filter(kr =>
    kr.linkedActionMapIds?.includes(actionMapId)
  );
}
```

---

## 5. 権限ポリシー

### 5.1 CRUD権限マトリクス

| 操作 | OWNER | ADMIN | MEMBER | 備考 |
|------|-------|-------|--------|------|
| Objective 閲覧 | ✓ | ✓ | ✓ | 同一ワークスペース内 |
| Objective 作成 | ✓ | ✓ | ✗ | Manager権限必要 |
| Objective 編集（自分がOwner） | ✓ | ✓ | ✗ | |
| Objective 編集（他人がOwner） | ✓ | ✗ | ✗ | OWNERのみ |
| Objective 削除 | ✓ | ✓（自分のみ） | ✗ | |
| KR 閲覧 | ✓ | ✓ | ✓ | |
| KR 作成 | ✓ | ✓（自分のObjのみ） | ✗ | |
| KR 編集 | ✓ | ✓（自分がOwnerのKR） | ✗ | |
| KR 進捗更新（手動） | ✓ | ✓（自分がOwner） | ✗ | |
| KR ↔ ActionMap リンク | ✓ | ✓ | ✗ | |
| 手動リスクフラグ設定 | ✓ | ✓（自分のObj） | ✗ | |

### 5.2 RLS との統合方針

OKRデータは `workspace_data` JSON 内に保存されるため、既存のRLSポリシー（workspace_data テーブルへのアクセス制御）がそのまま適用される。

追加のRLSは不要。アプリケーションレイヤーで権限チェックを実装。

```typescript
// lib/hooks/useOKRViewModel.ts

export function canManageOKR(userRole: WorkspaceRoleType): boolean {
  return userRole === 'OWNER' || userRole === 'ADMIN';
}

export function canEditObjective(
  objective: Objective,
  userId: string,
  userRole: WorkspaceRoleType
): boolean {
  if (userRole === 'OWNER') return true;
  if (userRole === 'ADMIN' && objective.ownerUserId === userId) return true;
  return false;
}
```

---

## 6. UI/UX モック

### 6.1 OKRタブの3カラムレイアウト

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OKR タブ                                              [+ 新規Objective作成]  │
├─────────────┬───────────────────────┬───────────────────────────────────────┤
│ 📅 期間     │ Objective 一覧        │ Objective 詳細                        │
│             │                       │                                       │
│ [全期間]    │ 🎯 市場シェア拡大     │ 🎯 市場シェア拡大                     │
│ [Q1 2025]   │ 🟢 75% on_track      │ 説明: 業界トップ3入りを目指す         │
│ [Q2 2025]   │ スコープ: company     │ スコープ: company                    │
│ [Q3 2025]   │ Owner: 山田太郎       │ Owner: 山田太郎                      │
│ [Q4 2025]   │ 2025-01 〜 2025-03   │ 期間: 2025-01-01 ~ 2025-03-31        │
│ [年間 2025] │ ████████░░ 75%       │ 進捗: ████████░░ 75%                │
│ [カスタム]  │                       │ ステータス: 🟢 on_track              │
│             │ 🎯 営業力強化         │                                       │
│             │ 🟡 40% at_risk       │ ⚠️ リスクフラグ: [OFF]                │
│             │ ⚠️ リスクフラグON     │                                       │
│             │ スコープ: team        │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│             │                       │ Key Results (3)       [+ KR追加]     │
│             │                       │                                       │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR1: 新規案件数150%増 (数値型)   │ │
│             │                       │ │ 目標: 150 / 現在: 120 (件)       │ │
│             │                       │ │ 計算: 自動（ActionMapから）      │ │
│             │                       │ │ 進捗: ████████░░ 80%            │ │
│             │                       │ │ 連携ActionMap: 2件               │ │
│             │                       │ │ [編集] [削除] [AM作成] [AMリンク] │ │
│             │                       │ └──────────────────────────────────┘ │
│             │                       │                                       │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR2: 商談転換率20%向上 (数値型)  │ │
│             │                       │ │ 目標: 20 / 現在: 15 (%)          │ │
│             │                       │ │ 計算: 手動入力                   │ │
│             │                       │ │ 進捗: ███████░░░ 75%            │ │
│             │                       │ │ [編集] [削除] [AM作成]           │ │
│             │                       │ └──────────────────────────────────┘ │
│             │                       │                                       │
│             │                       │ ┌──────────────────────────────────┐ │
│             │                       │ │ KR3: セキュリティ監査完了 (Y/N型)│ │
│             │                       │ │ タイプ: Yes/No達成型             │ │
│             │                       │ │ 達成状況: ✅ 達成済み            │ │
│             │                       │ │ 進捗: ██████████ 100%           │ │
│             │                       │ │ [編集] [削除]                    │ │
│             │                       │ └──────────────────────────────────┘ │
└─────────────┴───────────────────────┴───────────────────────────────────────┘
```

### 6.2 カスタム期間フィルタ

```
┌─────────────────────────────────────────┐
│ カスタム期間                  [✕ 閉じる] │
├─────────────────────────────────────────┤
│ 開始日: [2025-02-01]                    │
│ 終了日: [2025-05-31]                    │
│                                         │
│ [キャンセル] [適用]                      │
└─────────────────────────────────────────┘
```

### 6.3 手動リスクフラグUI

```
┌─────────────────────────────────────────────────┐
│ 🎯 市場シェア拡大                               │
│ 進捗: ████████░░ 75%   ステータス: 🟢 on_track  │
│                                                 │
│ ⚠️ 手動リスクフラグ: [ON] [OFF]                 │
│ 理由: ┌─────────────────────────────────────┐  │
│       │ 主要顧客Aとの契約更新が難航中      │  │
│       └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 6.4 定性KR（Yes/No型）のUI

```
┌──────────────────────────────────────────────┐
│ KR3: セキュリティ監査を完了する (Yes/No型)   │
├──────────────────────────────────────────────┤
│ タイプ: 🎯 Yes/No達成型                      │
│                                              │
│ 達成状況: [✅ 達成済み] [⬜ 未達成]          │
│                                              │
│ 進捗: ██████████ 100%                       │
└──────────────────────────────────────────────┘
```

### 6.5 OKRテンプレート選択画面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OKRテンプレートを選択                                        [✕ 閉じる]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 💼 営業・売上                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 売上拡大                                                                │ │
│ │ Obj: 売上を前年比XXX%に成長させる                                       │ │
│ │ KR1: 新規案件数をX件獲得                                               │ │
│ │ KR2: 平均案件単価をX%向上                                              │ │
│ │ KR3: 既存顧客からの売上をX%増加                                        │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 👥 採用・人事                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 採用強化                                                                │ │
│ │ Obj: 優秀な人材を確保し、チームを強化する                               │ │
│ │ KR1: X名の新規採用を完了                                               │ │
│ │ KR2: 採用リードタイムをX日以内に短縮                                   │ │
│ │ KR3: 入社後90日離職率をX%以下に維持                                    │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 🛠️ プロダクト・開発                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ プロダクト品質向上                                                      │ │
│ │ Obj: ユーザー満足度を高め、プロダクトの競争力を強化する                 │ │
│ │ KR1: NPS（顧客推奨度）をX点以上に向上                                  │ │
│ │ KR2: 重大バグ発生件数をX件以下に削減                                   │ │
│ │ KR3: 新機能リリース数をX件達成                                         │ │
│ │                                                    [このテンプレートを使用] │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 📊 カスタム                                                                 │
│ [空白から作成]                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 構造化された振り返りフォーム

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 振り返り: 市場シェア拡大 (Q1 2025)                           [保存] [閉じる] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ## 何がうまくいったか                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ - リード獲得は目標を20%超過                                             │ │
│ │ - 新規顧客からの紹介が増加                                              │ │
│ │ - テレアポの転換率が向上                                                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ## 課題                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ - 商談転換率が目標未達（15% vs 20%目標）                                │ │
│ │ - 大型案件の成約が遅延                                                  │ │
│ │ - リソース不足で既存顧客フォローが手薄                                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ## 次への改善点                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ - 商談スキル研修を Q2 に実施予定                                        │ │
│ │ - 大型案件専任担当を設置                                                │ │
│ │ - カスタマーサクセス担当を1名増員                                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 💡 Markdown形式で記述できます                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.7 Dashboard OKRウィジェット

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 今期の OKR 進捗                                          [詳細を見る →] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Objective: 市場シェア拡大                                                   │
│ ████████░░ 75%  🟢 on_track                                                │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Objective: 営業力強化                                                       │
│ ████░░░░░░ 40%  🟡 at_risk ⚠️                                              │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ サマリー:                                                                   │
│ 🟢 順調: 1件  |  🟡 要注意: 1件  |  🔴 要対応: 0件                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.8 Action Map側の「関連KR」セクション

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Action Map: Q1 新規リード10件獲得プラン                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 進捗: ████████░░ 80%                                                       │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ 🎯 関連 Key Results                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ • KR: 新規案件数150%増 (市場シェア拡大)           [OKRタブで表示 →]    │ │
│ │ • KR: 商談転換率20%向上 (営業力強化)              [OKRタブで表示 →]    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ 📋 Action Items                                                             │
│ ...                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 容量見積もり

### 7.1 現状の workspace_data サイズ

**Phase 9.99 計測結果（2025-11-28）:**
- **P95: 751 bytes**
- 目標 < 200KB を大幅クリア

**Phase 11 追加後の推定:**
- Action Maps（50件想定）: ~20KB
- Action Items（200件想定）: ~30KB
- **Phase 11 完了時点推定: ~50KB**

### 7.2 Phase 12 追加容量

| データ種別 | 件数（最大） | 1件あたり | 合計 |
|-----------|-------------|-----------|------|
| Objective | 50件 | ~500 bytes | ~25 KB |
| KeyResult | 200件 | ~400 bytes | ~80 KB |
| **合計** | | | **~105 KB** |

### 7.3 250KB制限への影響

```
現状 (P95: 751 bytes)
+ Phase 11 (~50 KB)
+ Phase 12 (~105 KB)
─────────────────────
合計: ~156 KB

250KB上限に対する使用率: 62%
余裕: 約94KB
```

**判断: 250KB制限内に収まる。追加の軽量化策は不要。**

### 7.4 アーカイブポリシー（Phase 12）

容量制限対策として、以下のアーカイブポリシーを実装：

- **Objective**: 期間終了後90日経過したものをアーカイブ対象
- **アーカイブ時の動作**:
  - アーカイブされた Objective はデフォルト非表示
  - 「過去のOKR」フィルタから表示・復元可能
  - 配下の KeyResult も連動してアーカイブ

---

## 8. 非機能要件

### 8.1 パフォーマンス目標

| 指標 | 目標値 | 備考 |
|------|--------|------|
| ロールアップ処理 | P95 < 100ms | ActionMap更新 → KR → Objective |
| OKRタブ初回表示 | P95 < 1.5秒 | 3カラムレイアウト描画 |
| Dashboard OKRウィジェット | P95 < 800ms | サマリー計算含む |
| KR ↔ ActionMap リンク | P95 < 200ms | 選択 → 保存 |

### 8.2 セキュリティ

**RLS との統合:**
- OKRデータは既存の `workspace_data` テーブルに保存
- 既存のRLSポリシーがそのまま適用（追加設定不要）

**監査ログ:**
- OKR の作成・更新・削除は既存の監査ログ機構に記録
- `audit_logs` テーブルに `action_type: 'okr_create' | 'okr_update' | 'okr_delete'` を追加

---

## 9. 実装スコープの明確化

### 9.1 Phase 12 で実装する機能（Must Have）

- [ ] **OKR CRUD**
  - Objective 作成・編集・削除
  - KeyResult 作成・編集・削除
  - 3カラムレイアウトUI

- [ ] **KR ↔ ActionMap 連携**
  - KR から ActionMap 作成
  - 既存 ActionMap を KR にリンク
  - N:M 関係対応
  - ActionMap 削除時の整合性保証

- [ ] **定性KR（Yes/No型）**（UX強化）
  - 達成トグルUI
  - 進捗計算（0% or 100%）

- [ ] **手動リスクフラグ**（UX強化）
  - フラグ設定UI
  - 理由入力
  - ステータス上書き

- [ ] **OKRテンプレート**（UX強化）
  - 6カテゴリのテンプレート
  - テンプレート選択UI
  - カスタム作成

- [ ] **カスタム期間フィルタ**（UX強化）
  - 日付範囲指定UI
  - フィルタ適用ロジック

- [ ] **構造化された振り返りフォーム**（UX強化）
  - 3セクション構成
  - Markdown対応

- [ ] **ロールアップ処理**
  - Task → ActionItem → ActionMap → KR → Objective
  - debounce 500ms

- [ ] **Dashboard OKRウィジェット**
  - 進捗サマリー表示
  - OKRタブへのリンク

### 9.2 Phase 13 以降に延期する機能（Nice to Have）

- 週次/月次のメールサマリー通知
- 過去OKRの検索・分析機能
- OKRの複製機能
- グローバル検索（OKR/ActionMap/TODO横断）
- 通知センター

---

## 10. リスク・懸念事項

### 10.1 技術的課題

| リスク | 影響度 | 対策 |
|-------|-------|------|
| ロールアップ処理の遅延 | 中 | debounce 500ms + 差分更新 |
| N:M関係の複雑性 | 低 | KR側からのみ参照、逆引きは計算 |
| 容量超過 | 低 | アーカイブ機能で対応（現状余裕あり） |

### 10.2 ユーザー受容性

| 懸念 | 対策 |
|------|------|
| OKRを使ってもらえるか | テンプレート機能で導入ハードルを下げる |
| 入力が面倒 | ActionMap連動で自動計算 |
| 使い方がわからない | オンボーディングツアー（Phase 12-7） |

### 10.3 他フェーズとの依存関係

- **Phase 11 完了が前提**: Action Map / Action Item が実装済み ✅
- **Phase 10 完了が前提**: TODO / Task システムが実装済み ✅
- **Phase 9 完了が前提**: 認証・暗号化基盤が整備済み ✅

---

## 11. 次ステップ（Phase 12-1 に向けて）

Phase 12-0（本設計ドキュメント）の承認後、以下の順で実装を進める：

1. **Phase 12-1**: core 拡張
   - `lib/types/okr.ts` 新規作成
   - `lib/types/app-data.ts` に Objective / KeyResult 追加
   - `lib/core/okr.ts` に CRUD 関数実装

2. **Phase 12-2**: OKR タブ基礎実装
   - `app/_components/okr/OKRTab.tsx` 新規作成
   - 3カラムレイアウト
   - Objective 一覧・詳細表示

3. **Phase 12-3**: Key Result CRUD
   - KR 追加・編集・削除
   - 定性KR（Yes/No型）対応

4. **Phase 12-4**: KR ↔ ActionMap 連携
   - リンク機能
   - 逆引き表示

5. **Phase 12-5**: ロールアップ実装
   - 進捗計算
   - ステータス自動更新

6. **Phase 12-6**: Dashboard 連携 + 振り返り
   - OKRウィジェット
   - 振り返りフォーム

7. **Phase 12-7**: E2E テスト & 回帰確認
   - 全シナリオテスト
   - 既存機能の回帰確認

---

**以上、Phase 12 OKR 設計ドキュメント v1.0**
