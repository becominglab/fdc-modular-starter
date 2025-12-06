# AI機能詳細設計書 v1.5

**Version:** 1.5
**Status:** Phase 14.6 完了、AI基盤稼働中
**作成日:** 2025-11-29
**最終更新:** 2025-12-02（Phase 14.6 対応）

---

## 1. 設計目的

Phase 14 AI統合を開始する前に、以下を明確化する：

1. **何をAI化するか** - 対象機能の優先順位
2. **どうAI化するか** - 入出力仕様・プロンプト設計
3. **なぜAI化するか** - ユーザー価値・ROI
4. **AI化しないもの** - 人間判断を維持する領域
5. **どう運用するか** - ロギング・フィードバック・ガバナンス

---

## 2. 現状分析

### 2.1 既存AI基盤（Phase 14.6 時点）

| コンポーネント | 状態 | ファイル |
|--------------|------|----------|
| コンテキスト正規化 | ✅ Ready | `lib/core/ai-context.ts` |
| Chat API Gateway | ✅ Ready | `app/api/ai/chat/route.ts` |
| **AI使用量追跡** | ✅ Ready | `app/api/ai/usage/route.ts` (Phase 14.6) |
| **AI コスト管理** | ✅ Ready | `lib/server/ai-cost.ts` (Phase 14.6) |
| Rate Limiting | ✅ Ready | `lib/server/rate-limit.ts` (5req/min) |
| PII保護 | ✅ Ready | 3レベル（MINIMAL/STANDARD/FULL） |
| ストリーミング | ✅ Ready | Vercel AI SDK 5.0.100 |
| 構造化ログ | ✅ Ready | Pino（機密情報マスキング） |
| セッション認証 | ✅ Ready | Vercel KV キャッシュ + JOIN 最適化 |

### 2.2 利用可能なデータ

| カテゴリ | データ | AI活用可能性 |
|---------|--------|-------------|
| **戦略** | MVV, Lean Canvas, Brand | 高 - メッセージング基盤 |
| **OKR** | Objective, KeyResult | 高 - 目標設定支援 |
| **戦術** | ActionMap, ActionItem | 高 - タスク分解支援 |
| **実行** | Task, ElasticHabit | 中 - 優先順位付け |
| **営業** | Prospect, Client, Template | 高 - メッセージ生成 |
| **分析** | LostDeal, ApproachStats | 高 - パターン分析 |

### 2.3 ユーザーペインポイント

| 課題 | 現状 | AI解決策 |
|------|------|----------|
| MVV作成が難しい | ゼロから考える | 業種・ビジョンから原案生成 |
| Lean Canvas作成に時間 | 9要素を手動 | ビジネスアイデアから生成 |
| ブランドトーン定義が曖昧 | 感覚的に決める | MVVから一貫性ある提案 |
| OKR設定に時間がかかる | 手動で考える | MVVから提案生成 |
| Action Map作成が面倒 | 手動分解 | OKRから自動生成 |
| メール文面作成に悩む | 毎回ゼロから | ブランドトーンで生成 |
| 失注理由分析が大変 | 手動集計 | パターン自動検出 |
| 日次振り返りが続かない | 自分で書く | サマリー自動生成 |

---

## 3. 共通設計（クロスカット）

### 3.1 共通コンテキスト型

全AIエンドポイントで共通して使用するリクエストコンテキスト：

```typescript
/**
 * 全AI機能で共通して使用するコンテキスト
 * PII保護・ロギング・多言語対応を統一
 */
interface AIRequestContext {
  workspaceId: string;
  userId: string;
  piiLevel: 'MINIMAL' | 'STANDARD' | 'FULL';
  locale: 'ja-JP' | 'en-US';     // 将来の多言語対応
  timeZone: string;              // Asia/Tokyo など
  traceId: string;               // ログ関連付け用（UUID）
  featureKey: string;            // 'ai.sales.generateMessage' など
}

/**
 * 全AI機能の基本レスポンス構造
 */
interface AIBaseResponse<T> {
  success: boolean;
  data?: T;
  error?: AIErrorResponse;
  meta: {
    requestId: string;
    promptVersion: string;       // 'sales-message@1.0.0'
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
}
```

### 3.2 プロンプトバージョン管理

```
docs/prompts/
├── mvv-generation/
│   ├── v1.0.md
│   └── current.md → v1.0.md (symlink)
├── sales-message/
│   ├── v1.0.md
│   ├── v1.1.md
│   └── current.md → v1.1.md
└── ...
```

各プロンプトファイルの先頭にメタ情報：

```markdown
<!--
id: sales-message
version: 1.1.0
owner: takao
created: 2025-11-29
changelog:
- 1.1.0: Few-Shot例を追加、禁止カテゴリ対応
- 1.0.0: 初版
-->
```

### 3.3 Feature Flag 設計

```typescript
/**
 * Workspace ごとの AI 機能有効/無効制御
 */
interface AIFeatureFlags {
  workspaceId: string;
  features: {
    [key: string]: {
      enabled: boolean;
      tier: 'free' | 'pro' | 'enterprise';
      monthlyQuota?: number;
      usedThisMonth?: number;
    };
  };
}

// Feature Key 一覧
type AIFeatureKey =
  | 'ai.mvv.generate'
  | 'ai.leanCanvas.generate'
  | 'ai.brand.generate'
  | 'ai.sales.generateMessage'
  | 'ai.sales.analyzeLostDeals'
  | 'ai.okr.suggest'
  | 'ai.cascade.krToActionMap'
  | 'ai.cascade.actionItemToTodos'
  | 'ai.todo.prioritize'
  | 'ai.todo.suggestHabitLevel'
  | 'ai.reports.summary';
```

### 3.4 ロギング設計

```typescript
/**
 * AI呼び出しログ（分析・コスト管理・品質改善用）
 */
interface AILog {
  requestId: string;
  timestamp: string;
  userId: string;
  workspaceId: string;
  feature: string;               // 'sales-message', 'lost-deal-analysis' etc
  promptVersion: string;         // 'sales-message@1.0.0'
  inputSizeTokens: number;
  outputSizeTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;

  // フィードバック関連
  feedbackRating?: 'helpful' | 'not_helpful';
  suggestionApplied?: boolean;
  userModified?: boolean;        // AIの提案を修正して使用したか
}
```

### 3.5 タイムアウト・フォールバック設計

| TIER | タイムアウト | フォールバック |
|------|-------------|---------------|
| TIER 0 | 30秒 | エラー表示 + 手動入力誘導 |
| TIER 1 | 20秒 | 再実行ボタン + 手動入力誘導 |
| TIER 1.5 | 25秒 | 再実行ボタン + 手動作成誘導 |
| TIER 2 | 15秒 | AIなしで通常フローに戻す |

```typescript
interface AITimeoutConfig {
  tier: 'TIER0' | 'TIER1' | 'TIER1.5' | 'TIER2';
  timeoutMs: number;
  retryCount: number;
  fallbackBehavior: 'error_with_manual' | 'retry_button' | 'skip_ai';
}
```

---

## 4. AI機能優先度マトリクス

### 4.1 評価軸

| 軸 | 説明 |
|----|------|
| **価値** | ユーザーの時間節約・品質向上 |
| **実装難易度** | 技術的複雑さ・工数 |
| **データ依存** | 必要なデータの充実度 |
| **リスク** | ハルシネーション・誤用リスク |

### 4.2 優先度ランキング

| 優先度 | 機能 | 価値 | 難易度 | 理由 |
|--------|------|------|--------|------|
| **TIER 0** | | | | **基盤構築（初期設定支援）** |
| 0-1 | MVV原案生成 | 🔴 高 | 🟢 低 | 業種・ビジョンから原案 → 人間がブラッシュアップ |
| 0-2 | Lean Canvas生成 | 🔴 高 | 🟢 低 | ビジネスアイデアから9要素生成 |
| 0-3 | Brand設定生成 | 🔴 高 | 🟢 低 | MVVからトーン・言葉遣い提案 |
| **TIER 1** | | | | **収益直結・高価値** |
| 1-1 | セールスメッセージ生成 | 🔴 高 | 🟢 低 | ブランドトーンでテンプレート生成 |
| 1-2 | 失注分析アシスタント | 🔴 高 | 🟡 中 | パターン検出で改善提案 |
| 1-3 | OKR設定アシスタント | 🔴 高 | 🟡 中 | MVVから目標提案 |
| **TIER 1.5** | | | | **カスケード展開（三層構造支援）** |
| 1.5-1 | KR → Action Map展開 | 🔴 高 | 🟡 中 | KRからAction Map + Items自動生成 |
| 1.5-2 | Action Item → TODO展開 | 🔴 高 | 🟢 低 | ActionItemから具体的タスク生成 |
| **TIER 2** | | | | **業務効率化** |
| 2-1 | Action Map自動生成 | 🟡 中 | 🟡 中 | OKRからタスク分解（TIER 1.5と統合検討） |
| 2-2 | タスク優先順位提案 | 🟡 中 | 🟢 低 | 4象限への自動分類 |
| 2-3 | 習慣レベル提案 | 🟡 中 | 🟢 低 | 松竹梅の最適選択 |
| 2-4 | パフォーマンスサマリー | 🟡 中 | 🟢 低 | 週次レポート自動生成 |
| **TIER 3** | | | | **Nice-to-Have** |
| 3-1 | Zoomスクリプト改善 | 🟢 低 | 🟡 中 | 会話フロー最適化 |
| 3-2 | 見込み客スコアリング | 🟢 低 | 🔴 高 | エンゲージメント分析 |
| 3-3 | カスタマージャーニー生成 | 🟢 低 | 🟡 中 | 顧客心理マッピング |

---

## 4. TIER 0 機能詳細設計（基盤構築）

> **設計思想**: AI原案 → 人間ブラッシュアップ
>
> TIER 0は「ゼロから作る」負担を軽減する機能群。
> AIが80%の原案を生成し、人間が20%の調整・承認を行う。

### 4.1 MVV原案生成（0-1）

#### 概要
業種・事業内容・創業者のビジョンからMission/Vision/Valueの原案を生成

#### 入力データ

```typescript
interface MVVGenerationInput {
  // 必須
  businessType: string;        // "SaaS", "コンサルティング", "製造業", etc.
  targetCustomer: string;      // "中小企業", "スタートアップ", etc.
  founderVision: string;       // 創業者の想い（自由記述）

  // オプション
  industry?: string;           // "IT", "金融", "医療", etc.
  companySize?: string;        // "1-10人", "11-50人", etc.
  existingKeywords?: string[]; // 既に使いたい言葉
  competitors?: string[];      // 競合他社名
}
```

#### 出力

```typescript
interface MVVGenerationOutput {
  // 3パターン提案
  variants: {
    id: string;
    style: 'inspirational' | 'practical' | 'bold';
    mission: string;
    missionReasoning: string;
    vision: string;
    visionReasoning: string;
    value: string;
    valueReasoning: string;
  }[];

  // 共通アドバイス
  tips: string[];
}
```

#### システムプロンプト設計

```
あなたは企業ブランディングの専門家です。

【事業情報】
業種: {businessType}
ターゲット顧客: {targetCustomer}
創業者のビジョン: {founderVision}
業界: {industry}
企業規模: {companySize}

以下の3パターンでMVVを提案してください：

1. **インスピレーション型**: 感動・共感を重視した表現
2. **実践型**: 具体的で行動指針が明確な表現
3. **ボールド型**: 大胆で印象に残る表現

各パターンについて：
- Mission: 「なぜ存在するか」（1-2文）
- Vision: 「どこを目指すか」（1-2文）
- Value: 「何を大切にするか」（3-5項目）
- 各要素の選定理由

注意：
- 抽象的すぎず、具体的すぎない絶妙なバランス
- 業界の常套句は避ける
- 創業者のビジョンを必ず反映
```

#### UI配置
- MVV タブ → 「AIで原案生成」ボタン
- 3パターンをカード表示 → 選択 → 編集画面へ
- 「この表現を採用」で各要素を個別選択可能

#### ワークフロー
```
1. ユーザーが事業情報を入力
2. AI が3パターンのMVVを生成
3. ユーザーがパターン選択 or 要素をミックス
4. 編集画面でブラッシュアップ
5. 保存 → Lean Canvas/Brand生成の基盤に
```

---

### 4.2 Lean Canvas生成（0-2）

#### 概要
ビジネスアイデア・MVVから9要素のLean Canvasを自動生成

#### 入力データ

```typescript
interface LeanCanvasGenerationInput {
  // 必須（MVVから自動取得または手入力）
  businessIdea: string;        // ビジネスアイデア概要
  targetCustomer: string;      // ターゲット顧客

  // オプション（MVVがある場合は自動取得）
  mvv?: {
    mission: string;
    vision: string;
    value: string;
  };

  // 既存情報（あれば）
  existingProducts?: string[]; // 既存商品/サービス
  knownProblems?: string[];    // 把握している顧客課題
  competitiveAdvantage?: string; // 強み
}
```

#### 出力

```typescript
interface LeanCanvasGenerationOutput {
  canvas: {
    // Lean Canvas 9要素
    customerSegments: string;     // 顧客セグメント
    problems: string[];           // 顧客の課題（Top 3）
    uniqueValueProp: string;      // 独自の価値提案
    solutions: string[];          // 解決策（Top 3）
    channels: string[];           // チャネル
    revenueStreams: string[];     // 収益の流れ
    costStructure: string[];      // コスト構造
    keyMetrics: string[];         // 主要指標
    unfairAdvantage: string;      // 圧倒的な優位性
  };

  // プロダクトレイヤー（追加提案）
  productLayers?: {
    front: string;   // フロント商品（集客用）
    middle: string;  // ミドル商品（主力）
    back: string;    // バック商品（高単価）
  };

  // 各要素の解説
  explanations: Record<string, string>;

  // 検証すべき仮説
  hypothesesToTest: string[];
}
```

#### システムプロンプト設計

```
あなたはリーンスタートアップの専門家です。

【ビジネス情報】
ビジネスアイデア: {businessIdea}
ターゲット顧客: {targetCustomer}

【MVV（設定済みの場合）】
Mission: {mvv?.mission}
Vision: {mvv?.vision}
Value: {mvv?.value}

Lean Canvas の9要素を埋めてください：

1. **顧客セグメント**: ターゲット顧客の具体的な属性
2. **課題 (Top 3)**: 顧客が抱える最も重要な課題
3. **独自の価値提案**: なぜ顧客は選ぶのか（1文）
4. **解決策 (Top 3)**: 課題に対するアプローチ
5. **チャネル**: 顧客にリーチする方法
6. **収益の流れ**: どうやって稼ぐか
7. **コスト構造**: 主要なコスト項目
8. **主要指標**: 成功を測るKPI
9. **圧倒的な優位性**: 簡単に真似できない強み

追加で：
- フロント/ミドル/バック商品の提案
- 検証すべき仮説リスト

注意：
- 具体的で検証可能な内容
- MVVとの一貫性を保つ
- 楽観的すぎない現実的な見積もり
```

#### UI配置
- Lean Canvas タブ → 「AIで生成」ボタン
- Canvas形式でプレビュー表示
- 各セルをクリックで個別編集
- 「検証仮説」をTODOに追加可能

---

### 4.3 Brand設定生成（0-3）

#### 概要
MVV・事業内容からブランドトーン・言葉遣いガイドラインを生成

#### 入力データ

```typescript
interface BrandGenerationInput {
  // MVVから自動取得
  mvv: {
    mission: string;
    vision: string;
    value: string;
  };

  // 必須
  targetAudience: string;      // ターゲット読者
  communicationStyle: 'formal' | 'casual' | 'professional' | 'friendly';

  // オプション
  existingBrandElements?: {
    logo?: string;
    colors?: string[];
    fonts?: string[];
  };
  brandPersonality?: string[];  // "信頼", "革新", "親しみ", etc.
  competitors?: string[];       // 差別化のため
}
```

#### 出力

```typescript
interface BrandGenerationOutput {
  brand: {
    coreMessage: string;         // 核となるメッセージ
    tagline: string;             // タグライン候補
    tone: string;                // トーンの説明

    // 言葉遣いガイド
    wordsUse: string[];          // 使う言葉（10-15語）
    wordsAvoid: string[];        // 避ける言葉（10-15語）

    // 文体ガイド
    sentenceStyle: {
      length: 'short' | 'medium' | 'long';
      formality: number;         // 1-5
      emotion: number;           // 1-5
    };

    // サンプル文章
    sampleTexts: {
      greeting: string;          // 挨拶例
      productIntro: string;      // 商品紹介例
      problemStatement: string;  // 課題提起例
      callToAction: string;      // CTA例
    };
  };

  // 使用シーン別ガイド
  useCases: {
    email: string;
    website: string;
    socialMedia: string;
    presentation: string;
  };
}
```

#### システムプロンプト設計

```
あなたはブランドストラテジストです。

【MVV】
Mission: {mvv.mission}
Vision: {mvv.vision}
Value: {mvv.value}

【ターゲット】
{targetAudience}

【希望スタイル】
{communicationStyle}

【ブランドパーソナリティ】
{brandPersonality?.join(', ')}

以下のブランドガイドラインを作成してください：

1. **コアメッセージ**: ブランドの本質を1文で
2. **タグライン**: キャッチコピー（3案）
3. **トーン説明**: どんな「声」で話すか

4. **使う言葉リスト（15語）**:
   - MVVを体現する言葉
   - ターゲットに響く言葉
   - 差別化できる言葉

5. **避ける言葉リスト（15語）**:
   - 競合が多用する言葉
   - ブランドイメージに合わない言葉
   - 曖昧で無意味な言葉

6. **サンプル文章**:
   - 挨拶文
   - 商品紹介文
   - 課題提起文
   - CTA文

注意：
- MVVとの一貫性
- ターゲットに適した語彙レベル
- 競合との差別化
```

#### UI配置
- Brand セクション → 「AIで生成」ボタン
- ガイドライン形式で表示
- 「使う/避ける言葉」はチップ形式で編集可能
- サンプル文章はテンプレート画面と連携

---

## 5. TIER 1.5 カスケード展開AI（三層構造支援）

> **設計思想**: OKR → Action Map → TODO の三層カスケード展開をAIが支援
>
> 戦略（OKR）から戦術（Action Map）へ、戦術から実行（TODO）へ
> 人間は「何を達成したいか」だけ決め、AIが「どう分解するか」を提案

### 5.1 KR → Action Map展開（1.5-1）

#### 概要
Key Result を達成するための Action Map と Action Items を自動生成

#### 入力データ

```typescript
interface KRToActionMapInput {
  // 必須: 展開元のKR
  keyResult: {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    deadline: string;
  };

  // 親Objectiveのコンテキスト
  objective: {
    title: string;
    description?: string;
    scope: 'company' | 'team' | 'personal';
  };

  // オプション: 制約条件
  constraints?: {
    maxActionItems: number;     // 最大アイテム数（デフォルト: 10）
    teamSize: number;           // チーム人数
    weeklyHours: number;        // 週あたり稼働時間
    existingActionMaps: string[]; // 既存のAction Map（重複回避）
  };

  // オプション: 既存のリンク情報
  existingLinks?: {
    actionMapIds: string[];
  };
}
```

#### 出力

```typescript
interface KRToActionMapOutput {
  actionMap: {
    title: string;
    description: string;
    targetProgressRate: number;  // KR達成時の目標進捗率
  };

  actionItems: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours: number;
    weekNumber: number;          // 何週目に着手すべきか
    contributionToKR: string;    // このアイテムがKRにどう貢献するか
    measurableOutput: string;    // 完了の判断基準
    dependencies?: string[];     // 先行タスク
  }[];

  timeline: {
    week: number;
    focus: string;               // その週のフォーカス
    items: string[];             // その週のアイテム
    milestoneCheck: string;      // マイルストーン確認ポイント
  }[];

  riskFactors: string[];         // 想定されるリスク
  successCriteria: string[];     // 成功判断基準
}
```

#### システムプロンプト設計

```
あなたはOKRコーチ兼プロジェクトマネージャーです。

【Key Result】
タイトル: {keyResult.title}
目標値: {keyResult.targetValue} {keyResult.unit}
現在値: {keyResult.currentValue} {keyResult.unit}
期限: {keyResult.deadline}
残り: {remainingDays}日

【親Objective】
{objective.title}
{objective.description}

【制約条件】
チーム人数: {constraints.teamSize}人
週稼働時間: {constraints.weeklyHours}時間

このKRを達成するためのAction Mapを設計してください。

要件：
1. **逆算思考**: 目標値から逆算して必要なアクションを分解
2. **MECE原則**: 漏れなく・ダブりなく
3. **週次マイルストーン**: 週ごとの進捗確認ポイント
4. **依存関係**: 順序が重要なものは明示
5. **貢献度明示**: 各アイテムがKRにどう貢献するか

出力形式：
- Action Map: タイトル + 説明
- Action Items: 5-10個（優先度・工数・週番号付き）
- タイムライン: 週次計画
- リスク: 想定される障害
- 成功基準: 完了判断ポイント
```

#### UI配置
- OKR タブ → KR選択 → 「Action Mapを生成」ボタン
- ActionMapLinkModal に「AIで新規生成」ボタン追加
- 生成プレビュー → 調整 → 保存 → 自動リンク

#### ワークフロー
```
1. ユーザーがKRを選択
2. 「Action Mapを生成」をクリック
3. AI が Action Map + Items を提案
4. プレビュー画面で確認・調整
5. 保存 → KR に自動リンク
6. Action Map タブで詳細編集可能
```

---

### 5.2 Action Item → TODO展開（1.5-2）

#### 概要
Action Item を具体的な日次/週次タスクに分解

#### 入力データ

```typescript
interface ActionItemToTODOInput {
  // 必須: 展開元のAction Item
  actionItem: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours?: number;
  };

  // 親Action Mapのコンテキスト
  actionMap: {
    title: string;
    deadline?: string;
  };

  // オプション: ユーザーの状況
  userContext?: {
    preferredTaskDuration: number;  // 好みのタスク粒度（分）
    dailyAvailableHours: number;    // 1日の稼働時間
    existingTasks: {
      date: string;
      count: number;
      totalHours: number;
    }[];
  };

  // オプション: 既存リンク
  existingLinkedTasks?: string[];
}
```

#### 出力

```typescript
interface ActionItemToTODOOutput {
  tasks: {
    title: string;
    description?: string;
    suit: 'spade' | 'heart' | 'diamond' | 'club';
    suitReasoning: string;        // なぜこの象限か
    estimatedMinutes: number;
    suggestedDate?: string;       // 推奨実行日
    isElasticHabit: boolean;      // 習慣タスク化推奨
    elasticLevels?: {
      gold: string;   // 松
      silver: string; // 竹
      bronze: string; // 梅
    };
    dependencies?: string[];      // 先行タスク
  }[];

  schedule: {
    date: string;
    tasks: string[];
    totalMinutes: number;
    workloadWarning?: string;     // 過負荷警告
  }[];

  tips: string[];                 // 効率化のヒント
}
```

#### システムプロンプト設計

```
あなたはタスク分解の専門家です。

【Action Item】
タイトル: {actionItem.title}
説明: {actionItem.description}
優先度: {actionItem.priority}
見積工数: {actionItem.estimatedHours}時間

【親Action Map】
{actionMap.title}
期限: {actionMap.deadline}

【ユーザー設定】
好みのタスク粒度: {userContext.preferredTaskDuration}分
1日の稼働時間: {userContext.dailyAvailableHours}時間

このAction Itemを実行可能なTODOに分解してください。

要件：
1. **粒度**: 1タスク15-60分（ユーザー設定優先）
2. **4象限分類**: ♠緊急&重要 ♥重要 ◆緊急 ♣戦略的
3. **習慣化**: 繰り返し性のあるものはElastic Habit（松竹梅）推奨
4. **スケジュール**: 既存タスクを考慮した日程提案
5. **依存関係**: 順序が重要なものは明示

出力形式：
- タスクリスト: 3-8個（象限・工数・日程付き）
- スケジュール案: 日別配置
- ヒント: 効率化のコツ
```

#### UI配置
- Action Map タブ → Action Item選択 → 「TODOに展開」ボタン
- TODO タブ → 「Action Itemから生成」ボタン
- 生成プレビュー → 調整 → 一括作成

#### ワークフロー
```
1. ユーザーがAction Itemを選択
2. 「TODOに展開」をクリック
3. AI がタスクリスト + スケジュールを提案
4. プレビュー画面で確認・調整
   - タスクの追加/削除
   - 日程の変更
   - 象限の変更
5. 一括作成 → TODO Board に追加
6. 元のAction Itemに自動リンク
```

---

### 5.3 カスケード展開のUI統合

#### 全体フロー図
```
┌─────────────────────────────────────────────────────────────┐
│                    OKR タブ                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Objective: 売上を2倍にする                             │   │
│  │  └─ KR: 新規顧客30件獲得                               │   │
│  │      [🤖 Action Mapを生成]  ←── クリック               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ AI生成
┌─────────────────────────────────────────────────────────────┐
│                 Action Map タブ                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Action Map: 新規顧客獲得キャンペーン                     │   │
│  │  └─ Item: DMリスト作成                                  │   │
│  │      [🤖 TODOに展開]  ←── クリック                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ AI生成
┌─────────────────────────────────────────────────────────────┐
│                    TODO タブ                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ♥ ターゲット企業リストアップ（30分）                      │   │
│  │  ♥ 業種別テンプレート作成（45分）                         │   │
│  │  ◆ DM配信設定（20分）                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 連鎖生成オプション
- 「KR → Action Map → TODO を一気に生成」チェックボックス
- 大きなKRを一気に実行可能なタスクまで分解
- 途中で確認ポイントを挟むオプションあり

---

## 7. TIER 1 機能詳細設計

### 7.1 セールスメッセージ生成（1-1）

#### 概要
ブランドトーン・カスタマージャーニー・ファネル状況に基づいて、メール/メッセンジャーテンプレートを生成

#### 入力データ

```typescript
interface MessageGenerationInput {
  // 必須
  channel: 'email' | 'messenger';
  funnelStatus: ProspectStatus;  // uncontacted, responded, negotiating

  // 追加: 意図・セグメント・CTA種別（GPTフィードバック）
  intent: 'first_contact' | 'follow_up' | 'closing' | 'thank_you';
  segment?: 'cold' | 'warm' | 'existing_client';
  ctaType: 'book_zoom' | 'reply_mail' | 'download_lp' | 'no_cta';
  language?: 'ja' | 'en';  // 将来の多言語対応

  // コンテキスト（自動取得）
  brand: {
    coreMessage: string;
    tone: string;
    wordsUse: string[];
    wordsAvoid: string[];
    // 追加: 禁止カテゴリ（GPTフィードバック）
    forbiddenCategories?: ('guarantee_future' | 'overclaim' | 'discount_promise' | 'legal_claim')[];
  };
  customerJourney: {
    phase: string;
    psychology: string;
    emotion: string;
  };

  // オプション
  prospectInfo?: {
    company: string;
    industry?: string;
    previousInteraction?: string;
  };

  // 追加: Few-Shot例（Geminiフィードバック）
  // 過去に返信があった成功メールを数件含める
  successfulEmailSamples?: {
    subject: string;
    body: string;
    responseRate: number;
  }[];
}
```

#### 出力

```typescript
interface MessageGenerationOutput {
  subject?: string;           // メールの場合
  body: string;               // 本文
  callToAction: string;       // CTA
  variants: MessageVariant[]; // A/Bテスト用（2-3パターン）
  reasoning: string;          // なぜこの文面か

  // 追加: 品質チェック結果
  qualityCheck: {
    forbiddenCategoryViolations: string[];  // 検出された禁止表現
    wordsAvoidViolations: string[];         // 使ってしまった避けるべき言葉
    passed: boolean;
  };
}

interface MessageVariant {
  id: string;
  subject?: string;
  body: string;
  style: 'formal' | 'casual' | 'urgent';
}
```

#### システムプロンプト設計

```
あなたは営業メッセージの専門家です。以下のブランドガイドラインに厳密に従ってください。

【ブランドトーン】
{brand.tone}

【使用する言葉】
{brand.wordsUse.join(', ')}

【避ける言葉】
{brand.wordsAvoid.join(', ')}

【顧客の心理状態】
フェーズ: {customerJourney.phase}
心理: {customerJourney.psychology}
感情: {customerJourney.emotion}

【ファネル状況】
{funnelStatus === 'uncontacted' ? '初回接触' :
 funnelStatus === 'responded' ? 'フォローアップ' : '商談中'}

上記を踏まえ、{channel}用のメッセージを3パターン生成してください。
各パターンは異なるアプローチ（フォーマル/カジュアル/緊急感）で作成し、
なぜその表現を選んだか理由も説明してください。
```

#### UI配置
- Templates タブ → 「AIで生成」ボタン
- モーダルで入力選択 → 生成結果プレビュー → テンプレート保存

#### 品質保証
- [ ] ブランドトーン違反チェック（wordsAvoid含有検出）
- [ ] 文字数制限（メール500字、メッセンジャー200字）
- [ ] ユーザーによる修正・承認必須

---

### 7.2 失注分析アシスタント（1-2）

#### 概要
失注データのパターンを分析し、改善提案を生成

> **重要設計原則（Gemini/Opusフィードバック）**
> - LLMは**計算が苦手**でハルシネーションを起こしやすい
> - **数値計算はサーバー側（TypeScript）で事前実行**
> - LLMには**計算済み統計データ + 定性テキスト**を渡し、**解釈・意味づけ・提案**に専念させる

#### 入力データ（サーバー側で事前集計済み）

```typescript
/**
 * バックエンドで事前計算した集計データ
 * LLMには生データではなくこれを渡す
 */
interface LostDealAnalysisInput {
  // 統計サマリー（事前計算済み）
  preAggregated: {
    reasonStats: {
      reasonCategory: string;
      count: number;
      percentage: number;
    }[];
    channelStats: {
      channel: string;
      wonRate: number;
      lostRate: number;
    }[];
    interactionStats: {
      wonAvgInteractions: number;
      lostAvgInteractions: number;
      wonAvgDays: number;
      lostAvgDays: number;
    };
    templateEffectiveness: {
      templateName: string;
      usageCount: number;
      successRate: number;
    }[];
  };

  // 定性データ（失注理由の生テキスト、サンプリング済み）
  qualitativeData: {
    sampleReasons: string[];  // 最大20件にサンプリング
    commonPhrases: string[];  // 頻出フレーズ
  };

  // サンプルサイズ（統計的妥当性チェック用）
  sampleSize: {
    lostDeals: number;
    wonDeals: number;
    minimumRequired: number;  // デフォルト10
  };
}
```

#### 出力

```typescript
interface LostDealAnalysisOutput {
  // 統計的妥当性チェック（Opusフィードバック）
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient_data';
  sampleSizeWarning?: string;  // "データが5件のみのため、参考値としてご覧ください"

  // パターン分析
  patterns: {
    category: string;        // "フォローアップ不足", "価格訴求", etc.
    count: number;
    percentage: number;
    description: string;
  }[];

  // 改善提案（ActionMapへの落とし込み対応）
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    expectedImpact: string;
    // 追加（GPTフィードバック）
    suggestedOwnerRole?: 'founder' | 'sales' | 'cs';
    suggestedDueInWeeks?: number;
  }[];

  // 比較インサイト（事前計算値をそのまま使用）
  insights: {
    metric: string;
    wonAvg: number;
    lostAvg: number;
    gap: string;
    interpretation: string;  // LLMによる解釈
  }[];
}
```

#### システムプロンプト設計

```
あなたはB2B営業の分析専門家です。

【失注データ】
{lostDeals.map(d => `- ${d.reason} (${d.prospectCompany}, 接触${d.interactionCount}回, ${d.daysSinceFirstContact}日経過)`).join('\n')}

【成約データ（比較用）】
平均接触回数: {wonDeals.avgInteractionCount}回
平均成約日数: {wonDeals.avgDays}日

以下の観点で分析してください：
1. 失注理由のカテゴリ分類とパターン
2. 成約案件との差異（接触回数、期間など）
3. 具体的な改善アクション（優先度付き）
4. 期待される効果

数値的な根拠を示しながら、実行可能な提案をしてください。
```

#### UI配置
- Lost Deals タブ → 「AI分析」ボタン
- 分析結果をダッシュボード表示
- 提案アクションをTODOに追加可能

---

### 7.3 OKR設定アシスタント（1-3）

#### 概要
MVV・過去実績・現状データからOKR案を提案

> **重要設計原則（Opusフィードバック）**
> - AIは**目標の言語化**に専念
> - 数値目標は**過去実績ベースの範囲提案**に留め、最終決定は人間
> - 「達成可能性の根拠」のハルシネーション防止

#### 入力データ

```typescript
interface OKRSuggestionInput {
  // MVV
  mvv: {
    mission: string;
    vision: string;
    value: string;
  };

  // 現状KPI
  currentMetrics: {
    prospectCount: number;
    clientCount: number;
    conversionRate: number;
    avgDealSize: number;
  };

  // 過去OKR（参考）
  previousOKRs?: {
    objective: string;
    achieved: boolean;
    progressRate: number;
  }[];

  // 期間
  period: {
    start: string;
    end: string;
    type: 'monthly' | 'quarterly' | 'yearly';
  };

  // スコープ
  scope: 'company' | 'team' | 'personal';

  // 追加（GPT/Opusフィードバック）
  aggressiveness?: 'conservative' | 'balanced' | 'aggressive';  // ストレッチ度合い
  parentObjectiveId?: string;  // 会社OKR→チームOKRへのブレイクダウン時
}
```

#### 出力

```typescript
interface OKRSuggestionOutput {
  objectives: {
    title: string;
    description: string;
    reasoning: string;          // なぜこの目標か
    parentObjectiveId?: string; // トレーサビリティ

    keyResults: {
      title: string;
      // 変更: targetValueは範囲で提案（Opusフィードバック）
      suggestedRange: {
        min: number;
        max: number;
      };
      unit: string;
      currentValue: number;
      // 変更: 過去実績ベースの根拠
      historicalBasis: string;  // "過去3ヶ月平均の1.2倍" など
      stretchLevel: 'conservative' | 'balanced' | 'aggressive';
    }[];
  }[];

  warnings?: string[];          // 注意点
  confidenceNote?: string;      // "過去データが少ないため参考値です"
}
```

#### システムプロンプト設計

```
あなたはOKR設計の専門家です。

【ミッション・ビジョン・バリュー】
ミッション: {mvv.mission}
ビジョン: {mvv.vision}
バリュー: {mvv.value}

【現状KPI】
見込み客数: {currentMetrics.prospectCount}
顧客数: {currentMetrics.clientCount}
コンバージョン率: {currentMetrics.conversionRate}%
平均案件規模: {currentMetrics.avgDealSize}円

【期間】
{period.type} ({period.start} 〜 {period.end})

【スコープ】
{scope === 'company' ? '会社全体' : scope === 'team' ? 'チーム' : '個人'}

SMART原則に基づいて、3つのObjectiveと各2-3のKey Resultを提案してください。
各KRは：
- 具体的な数値目標
- 現状値との比較
- 達成可能性の根拠
を含めてください。
```

#### UI配置
- OKR タブ → 「Objective作成」モーダル → 「AIで提案」ボタン
- 提案一覧から選択 → 編集 → 保存

---

## 7. TIER 2 機能詳細設計

### 7.1 Action Map自動生成（2-1）

#### 概要
選択したOKR（Objective + Key Results）から、Action MapとAction Itemsを自動生成

#### 入力

```typescript
interface ActionMapGenerationInput {
  objective: {
    title: string;
    description: string;
    periodEnd: string;
  };
  keyResults: {
    title: string;
    targetValue: number;
    currentValue: number;
    unit: string;
  }[];
  constraints?: {
    maxItems: number;       // 最大アイテム数
    teamSize: number;       // チーム人数
    hoursPerWeek: number;   // 週稼働時間
  };
}
```

#### 出力

```typescript
interface ActionMapGenerationOutput {
  actionMap: {
    title: string;
    description: string;
  };
  actionItems: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours: number;
    linkedKRIndex: number;  // どのKRに寄与するか
    subItems?: {
      title: string;
      estimatedHours: number;
    }[];
  }[];
  timeline: {
    week: number;
    items: string[];
  }[];
}
```

#### UI配置
- Action Map タブ → 「新規作成」→ 「OKRから生成」ボタン
- OKR選択 → AI生成 → プレビュー → 調整 → 保存

---

### 8.2 タスク優先順位提案（2-2）

#### 概要
タスクのタイトル・説明から4象限（♠♥♦♣）を提案

> **五次元経営の観点（Opusフィードバック）**
> - 緊急/重要の4象限だけでなく、**エネルギー効率**も考慮
> - 「やりたくないことを無理にやる」はエネルギー効率が悪い
> - AIがそれを指摘する機能は他ツールにない差別化要因

#### 入力

```typescript
interface TaskPrioritizationInput {
  task: {
    title: string;
    description?: string;
    deadline?: string;
    // 追加: 五次元経営のエネルギー観点（Opusフィードバック）
    energyFeel?: 'want' | 'should' | 'must' | 'avoid';
  };
  context: {
    linkedActionItem?: string;
    linkedObjective?: string;
    currentWorkload: {
      spade: number;   // 緊急&重要
      heart: number;   // 重要
      diamond: number; // 緊急
      club: number;    // 戦略的
    };
  };
}
```

#### 出力

```typescript
interface TaskPrioritizationOutput {
  suggestedSuit: 'spade' | 'heart' | 'diamond' | 'club';
  confidence: number;  // 0-100
  reasoning: string;
  alternativeSuit?: string;
  workloadWarning?: string;  // "♠が多すぎます"

  // 追加: 五次元経営のエネルギー観点（Opusフィードバック）
  doThisWeek: boolean;         // 今週中にやるべきか
  energyWarning?: string;      // "このタスクに抵抗を感じているようです。委任や延期を検討してください"
  delegationSuggestion?: string; // 委任先の提案
}
```

#### UI配置
- Task Board → タスク作成時に自動提案
- 「AIが♥を提案」→ 承認/変更
- エネルギー警告がある場合は黄色で表示

---

### 8.3 習慣レベル提案（2-3）

#### 概要
タスクの性質・過去実績から松竹梅レベルを提案

> **設計思想（Opusフィードバック）**
> - 「ガンバリすぎ防止」も重要な機能
> - 条件によっては「今日は休む」を推奨する選択肢も

#### 入力

```typescript
interface HabitLevelInput {
  task: {
    title: string;
    type: string;  // "運動", "学習", etc.
  };
  history?: {
    avgCompletionRate: number;
    streakDays: number;
    preferredLevel: '松' | '竹' | '梅';
  };
  todayCondition?: 'good' | 'normal' | 'tired' | 'sick';
}
```

#### 出力

```typescript
interface HabitLevelOutput {
  // 変更: 'rest' オプション追加（Opusフィードバック）
  suggestedLevel: '松' | '竹' | '梅' | 'rest';
  duration: number;  // 分（restの場合は0）
  reasoning: string;
  streakTip?: string;  // ストリーク維持のコツ

  // 追加: rest推奨時の説明
  restReason?: string;  // "3日連続高強度でした。回復日を取ることで長期継続につながります"
}
```

---

### 8.4 パフォーマンスサマリー（2-4）

#### 概要
週次/月次の実績を自動サマリー

> **TIER昇格検討（GPTフィードバック）**
> - この機能は「継続率・定着」に強く効く
> - TIER 1 に上げても良いくらい（MVP実装しやすい）

#### 入力

```typescript
interface PerformanceSummaryInput {
  period: 'daily' | 'weekly' | 'monthly';
  baseline?: 'previous_period' | 'last_4_weeks_avg';  // 比較基準（GPTフィードバック）
  taskLogs: TaskLog[];
  okrProgress: {
    objective: string;
    previousRate: number;
    currentRate: number;
  }[];
  funnelChanges: {
    stage: string;
    delta: number;
  }[];

  // 追加: 五次元経営のエネルギー観点（Opusフィードバック）
  dailyCheckins?: {
    date: string;
    energyLevel: 1 | 2 | 3 | 4 | 5;
    flowMoments?: string;   // フロー状態だった瞬間
    blockers?: string;      // 抵抗を感じた瞬間
  }[];
}
```

#### 出力

```typescript
interface PerformanceSummaryOutput {
  headline: string;           // "今週は生産性が15%向上"
  highlights: string[];       // 良かった点
  challenges: string[];       // 改善点
  nextWeekFocus: string[];    // 来週のフォーカス
  detailedMetrics: {
    category: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
  }[];

  // 追加: 五次元経営のエネルギー分析（Opusフィードバック）
  energyPattern?: {
    peakDays: string[];       // エネルギーが高かった日
    lowDays: string[];        // エネルギーが低かった日
    insight: string;          // "火曜日にエネルギーが高い傾向があります"
  };
  flowAnalysis?: {
    totalFlowMinutes: number;
    flowTriggers: string[];   // フロー状態のきっかけ
    recommendation: string;   // "午前中の集中タイムを増やすと良いでしょう"
  };
}
```

---

## 9. AI原案 vs 人間判断の境界

### 9.1 AI原案 → 人間ブラッシュアップ

| 機能 | AIの役割 | 人間の役割 |
|------|----------|-----------|
| **MVV** | 3パターン原案生成 | 選択・編集・最終決定 |
| **Lean Canvas** | 9要素の初期案 | 検証・修正・仮説優先度付け |
| **Brand** | トーン・言葉遣い提案 | ブランドらしさの判断・調整 |
| **OKR** | 目標・KR案 | 達成可能性判断・コミット |
| **KR→ActionMap** | Action Map + Items 生成 | 優先順位調整・リソース確認 |
| **ActionItem→TODO** | タスク分解 + スケジュール | 日程調整・実行判断 |
| **メッセージ** | 文面3パターン | トーン確認・微調整・送信判断 |

### 9.2 完全に人間判断（AI関与なし）

| 機能 | 理由 |
|------|------|
| **最終的な商談判断** | 人間関係・直感・信頼関係が決め手 |
| **価格設定** | ビジネス戦略の根幹、市場との駆け引き |
| **顧客データ入力** | 正確性が最重要、誤データ防止 |
| **契約締結** | 法的責任を伴う |
| **個人情報の取り扱い** | プライバシー保護のため |
| **採用・人事判断** | 人物評価は人間が責任を持つ |

### 9.3 設計原則

```
1. AIは「叩き台」を提供する
   - ゼロから考える負担を80%削減
   - 「何を書くか」ではなく「どう修正するか」に集中

2. 最終決定は常に人間
   - AIの提案は「参考」として明示
   - 承認ボタンで人間がコミット
   - 変更履歴で責任の所在を明確化

3. フィードバックループ
   - 採用/不採用を記録
   - 修正内容を学習データに（負例として活用）
   - 継続的な品質向上
```

### 9.4 Human-in-the-Loop 強制UI（Geminiフィードバック）

> **設計原則**
> MVV・価格・最終商談判断については、AIはあくまで「案の提示」に限定し、
> AI出力を直接システムの正式値として保存することは行わない。

```typescript
/**
 * AIが生成したテキスト（特に契約や金額に関わる箇所）が含まれる場合、
 * ユーザーが明示的に確認しないと送信できないようにする
 */
interface HumanInTheLoopGuard {
  requiresReview: boolean;
  reviewType: 'click_to_confirm' | 'edit_required' | 'scroll_to_bottom';
  warningMessage?: string;
}
```

UIガードレール例：
- 「送信」ボタンを一度無効化
- ユーザーが編集エリアをクリック（またはスクロール）しないと送信可能にならない

---

## 10. 技術実装ガイドライン

### 10.1 プロンプトテンプレート管理

```
docs/prompts/
├── sales-message.md       # セールスメッセージ生成
├── lost-deal-analysis.md  # 失注分析
├── okr-suggestion.md      # OKR提案
├── action-map-gen.md      # Action Map生成
├── task-prioritization.md # タスク優先順位
├── habit-level.md         # 習慣レベル
└── performance-summary.md # パフォーマンスサマリー
```

### 10.2 エンドポイント設計

```typescript
// 命名規則: /api/ai/{domain}/{action}
POST /api/ai/sales/generate-message
POST /api/ai/sales/analyze-lost-deals
POST /api/ai/okr/suggest
POST /api/ai/action-map/generate
POST /api/ai/cascade/kr-to-action-map      // TIER 1.5 追加
POST /api/ai/cascade/action-item-to-todos  // TIER 1.5 追加
POST /api/ai/todo/prioritize
POST /api/ai/todo/suggest-habit-level
GET  /api/ai/reports/summary

// 追加: Refinement API（Geminiフィードバック）
POST /api/ai/refine                        // 生成済みテキストの微調整
```

### 10.3 Refinement API（対話的修正）

> **設計思想（Geminiフィードバック）**
> 「生成して終わり」ではなく、対話的な修正を可能にする

```typescript
interface RefinementInput {
  originalOutput: string;
  refinementType: 'shorter' | 'longer' | 'more_formal' | 'more_casual' |
                  'more_urgent' | 'different_approach' | 'custom';
  customInstruction?: string;  // refinementType === 'custom' の場合
  context: AIRequestContext;
}

interface RefinementOutput {
  refinedText: string;
  changes: string[];  // 変更点の説明
}
```

UI プリセットボタン例：
- 「もっと短く」
- 「もっとフォーマルに」
- 「緊急度を上げて」
- 「別案を出して」

### 10.4 エラーハンドリング

```typescript
interface AIErrorResponse {
  error: {
    code: 'AI_DISABLED' | 'RATE_LIMITED' | 'CONTEXT_TOO_LARGE' |
          'API_ERROR' | 'INVALID_INPUT';
    message: string;
    retryAfter?: number;  // Rate limit時
  };
}
```

### 10.5 フィードバック収集

```typescript
interface AIFeedback {
  requestId: string;
  feature: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  appliedSuggestion: boolean;

  // 追加: 負例収集（Geminiフィードバック）
  // ユーザーがAI提案を採用せず手動で書き直した場合
  userModifiedVersion?: string;  // 修正後のテキスト
  modificationReason?: string;   // なぜ修正したか
}
```

> **負例（Negative Sample）活用**
> - ユーザーが「AIの提案を採用せず、手動で書き直して送信したデータ」を収集
> - Phase 15以降のファインチューニング用教師データとして蓄積

---

## 11. 実装順序

### 完了済み（Phase 14.6）

- ✅ AI基盤構築
  - `app/api/ai/chat/route.ts` - AI Chat Gateway
  - `app/api/ai/usage/route.ts` - AI使用量追跡 (Phase 14.6)
  - `lib/core/ai-context.ts` - コンテキスト正規化
  - `lib/server/rate-limit.ts` - レート制限 (5req/min)
  - `lib/server/ai-cost.ts` - AI コスト管理 (Phase 14.6)
  - Pino 構造化ログ統合
  - セッションキャッシュ (Vercel KV) + JOIN 最適化

### Phase 14-A: CSVインポート（AI前提条件）
- データ一括投入でAI学習データ充実

### Phase 14-B: AI設定
- ユーザー別APIキー
- AIオン/オフ
- コンテキストレベル選択

### Phase 14-C0: AI機能UI（モック）（Opusフィードバック）
> UI/UXの検証を先にすることで、プロンプト設計の修正が減る

- 各AIボタンの配置
- モーダルの流れ
- 出力プレビュー画面
- ※実際のAI呼び出しなし、ダミーデータで動作確認

### Phase 14-C: TIER 0実装（基盤構築）
1. MVV原案生成（0-1）
2. Lean Canvas生成（0-2）
3. Brand設定生成（0-3）

### Phase 14-D: TIER 1実装（収益直結）
1. セールスメッセージ生成（1-1）
2. 失注分析アシスタント（1-2）
3. OKR設定アシスタント（1-3）

### Phase 14-E: TIER 1.5実装（カスケード展開）
1. KR → Action Map展開（1.5-1）
2. Action Item → TODO展開（1.5-2）

### Phase 14-F: TIER 2実装（業務効率化）
1. Action Map自動生成（2-1）
2. タスク優先順位提案（2-2）
3. 習慣レベル提案（2-3）
4. パフォーマンスサマリー（2-4）

### Phase 14-G: 監査・ガバナンス
- 使用量追跡
- コスト管理
- フィードバック分析

---

## 12. 成功指標（KPI）

### 12.1 短期KPI（機能別）

| 機能 | 指標 | 目標 |
|------|------|------|
| MVV生成 | 採用率 | 80%以上 |
| Lean Canvas生成 | 採用率 | 75%以上 |
| Brand生成 | 採用率 | 70%以上 |
| メッセージ生成 | 採用率 | 70%以上 |
| 失注分析 | 改善提案実行率 | 50%以上 |
| OKR提案 | 採用率 | 60%以上 |
| **KR→ActionMap展開** | 採用率 | 65%以上 |
| **ActionItem→TODO展開** | 採用率 | 75%以上 |
| Action Map生成 | 修正なし採用率 | 40%以上 |
| タスク優先順位 | 提案受諾率 | 80%以上 |
| 全体 | AI機能利用率 | 週3回以上/ユーザー |

### 12.2 長期KPI（Opusフィードバック）

> **短期の「採用率」だけでなく、長期的価値の指標も追跡**

| 機能 | 短期指標 | 長期指標 |
|------|----------|----------|
| メッセージ生成 | 採用率70% | AI生成メッセージの返信率 vs 手動作成 |
| 失注分析 | 提案実行率50% | 失注率の月次推移 |
| OKR提案 | 採用率60% | AI提案OKRの達成率 vs 手動設定 |
| パフォーマンスサマリー | 利用率 | ユーザー継続率・定着率 |

---

## 13. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| ハルシネーション | 誤った提案 | 人間レビュー必須、ファクトチェック |
| ブランドトーン違反 | 不適切なメッセージ | wordsAvoid検証、プレビュー必須 |
| 過度な依存 | 思考力低下 | 「参考」として位置づけ、最終判断は人間 |
| コスト超過 | 予算オーバー | ユーザー別クォータ、使用量可視化 |
| PII漏洩 | プライバシー違反 | 既存sanitizeForAI活用、監査ログ |

---

**本設計書はPhase 14実装の基盤となる。実装時は本ドキュメントを参照のこと。**
