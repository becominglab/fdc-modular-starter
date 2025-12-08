# FDC Modular Starter

Founders Direct Cockpit の学習用ミニマルスターターキットです。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 + App Router |
| UI | React 19 |
| 言語 | TypeScript 5.x (strict mode) |
| Node.js | 22.x |

## クイックスタート

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# http://localhost:3000 でアクセス
# パスワード: fdc
```

## フォルダ構造

```
founders-direct-modular/
├── app/ .................... Next.js App Router
├── components/ ............. UIコンポーネント
│   └── landing/ ............ ランディングページ ⭐NEW
│       ├── default/ ........ デフォルトLP（カスタマイズベース）
│       └── shared/ ......... 共通コンポーネント
├── lib/ .................... 共通ライブラリ
├── public/ ................. 静的ファイル
│   └── images/ ............. LP用画像
├── docs/ ................... ドキュメント
│   ├── FDC-MODULAR-GUIDE.md  メインガイド
│   ├── FDC-CORE.md ......... 開発コアガイド ⭐
│   ├── guides/ ............. 技術ガイド
│   └── runbooks/ ........... ランブック（Phase 0-2 同梱）
└── references/ ............. 参照ファイル（ランブック生成用）
    ├── ui/ ................. UIコンポーネント
    ├── types/ .............. 型定義
    ├── contexts/ ........... Context
    └── api/ ................ APIルート
```

## 学習の進め方

1. このスターターを起動
2. `docs/FDC-CORE.md` を読んで全体像を理解
3. `docs/runbooks/` のランブックを順番に実行
4. 各機能を自分で実装しながら学習
5. **ドキュメントを更新**（重要）

## ランブック一覧（カリキュラム準拠）

### PART 1: Foundation（基礎）Phase 0-2

| Phase | 内容 | 状態 |
|-------|------|------|
| 0 | スターター構築 | ✅ 完了 |
| 1 | タスク機能（CRUD, useReducer, localStorage） | 🔜 予定 |
| 2 | 設定ページ（フォーム, Export/Import） | 🔜 予定 |

### PART 2: Database Integration（DB統合）Phase 3-5

| Phase | 内容 | 状態 |
|-------|------|------|
| 3 | Supabase セットアップ | 📝 作成中 |
| 4 | Supabase Auth（Google OAuth） | 📝 作成中 |
| 5 | ワークスペース + ロール | 📝 作成中 |

### PART 3: CRM（顧客管理）Phase 6-8

| Phase | 内容 | 状態 |
|-------|------|------|
| 6 | リード管理（ファネル） | 📝 作成中 |
| 7 | クライアント管理 | 📝 作成中 |
| 8 | アプローチ履歴 | 📝 作成中 |

### PART 4: 3-Layer Architecture（3層構造）Phase 9-11

| Phase | 内容 | 状態 |
|-------|------|------|
| 9 | Task 4象限（Eisenhower Matrix） | 📝 作成中 |
| 10 | Action Map（戦術層） | 📝 作成中 |
| 11 | OKR（戦略層） | 📝 作成中 |

### PART 9: PWA & Landing Page（PWA & LP）Phase 23-24

| Phase | 内容 | 状態 |
|-------|------|------|
| 23 | PWA設定（manifest.json, Service Worker） | 📝 作成中 |
| 24 | ランディングページ作成 | ✅ テンプレート同梱 |

> 詳細は `docs/runbooks/README.md` を参照

## ランディングページ（LP）

このスターターには、Founders Direct Cockpitで実際に使用しているLPがテンプレートとして同梱されています。

### LP構成

```
components/landing/
├── default/                    # デフォルトLP
│   ├── LandingPage.tsx         # メインコンポーネント
│   ├── LandingPage.module.css  # スタイル
│   ├── HeroSection.tsx         # ヒーローセクション
│   ├── FeaturesSection.tsx     # 機能紹介
│   ├── PricingSection.tsx      # 料金プラン
│   └── FAQSection.tsx          # よくある質問
└── shared/                     # 共通コンポーネント
    ├── LandingHeader.tsx       # ヘッダー
    ├── LandingFooter.tsx       # フッター
    └── ContactForm.tsx         # お問い合わせフォーム
```

### LPのカスタマイズ

```bash
# Claude Code でカスタマイズ
HeroSection.tsx のキャッチコピーを変更して。
変更内容:
- メインコピー: 「あなたのビジネスを加速する」
- サブコピー: 「シンプルで使いやすいツール」
```

### 未ログイン時のLP表示

- `/` にアクセス → LP表示
- ログイン済み → ダッシュボードへ
- `app/(app)/layout.tsx` で認証チェック

## Claude Code 運用

### セッション開始時

```
このプロジェクトの開発を行います。

以下のファイルを読み込んでください:
- docs/FDC-CORE.md
- docs/guides/DEVELOPMENT.md

プロジェクトパス: /Users/5dmgmt/プラグイン/founders-direct-modular
```

### Phase 実行時

```
Phase N を実行してください。
ランブック: docs/runbooks/PHASEN-XXX.md

完了後、以下を更新してください:
1. docs/CHANGELOG.md
2. docs/FDC-CORE.md
3. package.json
```

## SaaS版との関係

```
┌─────────────────────────────────────────┐
│  FDC Modular Starter (本プロジェクト)    │
│  - ミニマル構成                          │
│  - localStorage ベース                   │
│  - 学習・プロトタイプ用                  │
└─────────────────┬───────────────────────┘
                  │ 学習後に拡張
                  ▼
┌─────────────────────────────────────────┐
│  FDC SaaS (/foundersdirect)             │
│  - フル機能（OKR / ActionMap / Task）    │
│  - Supabase PostgreSQL                  │
│  - マルチテナント対応                    │
└─────────────────────────────────────────┘
```

## コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # プロダクションビルド
npm run start      # プロダクション実行
npm run type-check # 型チェック
npm run lint       # Lint実行
```
