# Phase 14.1 ランブック：CSVインポート・エクスポート機能（完全版）

**Version:** 14.1.0
**Status:** 🚧 実装準備完了
**Claude Code 用ランブック**

---

## 0. 概要

### 0.1 目的

このドキュメントは、各タブでどのフィールドをCSVエクスポート・インポートできるかを**完全に可視化**し、AI活用を見据えたCSVベースのデータ連携を実現するための仕様書です。

### 0.2 設計原則

1. **タブ単位の独立性** - 各タブが独自のエクスポート・インポート機能を持つ
2. **AI活用の前提** - CSVは「AIへのコンテキスト提供」の主要手段として位置づけ
3. **双方向性** - エクスポートしたCSVはそのままインポート可能（ラウンドトリップ）
4. **プレースホルダ統一** - テンプレート系はプレースホルダを共通化

### 0.3 必読ドキュメント

- `docs/FDC-GRAND-GUIDE.md`
- `docs/guides/DEVELOPMENT.md`
- `lib/types/app-data.ts` - 全データ型定義

---

## 1. タブ別CSV対応マトリクス

### 1.1 全タブ対応一覧（UI順）

| # | タブ名 | エクスポート | インポート | 優先度 | AI活用 | 備考 |
|:-:|--------|:------------:|:----------:|:------:|:------:|------|
| 1 | **ダッシュボード** | ❌ 不要 | ❌ 不要 | - | - | 集計表示のみ |
| 2 | **MVV** | 🟢 対応 | 🟢 対応 | 🟡 中 | ✅ | Mission/Vision/Value |
| 3 | **OKR** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | Objective + KeyResult |
| 4 | **組織図** | 🟢 対応 | 🟢 対応 | 🟢 低 | - | メンバー+レポートライン |
| 5 | **Action Map** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | ActionMap + ActionItem |
| 6 | **TODO管理** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | 4象限タスク |
| 7 | **見込み客管理** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | Prospects |
| 8 | **顧客管理** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | Clients + 失注案件 |
| 9 | **スクリプト** | 🟢 対応 | 🟢 対応 | 🔴 高 | ✅ | テンプレート4種 |
| 10 | **レポート** | 🟢 対応（既存） | ❌ 不要 | - | - | KPI/メンバー/監査 |
| 11 | **設定** | 🟢 対応 | 🟢 対応 | 🟢 低 | - | プロジェクト設定 |
| 12 | **管理** | ❌ 不要 | ❌ 不要 | - | - | SA専用・システム管理 |

### 1.2 戦略階層別の整理

```
┌─────────────────────────────────────────────────────────────┐
│ 【戦略層】 MVV → OKR                                        │
│   - MVV: 経営理念・長期目標                                 │
│   - OKR: 四半期目標 + 成果指標                              │
├─────────────────────────────────────────────────────────────┤
│ 【戦術層】 Action Map                                       │
│   - ActionMap: 中期計画（KRを達成するための戦術）           │
│   - ActionItem: 具体的なマイルストーン                      │
├─────────────────────────────────────────────────────────────┤
│ 【実行層】 TODO管理                                         │
│   - Task: 日次タスク（4象限）                               │
│   - SubTask: タスクの細分化                                 │
├─────────────────────────────────────────────────────────────┤
│ 【営業層】 見込み客 → 顧客                                  │
│   - Prospects: 見込み客管理                                 │
│   - Clients: 既存顧客管理                                   │
│   - LostDeals: 失注案件分析                                 │
├─────────────────────────────────────────────────────────────┤
│ 【コミュニケーション層】 スクリプト                         │
│   - Templates: メッセンジャー/メール/提案/クロージング      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. タブ別フィールド詳細仕様

> **注記**: UI表示順（タブの並び順）に沿って記載

---

### 2.1 MVVタブ（Mission/Vision/Value）

#### データ型定義
```typescript
interface MVV {
  mission: string;
  vision: string;
  value: string;
}
```

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `type` | - | enum | ✅ | ✅ | ✅ | mission/vision/value |
| `content` | mission/vision/value | string | ✅ | ✅ | ✅ | 内容 |

#### CSVサンプル
```csv
type,content
mission,世界中の起業家に最高の顧客体験を提供する
vision,2030年に日本一の顧客成功プラットフォーム
value,誠実・革新・共創
```

---

### 2.2 OKRタブ（Objectives and Key Results）

#### データ型定義
```typescript
interface Objective {
  id: string;
  title: string;              // 必須
  description?: string;
  scope: 'company' | 'team' | 'individual'; // 必須
  ownerUserId: string;
  periodStart?: string;
  periodEnd?: string;
  progressRate?: number;      // 自動計算
  status?: 'on_track' | 'at_risk' | 'off_track';
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KeyResult {
  id: string;
  objectiveId: string;        // 必須：所属Objective
  title: string;              // 必須
  targetValue?: number;       // 目標値
  currentValue?: number;      // 現在値
  unit?: string;              // 単位
  isQualitative?: boolean;    // 定性KRか
  calcMethod: 'manual' | 'fromActionMaps';
  progressRate?: number;
  linkedActionMapIds?: string[];
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}
```

#### CSVフィールドマッピング（Objective）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `title` | title | string | ✅ | ✅ | ✅ | Objective名 |
| `description` | description | string | - | ✅ | ✅ | 詳細 |
| `scope` | scope | enum | ✅ | ✅ | ✅ | company/team/individual |
| `period_start` | periodStart | ISO8601 | - | ✅ | ✅ | 開始日 |
| `period_end` | periodEnd | ISO8601 | - | ✅ | ✅ | 終了日 |
| `progress_rate` | progressRate | number | - | ✅ | ⚠️ 無視 | 進捗率（自動計算） |
| `status` | status | enum | - | ✅ | ⚠️ 無視 | on_track/at_risk/off_track |
| `is_archived` | isArchived | boolean | - | ✅ | ✅ | アーカイブ済み |

#### CSVフィールドマッピング（KeyResult）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `objective_title` | - | string | ✅ | ✅ | ✅ | 所属Objective名（参照用） |
| `title` | title | string | ✅ | ✅ | ✅ | KR名 |
| `target_value` | targetValue | number | - | ✅ | ✅ | 目標値 |
| `current_value` | currentValue | number | - | ✅ | ✅ | 現在値 |
| `unit` | unit | string | - | ✅ | ✅ | 単位（件、%、円など） |
| `is_qualitative` | isQualitative | boolean | - | ✅ | ✅ | 定性KRフラグ |
| `calc_method` | calcMethod | enum | ✅ | ✅ | ✅ | manual/fromActionMaps |
| `progress_rate` | progressRate | number | - | ✅ | ⚠️ 無視 | 進捗率（自動計算） |

#### CSVサンプル（Objective）
```csv
title,description,scope,period_start,period_end,is_archived
Q1売上目標達成,第1四半期で売上1000万円を達成,company,2025-01-01,2025-03-31,false
個人スキルアップ,営業スキルを向上させる,individual,2025-01-01,2025-03-31,false
```

#### CSVサンプル（KeyResult）
```csv
objective_title,title,target_value,current_value,unit,is_qualitative,calc_method
Q1売上目標達成,新規商談数,50,12,件,false,manual
Q1売上目標達成,成約率,30,22,%,false,manual
個人スキルアップ,営業研修修了,,,件,true,manual
```

---

### 2.3 組織図タブ（Org Chart）

#### データ構造
ワークスペースメンバー + レポートライン情報

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `user_id` | userId | string | ✅ | ✅ | ⚠️ 参照 | ユーザーID |
| `name` | name | string | - | ✅ | - | 表示名 |
| `email` | email | string | - | ✅ | - | メールアドレス |
| `role` | role | enum | - | ✅ | ✅ | OWNER/ADMIN/MEMBER |
| `reports_to_email` | reportsTo | string | - | ✅ | ✅ | 上司のメールアドレス |

#### CSVサンプル
```csv
user_id,name,email,role,reports_to_email
user_001,田中太郎,tanaka@example.com,OWNER,
user_002,佐藤花子,sato@example.com,ADMIN,tanaka@example.com
user_003,鈴木一郎,suzuki@example.com,MEMBER,sato@example.com
```

---

### 2.4 Action Mapタブ

#### データ型定義
```typescript
interface ActionMap {
  id: string;
  title: string;              // 必須
  description?: string;
  ownerUserId: string;        // 作成者
  targetPeriodStart?: string; // 開始日
  targetPeriodEnd?: string;   // 終了日
  progressRate?: number;      // 進捗率（自動計算）
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActionItem {
  id: string;
  actionMapId: string;        // 必須：所属AM
  parentItemId?: string;      // 親アイテム（ツリー構造）
  title: string;              // 必須
  description?: string;
  assigneeUserId: string;     // 担当者
  dueDate?: string;           // 期限
  priority?: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'blocked' | 'done';
  linkedTaskIds?: string[];   // 連携タスク
  progressRate?: number;
  createdAt: string;
  updatedAt: string;
}
```

#### CSVフィールドマッピング（ActionMap）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `title` | title | string | ✅ | ✅ | ✅ | ActionMap名 |
| `description` | description | string | - | ✅ | ✅ | 詳細説明 |
| `period_start` | targetPeriodStart | ISO8601 | - | ✅ | ✅ | 開始日 |
| `period_end` | targetPeriodEnd | ISO8601 | - | ✅ | ✅ | 終了日 |
| `progress_rate` | progressRate | number | - | ✅ | ⚠️ 無視 | 進捗率（自動計算） |
| `is_archived` | isArchived | boolean | - | ✅ | ✅ | アーカイブ済み |

#### CSVフィールドマッピング（ActionItem）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `action_map_title` | - | string | ✅ | ✅ | ✅ | 所属ActionMap名（参照用） |
| `parent_title` | - | string | - | ✅ | ✅ | 親アイテム名（ツリー構造） |
| `title` | title | string | ✅ | ✅ | ✅ | アイテム名 |
| `description` | description | string | - | ✅ | ✅ | 詳細説明 |
| `due_date` | dueDate | ISO8601 | - | ✅ | ✅ | 期限 |
| `priority` | priority | enum | - | ✅ | ✅ | low/medium/high |
| `status` | status | enum | ✅ | ✅ | ✅ | not_started/in_progress/blocked/done |
| `progress_rate` | progressRate | number | - | ✅ | ⚠️ 無視 | 進捗率（自動計算） |

#### ステータス値対応表（ActionItem）
| 日本語表示 | CSV値 | 説明 |
|-----------|-------|------|
| 未着手 | `not_started` | 初期状態 |
| 進行中 | `in_progress` | 作業中 |
| ブロック | `blocked` | 障害発生 |
| 完了 | `done` | 完了済み |

#### 優先度値対応表
| 日本語表示 | CSV値 |
|-----------|-------|
| 低 | `low` |
| 中 | `medium` |
| 高 | `high` |

#### CSVサンプル（ActionMap）
```csv
title,description,period_start,period_end,is_archived
Q1新規開拓プラン,新規顧客10社獲得のための施策,2025-01-01,2025-03-31,false
```

#### CSVサンプル（ActionItem）
```csv
action_map_title,parent_title,title,description,due_date,priority,status
Q1新規開拓プラン,,テレアポリスト作成,IT業界50社のリスト,2025-01-15,high,done
Q1新規開拓プラン,テレアポリスト作成,業界リサーチ,IT業界のトレンド調査,2025-01-10,medium,done
Q1新規開拓プラン,,週次テレアポ,毎週30件のテレアポ実施,2025-03-31,high,in_progress
```

---

### 2.5 TODO管理タブ（4象限タスク）

#### データ型定義
```typescript
interface Task {
  id: string;
  title: string;          // 必須
  description?: string;
  suit?: Suit;            // 4象限（undefined = ジョーカー）
  startAt?: string;       // 開始時刻 "09:00"
  durationMinutes?: number; // 所要時間
  isElasticHabit?: boolean; // 習慣タスク
  elasticLevel?: ElasticLevel; // 松竹梅
  streakCount?: number;   // 連続達成日数
  status: TaskStatus;     // 必須
  subTasks?: SubTask[];
  updatedAt: number;
  createdAt: number;
}

type Suit = 'spade' | 'heart' | 'diamond' | 'club';
type TaskStatus = 'not_started' | 'in_progress' | 'done';
type ElasticLevel = 'ume' | 'take' | 'matsu';
```

#### 4象限（Suit）の意味

| スート | 記号 | 日本語名 | 意味 | 色 |
|--------|------|---------|------|-----|
| spade | ♠ | すぐやる | 緊急かつ重要 | 黒 |
| heart | ♥ | 予定に入れ実行 | 重要（習慣化対象） | 赤 |
| diamond | ♦ | 任せる＆自動化 | 緊急なだけ | 黄 |
| club | ♣ | 未来創造20%タイム | 長期投資 | 青 |
| (未設定) | 🃏 | ジョーカー | 分類待ち | グレー |

#### Elastic Habits（松竹梅）

| レベル | CSV値 | 説明 |
|--------|-------|------|
| 梅 | `ume` | 最小限（5分） |
| 竹 | `take` | 標準（15分） |
| 松 | `matsu` | フル（30分以上） |

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `title` | title | string | ✅ | ✅ | ✅ | タスク名 |
| `description` | description | string | - | ✅ | ✅ | 詳細説明 |
| `suit` | suit | enum | - | ✅ | ✅ | spade/heart/diamond/club |
| `status` | status | enum | ✅ | ✅ | ✅ | not_started/in_progress/done |
| `start_at` | startAt | string | - | ✅ | ✅ | 開始時刻（HH:MM形式） |
| `duration_minutes` | durationMinutes | number | - | ✅ | ✅ | 所要時間（分） |
| `is_habit` | isElasticHabit | boolean | - | ✅ | ✅ | 習慣タスクフラグ |
| `elastic_level` | elasticLevel | enum | - | ✅ | ✅ | ume/take/matsu |
| `streak_count` | streakCount | number | - | ✅ | ⚠️ 無視 | 連続達成日数 |
| `sub_tasks` | subTasks | JSON | - | ✅ | ✅ | サブタスク配列 |

#### CSVサンプル
```csv
title,description,suit,status,start_at,duration_minutes,is_habit,elastic_level,sub_tasks
企画書作成,Q1売上計画の企画書,spade,in_progress,09:00,120,false,,"[{""title"":""目次作成"",""completed"":true},{""title"":""本文執筆"",""completed"":false}]"
朝の瞑想,マインドフルネス,heart,not_started,06:00,15,true,ume,
週次レビュー,先週の振り返りと今週の計画,heart,not_started,09:00,60,true,take,
英語学習,Duolingo 5レッスン,club,not_started,21:00,30,true,matsu,
```

---

### 2.6 見込み客管理タブ（Prospects）

#### データ型定義
```typescript
interface Prospect {
  id: number | string;
  name: string;           // 必須
  company?: string;
  contact?: string;       // メール or 電話
  status: FunnelStatus;   // 必須
  channel?: Channel;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  notes?: string;
  history?: HistoryEntry[];
}

type FunnelStatus = 'uncontacted' | 'responded' | 'negotiating' | 'won' | 'lost';
type Channel = 'real' | 'hp' | 'mail' | 'messenger' | 'x' | 'phone' | 'webapp';
```

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `name` | name | string | ✅ | ✅ | ✅ | 名前 |
| `company` | company | string | - | ✅ | ✅ | 会社名 |
| `contact` | contact | string | - | ✅ | ✅ | メール/電話 |
| `status` | status | enum | ✅ | ✅ | ✅ | ファネルステータス |
| `channel` | channel | enum | - | ✅ | ✅ | 流入チャネル |
| `memo` | memo | string | - | ✅ | ✅ | メモ |
| `tags` | tags | string | - | ✅ | ✅ | タグ（カンマ区切り） |
| `created_at` | createdAt | ISO8601 | - | ✅ | ⚠️ 無視 | 作成日時 |

#### ステータス値対応表（Prospect）
| 日本語表示 | CSV値 | 説明 |
|-----------|-------|------|
| 未接触 | `uncontacted` | 初期状態 |
| 反応あり | `responded` | リアクション獲得 |
| 商談中 | `negotiating` | 商談進行中 |
| 成約 | `won` | 成約済み |
| 失注 | `lost` | 失注 |

#### チャネル値対応表（共通）
| 日本語表示 | CSV値 |
|-----------|-------|
| リアル | `real` |
| HP | `hp` |
| メルマガ | `mail` |
| メッセンジャー | `messenger` |
| X（Twitter） | `x` |
| 電話・SMS | `phone` |
| Webアプリ | `webapp` |

#### CSVサンプル
```csv
name,company,contact,status,channel,memo,tags
田中太郎,株式会社ABC,tanaka@abc.co.jp,responded,hp,初回面談済み,IT・決裁者
佐藤花子,XYZ商事,03-1234-5678,negotiating,real,次回12/1訪問,経営者
```

---

### 2.7 顧客管理タブ（Clients + LostDeals）

#### 2.7.1 既存客（Clients）

#### データ型定義
```typescript
interface Client {
  id: number | string;
  name: string;           // 必須
  company?: string;
  contact?: string;
  status: ClientStatus;   // 必須
  channel?: Channel;
  memo?: string;
  contractDeadline?: string | null;
  contractDate?: string;
  nextMeeting?: string | null;
  tags?: string[];
  notes?: string;
  history?: HistoryEntry[];
  createdAt?: string;
  convertedAt?: string;
}

type ClientStatus = 'client' | 'contract_expired';
```

#### CSVフィールドマッピング（Client）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | string | - | ✅ | ⚠️ 無視 | システム生成 |
| `name` | name | string | ✅ | ✅ | ✅ | 顧客名 |
| `company` | company | string | - | ✅ | ✅ | 会社名 |
| `contact` | contact | string | - | ✅ | ✅ | 連絡先 |
| `status` | status | enum | ✅ | ✅ | ✅ | client/contract_expired |
| `channel` | channel | enum | - | ✅ | ✅ | 流入チャネル |
| `contract_date` | contractDate | ISO8601 | - | ✅ | ✅ | 契約日 |
| `contract_deadline` | contractDeadline | ISO8601 | - | ✅ | ✅ | 契約期限 |
| `next_meeting` | nextMeeting | ISO8601 | - | ✅ | ✅ | 次回ミーティング |
| `memo` | memo | string | - | ✅ | ✅ | メモ |
| `tags` | tags | string | - | ✅ | ✅ | タグ（カンマ区切り） |
| `converted_at` | convertedAt | ISO8601 | - | ✅ | ⚠️ 無視 | 成約日 |

#### ステータス値対応表（Client）
| 日本語表示 | CSV値 | 説明 |
|-----------|-------|------|
| 既存客 | `client` | 契約中 |
| 契約終了 | `contract_expired` | 契約終了済み |

#### CSVサンプル（Client）
```csv
name,company,contact,status,channel,contract_date,contract_deadline,next_meeting,memo,tags
山田一郎,株式会社DEF,yamada@def.co.jp,client,hp,2024-06-01,2025-05-31,2025-01-20,月額プラン,優良顧客・長期
```

#### 2.7.2 失注案件（LostDeals）

#### データ型定義
```typescript
interface LostDeal {
  id: number;
  name: string;           // 必須
  company: string;        // 必須
  reason: string;         // 失注理由（必須）
  lostDate: string;       // 失注日（必須）
}
```

#### CSVフィールドマッピング（LostDeal）

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | number | - | ✅ | ⚠️ 無視 | システム生成 |
| `name` | name | string | ✅ | ✅ | ✅ | 担当者名 |
| `company` | company | string | ✅ | ✅ | ✅ | 会社名 |
| `reason` | reason | string | ✅ | ✅ | ✅ | 失注理由 |
| `lost_date` | lostDate | ISO8601 | ✅ | ✅ | ✅ | 失注日 |

#### CSVサンプル（LostDeal）
```csv
name,company,reason,lost_date
鈴木次郎,GHI工業,予算不足,2025-01-10
高橋三郎,JKL商事,競合採用,2025-01-08
伊藤四郎,MNO物産,タイミング,2025-01-05
```

---

### 2.8 スクリプトタブ（Templates）

> 4種類のテンプレート（メッセンジャー、メール、提案資料、クロージング）を管理

#### データ型定義
```typescript
interface Template {
  id: number;
  name: string;           // テンプレート名（必須）
  emotionPattern?: string; // 感動パターン
  subject: string;        // 件名（メールのみ）
  body: string;           // 本文（必須）
  notes?: string;         // 使用シーン・メモ
  type?: string;          // テンプレートタイプ
  createdAt?: string;
  updatedAt?: string;
}

// テンプレートタイプ
type TemplateType = 'messenger' | 'email' | 'proposal' | 'closing';
```

#### テンプレートタイプ一覧
| タイプ | CSV値 | 説明 |
|--------|-------|------|
| メッセンジャー | `messenger` | SNS/チャット用 |
| メール | `email` | 正式メール用（件名あり） |
| 提案資料 | `proposal` | プレゼン・資料用 |
| クロージング | `closing` | 成約促進用トーク |

#### プレースホルダ一覧（本文・件名で使用可能）

| プレースホルダ | 説明 | 使用例 |
|--------------|------|--------|
| `{name}` | 相手の名前 | `{name}様` |
| `{company}` | 会社名 | `{company}のご担当者様` |
| `{emotion_pattern}` | 感動パターン名 | 自動挿入 |
| `{user_name}` | あなたの名前 | `担当：{user_name}` |
| `{project_name}` | プロジェクト名 | `{project_name}のご案内` |
| `{today}` | 今日の日付 | `{today}時点で` |
| `{deadline}` | 期限日 | `{deadline}までに` |

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `id` | id | number | - | ✅ | ⚠️ 無視 | システム生成 |
| `type` | type | enum | ✅ | ✅ | ✅ | messenger/email/proposal/closing |
| `name` | name | string | ✅ | ✅ | ✅ | テンプレート名 |
| `emotion_pattern` | emotionPattern | string | - | ✅ | ✅ | 感動パターン |
| `subject` | subject | string | - | ✅ | ✅ | 件名（メールのみ） |
| `body` | body | string | ✅ | ✅ | ✅ | 本文 |
| `notes` | notes | string | - | ✅ | ✅ | 使用シーン・メモ |

#### CSVサンプル
```csv
type,name,emotion_pattern,subject,body,notes
email,初回アプローチ,共感型,{name}様へのご提案,"{name}様

お世話になっております。{user_name}です。

{company}様のお取り組みに関して、ぜひお話しさせていただきたく...",HP問い合わせ後のフォロー用
messenger,カジュアル面談依頼,挑戦型,,{name}さん、こんにちは！{project_name}の{user_name}です。,Facebook経由
proposal,サービス概要,感動型,,# {project_name}のご紹介...,初回提案用
closing,価格交渉対応,共感型,,ご予算のご事情、よく分かります...,予算交渉時
```

---

### 2.9 レポートタブ（既存機能）

> 既存のエクスポート機能が実装済み（インポート不要）

#### エクスポート種別

| 種別 | エンドポイント | 説明 |
|------|--------------|------|
| KPIサマリ | `/api/reports/export?type=kpi` | 見込み客数、既存客数、タスク数 |
| メンバー一覧 | `/api/reports/export?type=members` | 見込み客の一覧 |
| 監査ログ | `/api/reports/export?type=audit` | 操作履歴 |

---

### 2.10 設定タブ（Settings）

#### データ型定義
```typescript
interface Settings {
  projectName: string;
  userName: string;
  clientInfo?: SettingsSection;
  strategy?: SettingsSection;
  revenue?: SettingsSection;
  leanCanvas?: SettingsSection;
  customerJourney?: SettingsSection;
  kpi?: SettingsSection;
  roadmap?: SettingsSection;
  design?: SettingsSection;
}
```

#### CSVフィールドマッピング

| CSVカラム名 | DBフィールド | 型 | 必須 | エクスポート | インポート | 説明 |
|------------|-------------|-----|:----:|:------------:|:----------:|------|
| `key` | - | string | ✅ | ✅ | ✅ | 設定キー |
| `value` | - | string | ✅ | ✅ | ✅ | 設定値 |

#### CSVサンプル
```csv
key,value
projectName,FoundersDirect
userName,田中太郎
```

---

## 3. 外部AI活用ワークフロー（Phase 14.1: API不使用版）

### 3.1 基本コンセプト

> **Phase 14.1では、FoundersDirect内でのAI API呼び出しは行わず、ユーザーが外部AI（GPT/Claude）を使ってCSVを生成し、インポートする方式を採用**

```
┌─────────────────────────────────────────────────────────────┐
│    外部AI × CSV 手動ワークフロー（Phase 14.1）              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ テンプレート  │    │  プロンプト   │    │ 外部AI      │  │
│  │ CSVダウン    │ OR │  コピペ      │ → │ GPT/Claude  │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │          │
│         └───────────────────┴───────────────────┘          │
│                             │                              │
│                             ↓                              │
│                   ┌──────────────────┐                     │
│                   │  完成CSV保存     │                     │
│                   │  （UTF-8/.csv）  │                     │
│                   └────────┬─────────┘                     │
│                            │                               │
│                            ↓                               │
│                   ┌──────────────────┐                     │
│                   │  FDCにインポート │                     │
│                   └──────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 リソースファイル

| ファイル | 場所 | 説明 |
|---------|------|------|
| **CSVテンプレート** | `docs/csv-templates/*.csv` | 空のCSVテンプレート12種 |
| **AI用プロンプト集** | `docs/csv-templates/AI-PROMPTS.md` | コピペで使えるプロンプト |
| **README** | `docs/csv-templates/README.md` | 各CSVの詳細説明 |

### 3.3 利用パターン

```
【パターン1】ゼロから生成
  1. AI-PROMPTS.md から該当プロンプトをコピー
  2. 【】内を自分のビジネス情報に置換
  3. GPT/Claudeに貼り付け → CSV出力
  4. FDCにインポート

【パターン2】テンプレート活用
  1. csv-templates/ からテンプレートをダウンロード
  2. AIに「このCSVを埋めて」と依頼
  3. 出力されたCSVを保存
  4. FDCにインポート

【パターン3】既存データ分析
  1. FDCからデータをエクスポート
  2. AIに分析・改善提案を依頼
  3. 新規CSV or 改善版CSVを生成
  4. FDCにインポート
```

### 3.4 CSVテンプレート一覧

| # | ファイル | タブ | 説明 |
|:-:|----------|------|------|
| 01 | `01_mvv.csv` | MVV | Mission/Vision/Value |
| 02 | `02_okr_objectives.csv` | OKR | 目標（Objective） |
| 03 | `03_okr_keyresults.csv` | OKR | 成果指標（KeyResult） |
| 04 | `04_actionmap.csv` | Action Map | 施策マップ |
| 05 | `05_actionitems.csv` | Action Map | 具体的タスク |
| 06 | `06_tasks.csv` | TODO管理 | 日次タスク（4象限） |
| 07 | `07_prospects.csv` | 見込み客管理 | 見込み客リスト |
| 08 | `08_clients.csv` | 顧客管理 | 既存顧客リスト |
| 09 | `09_lost_deals.csv` | 顧客管理 | 失注案件 |
| 10 | `10_templates_scripts.csv` | スクリプト | 営業テンプレート |
| 11 | `11_lean_canvas.csv` | 設定 | リーンキャンバス |
| 12 | `12_customer_journey.csv` | 設定 | カスタマージャーニー |

### 3.5 プロンプト集（詳細は `AI-PROMPTS.md` 参照）

---

#### 3.5.1 MVV生成プロンプト

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のCSVフォーマットでMVV（Mission/Vision/Value）を作成してください。

【私のビジネス概要】
- 事業内容: [ここに入力]
- ターゲット顧客: [ここに入力]
- 提供する価値: [ここに入力]
- 競合との違い: [ここに入力]

【出力形式】
type,content
mission,[ここにMissionを出力]
vision,[ここにVisionを出力]
value,[ここにValueを出力]

【出力ルール】
- mission: 「誰に何を提供するか」を1文で（50字以内）
- vision: 「3-5年後のありたい姿」を具体的に（100字以内）
- value: 大切にする価値観を3つ、「・」区切りで
```

**AI出力例:**
```csv
type,content
mission,中小企業の営業チームに、顧客との関係を深めるCRMを提供する
vision,2028年に国内中小企業CRM市場でシェアNo.1を獲得し、10万社の営業改革を支援する
value,顧客第一・データドリブン・チームワーク
```

---

#### 3.5.2 OKR生成プロンプト

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のCSVフォーマットでQ1のOKRを作成してください。

【現状】
- 事業フェーズ: [シード/アーリー/グロース]
- 直近の課題: [ここに入力]
- 今期の最重要テーマ: [ここに入力]
- チーム人数: [ここに入力]

【Objective出力形式】
title,description,scope,period_start,period_end,is_archived
[Objective名],[詳細説明],company,2025-01-01,2025-03-31,false

【KeyResult出力形式】
objective_title,title,target_value,current_value,unit,is_qualitative,calc_method
[所属するObjective名],[KR名],[目標値],[現在値],[単位],false,manual

【出力ルール】
- Objectiveは2-3個（会社レベル1つ + 個人/チームレベル1-2つ）
- 各Objectiveに2-3個のKRを紐付け
- KRは定量的で測定可能なものに
- scope: company（会社）/ team（チーム）/ individual（個人）
```

**AI出力例（Objective）:**
```csv
title,description,scope,period_start,period_end,is_archived
Q1売上基盤の確立,初期顧客10社を獲得し、PMFを検証する,company,2025-01-01,2025-03-31,false
営業プロセスの型化,再現性のある営業フローを構築する,team,2025-01-01,2025-03-31,false
```

**AI出力例（KeyResult）:**
```csv
objective_title,title,target_value,current_value,unit,is_qualitative,calc_method
Q1売上基盤の確立,有料契約社数,10,0,社,false,manual
Q1売上基盤の確立,MRR（月次売上）,500000,0,円,false,manual
Q1売上基盤の確立,解約率,5,0,%,false,manual
営業プロセスの型化,商談→契約の転換率,30,0,%,false,manual
営業プロセスの型化,営業マニュアル完成,,,件,true,manual
```

---

#### 3.2.3 リーンキャンバス生成プロンプト

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のCSVフォーマットでリーンキャンバスを作成してください。

【私のビジネスアイデア】
[ここに自由に記述 - 何を誰に提供したいか]

【出力形式】
section,content
customer_segment,[顧客セグメント]
problem,[課題（3つ箇条書き）]
unique_value,[独自の価値提案]
solution,[ソリューション（3つ箇条書き）]
channels,[チャネル]
revenue_streams,[収益の流れ]
cost_structure,[コスト構造]
key_metrics,[主要指標]
unfair_advantage,[圧倒的な優位性]

【出力ルール】
- 各項目は簡潔に（各100字以内）
- 箇条書きの場合は「・」で区切る
- 具体的な数字や固有名詞を含めて現実的に
```

**AI出力例:**
```csv
section,content
customer_segment,従業員10-50名の成長期スタートアップの営業責任者
problem,・顧客情報が属人化している・フォロー漏れが頻発・営業活動の可視化ができていない
unique_value,5分で導入、直感的UIで営業チーム全員が使えるCRM
solution,・ワンクリック顧客登録・自動フォローリマインド・ダッシュボードで進捗可視化
channels,・オウンドメディア・ウェビナー・紹介プログラム
revenue_streams,月額サブスクリプション（1ユーザー3,000円）
cost_structure,・開発人件費・インフラ費用・マーケティング費
key_metrics,・MRR・アクティブユーザー率・NPS
unfair_advantage,創業者の10年のCRM開発経験と100社の導入ノウハウ
```

---

#### 3.2.4 カスタマージャーニー生成プロンプト

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のCSVフォーマットでカスタマージャーニーを作成してください。

【サービス概要】
- サービス名: [ここに入力]
- ターゲット顧客: [ここに入力]
- 提供価値: [ここに入力]

【出力形式】
phase,psychology,touchpoint,content,emotion,prompt
[フェーズ名],[顧客心理],[タッチポイント],[提供コンテンツ],[感情レベル1-5],[次アクションを促すメッセージ]

【フェーズ（必須6段階）】
1. 認知（Awareness）
2. 興味（Interest）
3. 検討（Consideration）
4. 購入（Purchase）
5. 利用（Usage）
6. 推奨（Advocacy）

【出力ルール】
- 各フェーズごとに1行
- emotion: 1（不安）〜 5（感動）の数値
- 具体的なタッチポイントとコンテンツを記載
```

**AI出力例:**
```csv
phase,psychology,touchpoint,content,emotion,prompt
認知,営業管理に課題を感じているが解決策を知らない,Google検索・SNS広告,課題解決ブログ記事・事例紹介動画,2,まずは無料で資料をダウンロード
興味,この製品で解決できるかもしれない,LP・ウェビナー,機能紹介・導入効果シミュレーター,3,無料トライアルで体験してみませんか
検討,他社と比較して決めたい,比較ページ・無料相談,競合比較表・ROI計算ツール,3,専門スタッフが最適プランをご提案します
購入,これで決めよう,申込フォーム・契約,スムーズな契約フロー・初期設定サポート,4,導入後すぐに使えるよう全力サポート
利用,使いこなして成果を出したい,アプリ内・サポート,チュートリアル・活用Tips・カスタマーサクセス,4,次のステップで更なる効果を
推奨,他の人にも勧めたい,レビューサイト・紹介プログラム,紹介特典・事例インタビュー依頼,5,あなたの成功体験を共有しませんか
```

---

#### 3.2.5 Action Map生成プロンプト（OKRから自動生成）

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のOKR（KeyResult）を達成するためのAction Mapを作成してください。

【現在のOKR】
```csv
objective_title,kr_title,target_value,current_value,unit,deadline
Q1売上基盤の確立,有料契約社数,10,2,社,2025-03-31
```

【出力形式 - ActionMap】
title,description,period_start,period_end,is_archived
[ActionMap名],[説明],2025-01-01,2025-03-31,false

【出力形式 - ActionItem】
action_map_title,parent_title,title,description,due_date,priority,status
[所属ActionMap名],[親アイテム名（なければ空）],[アイテム名],[説明],[期限],high/medium/low,not_started

【出力ルール】
- ActionMapは1つのKRに対して1つ作成
- ActionItemは5-10個程度、具体的なタスクに分解
- 階層構造を活用（親→子の関係）
- 優先度: high（重要&緊急）/ medium（重要）/ low（そうでもない）
```

---

#### 3.2.6 スクリプト（テンプレート）生成プロンプト

**ユーザーがAIに渡すプロンプト例:**

```markdown
以下のCSVフォーマットで営業スクリプトテンプレートを作成してください。

【ビジネス概要】
- サービス名: [ここに入力]
- ターゲット: [ここに入力]
- 主な価値: [ここに入力]

【作成してほしいテンプレート】
- 初回アプローチメール
- フォローアップメッセンジャー
- 提案資料の導入部分
- クロージングトーク

【出力形式】
type,name,emotion_pattern,subject,body,notes
[messenger/email/proposal/closing],[テンプレート名],[感動パターン],[件名（メールのみ）],[本文],[使用シーン]

【プレースホルダ（本文で使用可能）】
- {name}: 相手の名前
- {company}: 会社名
- {user_name}: 自分の名前
- {project_name}: プロジェクト名

【出力ルール】
- 各typeで1-2個ずつ作成
- bodyは実際に使える完成度で
- プレースホルダを効果的に活用
- emotion_pattern: 共感型/挑戦型/感動型/論理型 から選択
```

---

### 3.3 既存データ活用プロンプト

#### 3.3.1 見込み客分析→タスク生成

```markdown
以下の見込み客リストを分析し、優先度の高い順にフォロータスクを生成してください。

【見込み客リスト】
```csv
name,company,status,channel,memo,created_at
[エクスポートしたCSVを貼り付け]
```

【出力形式 - タスクCSV】
title,description,suit,status,due_date
[タスク名],[詳細],[spade/heart/diamond/club],not_started,[期限]

【出力ルール】
- statusがresponded/negotiatingの顧客を優先
- 長期間放置されている顧客をピックアップ
- suitの判定基準:
  - spade: 商談中で期限が近い（緊急&重要）
  - heart: 関係構築が必要（重要）
  - diamond: 定型フォロー（緊急のみ）
  - club: 長期育成（将来投資）
```

#### 3.3.2 失注分析→改善提案

```markdown
以下の失注案件を分析し、パターンと改善策を提案してください。

【失注案件リスト】
```csv
name,company,reason,lost_date
[エクスポートしたCSVを貼り付け]
```

【分析してほしいこと】
1. 失注理由のパターン分類
2. 各パターンの対策案
3. 営業プロセスの改善ポイント

【出力形式】
分析結果はテキストで、対策タスクは以下のCSV形式で:
title,description,suit,status
[タスク名],[詳細],[象限],not_started
```

---

### 3.4 AI活用のベストプラクティス

| シーン | 推奨パターン | プロンプトのポイント |
|--------|------------|-------------------|
| ゼロからの戦略立案 | MVV → OKR → ActionMap の順で生成 | ビジネス概要を最初に詳しく伝える |
| 既存データの整理 | エクスポート → 分析依頼 | 具体的な分析軸を指定する |
| 定型業務の効率化 | テンプレート生成 | プレースホルダの使い方を明示 |
| 振り返り・改善 | 失注/進捗データ → 分析 | 期間を区切って依頼する |

### 3.5 CSV出力時の注意事項

```
【AIへの追加指示（必要に応じて）】

- CSVはヘッダー行 + データ行の形式で出力してください
- 文字列にカンマが含まれる場合は「"」で囲んでください
- 日付はYYYY-MM-DD形式で出力してください
- 空の値は空文字（カンマだけ）で出力してください
- 改行が必要な場合は「\n」を使ってください
```

---

## 4. 実装ワークストリーム

### 4.1 WS-CSV-CORE: 共通基盤

```
WS-CSV-CORE-1: CSVパーサー基盤
              lib/core/csv-parser.ts
              - Papa Parse 使用
              - 文字コード自動検出（UTF-8, Shift_JIS）
              - BOM対応
              - ヘッダー検証

WS-CSV-CORE-2: CSVジェネレーター基盤
              lib/core/csv-generator.ts
              - 共通エクスポート関数
              - BOM付きUTF-8出力
              - ファイル名生成

WS-CSV-CORE-3: バリデーション基盤
              lib/core/csv-validator.ts
              - 必須フィールドチェック
              - 型変換（日付、数値、boolean）
              - enum値検証
              - エラー行レポート
```

### 4.2 WS-CSV-EXPORT: エクスポート機能

```
WS-CSV-EXPORT-1: 見込み客エクスポート
                app/api/export/prospects/route.ts
                GET /api/export/prospects?format=csv

WS-CSV-EXPORT-2: 既存客エクスポート
                app/api/export/clients/route.ts
                GET /api/export/clients?format=csv

WS-CSV-EXPORT-3: テンプレートエクスポート
                app/api/export/templates/route.ts
                GET /api/export/templates?type=all&format=csv

WS-CSV-EXPORT-4: タスクエクスポート
                app/api/export/tasks/route.ts
                GET /api/export/tasks?format=csv

WS-CSV-EXPORT-5: Action Mapエクスポート
                app/api/export/action-maps/route.ts
                GET /api/export/action-maps?format=csv

WS-CSV-EXPORT-6: OKRエクスポート
                app/api/export/okr/route.ts
                GET /api/export/okr?format=csv

WS-CSV-EXPORT-7: 失注案件エクスポート
                app/api/export/lost-deals/route.ts
                GET /api/export/lost-deals?format=csv

WS-CSV-EXPORT-8: MVV/Brand/Canvasエクスポート
                app/api/export/strategy/route.ts
                GET /api/export/strategy?type=mvv&format=csv
```

### 4.3 WS-CSV-IMPORT: インポート機能

```
WS-CSV-IMPORT-1: 見込み客インポート
                app/api/import/prospects/route.ts
                POST /api/import/prospects

WS-CSV-IMPORT-2: 既存客インポート
                app/api/import/clients/route.ts
                POST /api/import/clients

WS-CSV-IMPORT-3: テンプレートインポート
                app/api/import/templates/route.ts
                POST /api/import/templates

WS-CSV-IMPORT-4: タスクインポート
                app/api/import/tasks/route.ts
                POST /api/import/tasks

WS-CSV-IMPORT-5: Action Mapインポート
                app/api/import/action-maps/route.ts
                POST /api/import/action-maps

WS-CSV-IMPORT-6: OKRインポート
                app/api/import/okr/route.ts
                POST /api/import/okr

WS-CSV-IMPORT-7: 失注案件インポート
                app/api/import/lost-deals/route.ts
                POST /api/import/lost-deals
```

### 4.4 WS-CSV-UI: UI実装

```
WS-CSV-UI-1: エクスポートボタン共通コンポーネント
            app/_components/common/ExportButton.tsx
            - ドロップダウンでフォーマット選択
            - ローディング表示
            - エラーハンドリング

WS-CSV-UI-2: インポートモーダル共通コンポーネント
            app/_components/common/ImportModal.tsx
            - ファイルドロップゾーン
            - プレビューテーブル
            - 検証エラー表示
            - マッピング確認

WS-CSV-UI-3: 各タブへの組み込み
            - ProspectsManagement.tsx
            - ClientsManagement.tsx
            - TemplatesTab.tsx
            - TaskBoardTab.tsx
            - ActionMapTab.tsx
            - OKRTab.tsx
            - LostDealsTab.tsx
```

---

## 5. APIエンドポイント一覧

### 5.1 エクスポートAPI

| エンドポイント | メソッド | クエリパラメータ | 説明 |
|--------------|---------|-----------------|------|
| `/api/export/prospects` | GET | `format=csv` | 見込み客 |
| `/api/export/clients` | GET | `format=csv` | 既存客 |
| `/api/export/templates` | GET | `type=all\|messenger\|email&format=csv` | テンプレート |
| `/api/export/tasks` | GET | `suit=all\|spade\|heart&format=csv` | タスク |
| `/api/export/action-maps` | GET | `include_items=true&format=csv` | Action Map |
| `/api/export/okr` | GET | `scope=all\|company\|team&format=csv` | OKR |
| `/api/export/lost-deals` | GET | `format=csv` | 失注案件 |
| `/api/export/strategy` | GET | `type=mvv\|brand\|canvas&format=csv` | 戦略情報 |

### 5.2 インポートAPI

| エンドポイント | メソッド | Body | 説明 |
|--------------|---------|------|------|
| `/api/import/prospects` | POST | `multipart/form-data` | 見込み客 |
| `/api/import/clients` | POST | `multipart/form-data` | 既存客 |
| `/api/import/templates` | POST | `multipart/form-data` | テンプレート |
| `/api/import/tasks` | POST | `multipart/form-data` | タスク |
| `/api/import/action-maps` | POST | `multipart/form-data` | Action Map |
| `/api/import/okr` | POST | `multipart/form-data` | OKR |
| `/api/import/lost-deals` | POST | `multipart/form-data` | 失注案件 |

### 5.3 テンプレートAPI

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/templates/csv/[entity]` | GET | CSVテンプレートダウンロード |

---

## 6. 型定義

```typescript
// lib/types/csv.ts

/**
 * CSVインポート結果
 */
export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: CSVImportError[];
  warnings: CSVImportWarning[];
}

/**
 * CSVインポートエラー
 */
export interface CSVImportError {
  row: number;
  column: string;
  message: string;
  value: string;
}

/**
 * CSVインポート警告
 */
export interface CSVImportWarning {
  row: number;
  column: string;
  message: string;
  originalValue: string;
  convertedValue: string;
}

/**
 * CSVバリデーション結果
 */
export interface CSVValidationResult {
  valid: boolean;
  errors: CSVImportError[];
  warnings: CSVImportWarning[];
  preview: Record<string, unknown>[];
  mapping: CSVFieldMapping[];
}

/**
 * CSVフィールドマッピング
 */
export interface CSVFieldMapping {
  csvColumn: string;
  dbField: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';
  required: boolean;
  enumValues?: string[];
}

/**
 * エクスポートオプション
 */
export interface CSVExportOptions {
  includeId?: boolean;
  includeTimestamps?: boolean;
  dateFormat?: 'iso' | 'japanese';
  encoding?: 'utf-8' | 'shift_jis';
}
```

---

## 7. 品質ゲート

### 7.1 完了条件

| 項目 | 目標 | 測定方法 |
|------|------|----------|
| エクスポート機能 | 全タブで動作 | E2Eテスト |
| インポート機能 | 全タブで動作 | E2Eテスト |
| ラウンドトリップ | エクスポート→インポートで同一データ | 自動テスト |
| エラーハンドリング | 詳細エラー表示 | 手動テスト |
| 文字コード | UTF-8/Shift_JIS両対応 | 手動テスト |

### 7.2 セキュリティチェックリスト

- [ ] CSVインポート: ファイルサイズ制限（10MB）
- [ ] CSVインポート: 最大行数制限（10,000行）
- [ ] CSVインポート: XSS対策（サニタイズ）
- [ ] CSVインポート: CSV injection対策

---

## 8. CSVテンプレートファイル（API不要ワークフロー）

### 8.1 概要

`public/csv-templates/` ディレクトリに、API不要で使用できるCSVテンプレートファイルを配置。
外部AI（ChatGPT/Claude）と組み合わせてマニュアルワークフローで活用可能。

### 8.2 テンプレートファイル一覧

| カテゴリ | ファイル名 | 説明 |
|---------|-----------|------|
| **戦略層** | | |
| | `mvv-template.csv` | MVV空テンプレート |
| | `mvv-example.csv` | MVVサンプル |
| | `lean-canvas-template.csv` | リーンキャンバス空テンプレート |
| | `lean-canvas-example.csv` | リーンキャンバスサンプル |
| | `customer-journey-template.csv` | カスタマージャーニー空テンプレート |
| | `customer-journey-example.csv` | カスタマージャーニーサンプル |
| **OKR** | | |
| | `okr-objective-template.csv` | Objective空テンプレート |
| | `okr-objective-example.csv` | Objectiveサンプル |
| | `okr-keyresult-template.csv` | KeyResult空テンプレート |
| | `okr-keyresult-example.csv` | KeyResultサンプル |
| **Action Map** | | |
| | `action-map-template.csv` | ActionMap空テンプレート |
| | `action-map-example.csv` | ActionMapサンプル |
| | `action-item-template.csv` | ActionItem空テンプレート |
| | `action-item-example.csv` | ActionItemサンプル |
| **TODO** | | |
| | `task-template.csv` | タスク空テンプレート |
| | `task-example.csv` | タスクサンプル（4象限対応） |
| **営業** | | |
| | `prospect-template.csv` | 見込み客空テンプレート |
| | `prospect-example.csv` | 見込み客サンプル |
| | `client-template.csv` | 顧客空テンプレート |
| | `client-example.csv` | 顧客サンプル |
| | `lost-deal-template.csv` | 失注案件空テンプレート |
| | `lost-deal-example.csv` | 失注案件サンプル |
| **スクリプト** | | |
| | `script-template.csv` | スクリプト空テンプレート |
| | `script-example.csv` | スクリプトサンプル |
| **AI活用** | | |
| | `AI-PROMPTS.md` | ChatGPT/Claude用プロンプト集 |
| | `README.md` | 使い方ガイド |

### 8.3 使い方フロー

```
┌─────────────────────────────────────────────────────────────┐
│         API不要CSVワークフロー                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 【パターン1】テンプレート直接編集                            │
│   1. public/csv-templates/*-template.csv をダウンロード     │
│   2. Excel/Googleスプレッドシートで編集                     │
│   3. FoundersDirectの該当タブでインポート                   │
│                                                             │
│ 【パターン2】AI生成（推奨）                                  │
│   1. AI-PROMPTS.md からプロンプトをコピー                   │
│   2. ChatGPT/Claudeに貼り付け、ビジネス情報を入力           │
│   3. 出力されたCSVを保存                                    │
│   4. FoundersDirectでインポート                             │
│                                                             │
│ 【パターン3】サンプル参考                                    │
│   1. *-example.csv でフォーマットを確認                     │
│   2. 同じ形式で自分のデータを作成                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 AI活用例

**リーンキャンバス生成:**
```
1. AI-PROMPTS.md の「3. リーンキャンバス生成」セクションをコピー
2. ChatGPT/Claudeに貼り付け
3. 「私のビジネスアイデア」部分を自分の情報に置き換え
4. 出力されたCSVを lean-canvas.csv として保存
5. 設定タブでインポート
```

**OKR生成:**
```
1. AI-PROMPTS.md の「2. OKR生成」セクションをコピー
2. 現状の情報を入力
3. Objective用CSVとKeyResult用CSVが出力される
4. それぞれ別ファイルで保存
5. OKRタブでインポート
```

---

## 9. 関連ドキュメント

- `docs/FDC-GRAND-GUIDE.md` - 全体ガイド
- `docs/specs/API-SPEC.md` - API仕様
- `docs/runbooks/PHASE14-AI-RUNBOOK.md` - AI統合ランブック
- `lib/types/app-data.ts` - データ型定義
- `public/csv-templates/README.md` - CSVテンプレート使い方ガイド
- `public/csv-templates/AI-PROMPTS.md` - AIプロンプト集

---

**作成日**: 2025-11-30
**最終更新**: 2025-11-30
**ステータス**: 🚧 実装準備完了
