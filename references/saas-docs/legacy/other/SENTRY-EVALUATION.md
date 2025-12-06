# Sentry 導入検討レポート

**作成日:** 2025-11-25
**Phase:** 9.94-D
**ステータス:** 検討完了 - 導入推奨（Phase 10 で実施）

---

## 1. 概要

Sentry はリアルタイムのエラートラッキング・パフォーマンスモニタリングサービス。
本レポートでは Founders Direct Cockpit への導入可否を検討する。

---

## 2. 導入のメリット

### 2.1 エラートラッキング

| 機能 | 説明 | FDC での活用 |
|------|------|-------------|
| 自動エラー捕捉 | 未処理例外を自動検出 | API エラー、UI クラッシュの検知 |
| スタックトレース | ソースマップ連携で正確な行番号 | Next.js / React のデバッグ |
| コンテキスト情報 | ユーザー/セッション情報 | ワークスペース/ロール別の問題分析 |
| アラート | Slack/Email 通知 | 本番障害の即時検知 |

### 2.2 パフォーマンスモニタリング

| 機能 | 説明 | FDC での活用 |
|------|------|-------------|
| トランザクション追跡 | API レスポンスタイム | Phase 10/11/12 のパフォーマンス監視 |
| Web Vitals | LCP/FID/CLS | Lighthouse と併用した継続監視 |
| リリース追跡 | バージョン別の問題分析 | デプロイ後の問題検知 |

### 2.3 Next.js 統合

- `@sentry/nextjs` による簡単セットアップ
- Server Components / Server Actions 対応
- Vercel との統合
- ソースマップ自動アップロード

---

## 3. コスト分析

### 3.1 プラン比較

| プラン | 月額 | エラー数 | ユーザー数 | 推奨 |
|--------|------|---------|-----------|------|
| Developer | $0 | 5,000/月 | 1 | 開発初期 |
| Team | $26 | 50,000/月 | 無制限 | **Phase 10+ 推奨** |
| Business | $80 | 100,000/月 | 無制限 | 将来検討 |

### 3.2 FDC の想定エラー数

| 環境 | 月間アクティブユーザー | 想定エラー数/月 |
|------|----------------------|----------------|
| 開発 | 5 | 100-500 |
| 本番（初期） | 10-50 | 500-2,000 |
| 本番（成長期） | 100-500 | 2,000-10,000 |

**結論:** Developer プランで開始し、ユーザー増加に応じて Team プランへ移行

---

## 4. 実装計画

### 4.1 Phase 10 での導入手順

```bash
# 1. パッケージインストール
npm install @sentry/nextjs

# 2. Sentry CLI 設定
npx @sentry/wizard@latest -i nextjs
```

### 4.2 必要な設定ファイル

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### 4.3 Vercel 環境変数

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=foundersdirect
SENTRY_PROJECT=fdc
```

---

## 5. 代替案との比較

| サービス | メリット | デメリット | 採用可否 |
|---------|---------|-----------|---------|
| **Sentry** | Next.js 統合、豊富な機能 | 有料（本格運用時） | **推奨** |
| Vercel Analytics | 無料（Pro プラン） | エラートラッキングなし | 補完的に使用 |
| LogRocket | セッションリプレイ | 高コスト | 不採用 |
| Datadog | 統合監視 | 高コスト、過剰機能 | 不採用 |
| 自前ロギング | 無料 | 開発コスト大 | 不採用 |

---

## 6. 判断

### 6.1 結論

**導入推奨（Phase 10 で実施）**

### 6.2 理由

1. **無料プランで開始可能** - 開発初期のコストなし
2. **Next.js との高い親和性** - セットアップが容易
3. **Phase 10/11/12 の品質保証** - 新機能開発時のエラー検知が重要
4. **Vercel との統合** - 既存インフラと連携

### 6.3 実施タイムライン

| 時期 | 内容 |
|------|------|
| Phase 9.94 | 導入検討完了（本レポート） |
| Phase 10 初期 | Sentry アカウント作成、Developer プランで開始 |
| Phase 10 中盤 | クライアント/サーバー設定、ソースマップ連携 |
| Phase 11 | パフォーマンスモニタリング有効化 |
| Phase 12 | 本番運用開始、必要に応じて Team プランへ |

---

## 7. 未決定事項

1. **Sentry 組織名** - `foundersdirect` で良いか
2. **プロジェクト名** - `fdc` で良いか
3. **サンプリングレート** - 本番 10% で十分か
4. **アラート通知先** - Slack チャンネル

---

**最終更新:** 2025-11-25
**結論:** Phase 10 で導入を実施
