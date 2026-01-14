# Phase 25: ダッシュボード強化（統計・グラフ表示）

## 概要
ダッシュボードに統計情報とグラフを追加し、ビジネス状況を一目で把握できるようにする。

## 機能要件

### 1. 統計カード
- タスク: 総数、完了率、今週の予定
- リード: 総数、ステータス別件数、今月のコンバージョン率
- クライアント: 総数、今月の新規

### 2. グラフ表示
- タスク完了推移（週次/月次）
- リードパイプライン（ステータス別円グラフ）
- アプローチ実績（棒グラフ）

### 3. 最近のアクティビティ
- 直近10件のアクティビティログ表示

## 実装ステップ

### Step 1: 統計API作成
```
app/api/dashboard/stats/route.ts
```
- タスク統計
- リード統計
- クライアント統計

### Step 2: グラフライブラリ導入
```bash
npm install recharts
```

### Step 3: 統計コンポーネント作成
```
components/dashboard/
├── StatCard.tsx
├── TaskCompletionChart.tsx
├── LeadPipelineChart.tsx
└── RecentActivity.tsx
```

### Step 4: ダッシュボードページ更新
```
app/(app)/dashboard/page.tsx
```

## API仕様

### GET /api/dashboard/stats
```json
{
  "tasks": {
    "total": 50,
    "completed": 30,
    "completionRate": 60,
    "thisWeek": 5,
    "overdue": 2
  },
  "leads": {
    "total": 100,
    "byStatus": {
      "new": 20,
      "approaching": 30,
      "negotiating": 25,
      "proposing": 15,
      "won": 8,
      "lost": 2
    },
    "thisMonthConversions": 3
  },
  "clients": {
    "total": 45,
    "thisMonth": 3
  },
  "recentActivity": [...]
}
```

## 完了条件
- [ ] 統計APIが正常に動作する
- [ ] 統計カードが表示される
- [ ] グラフが表示される
- [ ] 最近のアクティビティが表示される
- [ ] 型チェック・ビルド成功
- [ ] 動作確認完了

## 注意事項
- rechartsはクライアントコンポーネントでのみ使用
- 大量データでもパフォーマンスを維持（集計はDB側で実行）
