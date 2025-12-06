# 📘 Performance Specification v1.3

制定日: 2025-11-16
改訂日: 2025-12-02（Phase 14.35 対応）
対象バージョン: Founders Direct Cockpit v2.7.1+
適用範囲: 全フェーズ／全開発者／全AIエージェント

## 1. Purpose（目的）
本ドキュメントは、Founders Direct Cockpit（FDC）の性能・応答性・可用性に関する公式な基準点を示す。Phase 9 以降に実施されるすべての機能追加・改修は、本書に定める目標値を満たすことを前提条件とし、計測結果と影響範囲をレポートの一部として提出しなければならない。

本仕様は B2B SaaS としての品質維持を目的とし、今後のスケールアウトや暗号化ワークロードを前提にした「測定→改善→承認」の共通言語を提供する。人間・AI を問わず、開発者は本書を常に参照し、逸脱があった場合は速やかに是正措置を講じること。

## 2. Performance Targets（性能目標値）
下表の P95 指標は Phase 14 および DEVELOPMENT.md における性能承認の基準値である。いずれもブラウザ計測／サーバーログ双方で検証し、達成できない場合は改善計画を提出する。

| 区分     | 指標                                | 基準                       | Phase 14 状況 |
|----------|-------------------------------------|----------------------------|-----------------|
| UI 操作  | 初回 Dashboard 表示                 | P95 < 2.0 秒               | ✅ 達成 |
| UI 操作  | タブ切替（Dash/Leads/Clients/Reports） | P95 < 1.2 秒           | ✅ 達成 |
| UI 操作  | Workspace 切替                      | P95 < 2.2 秒               | ✅ 達成 |
| API      | GET 系                              | P95 < 350ms                | ✅ 達成 |
| API      | POST/PUT 系                         | P95 < 450ms                | ✅ 達成（楽観的ロック込み） |
| API      | 重処理（レポート生成）              | P95 < 800ms（最大 1.2s）   | ✅ 達成 |
| API      | AI チャット (POST /api/ai/chat)     | P95 < 3.0s（ストリーミング開始） | ✅ 達成 |
| API      | CSVインポート                       | P95 < 2.0s（1000行以下）   | ✅ 達成（Phase 14.1） |
| API      | CSVエクスポート                     | P95 < 1.5s                 | ✅ 達成（Phase 14.1） |
| 暗号化   | Workspace 復号                      | P95 < 280ms                | ✅ 達成 |
| 暗号化   | 保存時暗号化                        | P95 < 180ms                | ✅ 達成 |
| 圧縮     | Gzip 圧縮（保存時）                 | P95 < 100ms                | ✅ 達成 |
| 圧縮     | Gzip 解凍（読込時）                 | P95 < 80ms                 | ✅ 達成 |
| データ   | workspace_data JSON（非圧縮）       | 1 Workspace 250KB 以下     | ✅ 現行 |
| データ   | workspace_data JSON（圧縮後）       | 1 Workspace 125KB 以下目標 | ✅ 達成（50-70%削減） |
| 同時接続 | 同時ユーザー数                      | 100人                      | ✅ 達成（Phase 14.2） |
| Lighthouse | Performance スコア                | 85+                        | ✅ 達成 |
| Lighthouse | Accessibility スコア              | 95+                        | ✅ 達成 |

## 3. Metrics Definition（メトリクス定義）

### 3.1 Percentile & Window
- **P95 定義**: 対象期間に発生した本番リクエストの 95% が基準値未満であること。
- **集計期間**: 直近 7 日間のローリングウィンドウ。
- **測定対象**:
  - UI 操作系: ブラウザ側から見たエンドツーエンド時間（ネットワーク往復 + サーバー処理 + レンダリング完了まで）。
  - API 系: サーバー側で計測した処理時間（API Gateway → アプリケーション → DB）。
- **集計方法**: Vercel Analytics / Chrome DevTools / Lighthouse / Prisma Query Logging のいずれかでログを取得し、7 日間の P95 を算出して提出する。

### 3.2 Error Rate（エラーレート）
- 月間 5xx エラー率: 全 API リクエストに対し **0.5% 未満**。
- 月間 4xx エラー率: 全 API リクエストに対し **3% 未満**（意図したバリデーションエラーは含むが、BOT やスキャナのアクセスは除外）。

### 3.3 Availability（可用性）
- 月間稼働率（計画メンテナンス除く）: **99.5% 以上**。
- 稼働率とは「ユーザーが主要機能（Dashboard / Leads / Clients / Reports / Workspace 切替）にアクセスできる状態」を指し、SaaS 運用上の SLA として扱う。

### 3.4 Capacity & Load Assumptions（想定負荷）
- 想定負荷条件（例）:
  - 同時接続ユーザー数 100
  - 平均 RPS（全体）20
- 上記負荷条件下で、本章の P95 目標値を満たすことを性能設計の目安とする。

## 4. Frontend Performance Guidelines
- **初回ロード時バンドルサイズ**: gzipped 後 1.0MB 以下を推奨（将来的なコードスプリット・分割ロードを前提に定期的に監査する）。
- **UX 指標**: First Contentful Paint（FCP）を標準的なネットワーク環境で 3 秒以内に収める。FCP が超過する場合は遅延ロードやプリフェッチ戦略を検討する。

## 5. Phase 9.8 Performance Considerations（Phase 9.8 性能考慮事項）

### 5.1 AI API のパフォーマンス

**POST /api/ai/chat**（Phase 9.8-B 実装完了）
- **レート制限**: 5req/min（厳格）
- **ストリーミング開始**: P95 < 3.0秒
  - OpenAI API への接続確立時間を含む
  - ネットワーク遅延の影響を受けるため、タイムアウトは10秒に設定
- **トークン処理**: ユーザー側でコンテキストを制御し、過剰な送信を防ぐ
- **監査ログ**: 非同期記録により、レスポンス時間への影響を最小化

### 5.2 楽観的ロック（Optimistic Locking）

**Phase 9.8-A で導入予定**
- `workspace_data` に `version` カラム追加済み
- 更新時の CAS（Compare-And-Swap）チェックによるオーバーヘッド: 推定 5-10ms
- 競合発生時（409 Conflict）: クライアント側で解決UIを表示
- パフォーマンス影響: POST/PUT 系 API に +10ms 程度の遅延を想定

### 5.3 データ圧縮（Compression）

**Phase 9.8-A で実装予定**
- **圧縮アルゴリズム**: Gzip (CompressionStream API)
- **圧縮率目標**: 50%削減（250KB → 125KB）
- **圧縮処理時間**: P95 < 100ms（クライアント側）
- **解凍処理時間**: P95 < 80ms（クライアント側）
- **フォールバック**: 既存の非圧縮データとの互換性を維持

### 5.4 DB接続方式の二重化（Phase 9 完了）

**Transaction Pooler vs Direct Connection**
- API routes: Transaction Pooler（port 6543）→ 高速だが機能制限あり
- マイグレーション: Direct Connection（port 5432）→ フル機能だが接続数制限
- パフォーマンス影響: Transaction Pooler使用時は接続確立時間が50%削減

## 6. Review & Revision Policy（見直し条件）
以下のいずれかに該当した場合、本 Performance Specification v1.x をアップデートし、次版として公開する。
- ワークスペース数が 100 を超えた場合
- 1 Workspace あたりのレコード件数が平均 1 万件を超えた場合
- ユーザーアンケートや運用ログで「重い／遅い」フィードバックが一定数発生した場合
- AI API の利用率が全リクエストの30%を超えた場合（Phase 9.8-B 追加）
- データ圧縮導入後、解凍時間が P95 目標を超過した場合（Phase 9.8-A 追加）

見直し時には、最新の運用実績とロード想定を反映した性能目標を再定義し、Phase RUNBOOK および HOW-TO-DEVELOP.md に反映させる。

## 7. Revision History（改訂履歴）

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-11-16 | 初版制定（Phase 9 完了時点） |
| v1.1 | 2025-01-24 | Phase 9.8 対応（AI API、楽観的ロック、データ圧縮の性能目標追加） |
| v1.2 | 2025-11-27 | Phase 9.97 対応（全目標達成確認、Lighthouse スコア追加） |
| v1.3 | 2025-12-02 | Phase 14 対応（CSVインポート/エクスポート、同時接続100人対応追加） |

## Phase 9.93: バンドル削減目標

### 初期バンドルサイズ目標

| フェーズ | 目標 | 手法 | 測定方法 |
|---------|------|------|---------|
| Phase 9.92 完了時 | ベースライン計測 | - | `npm run build` 出力 |
| Phase 9.93 完了時 | **30% 削減** | `next/dynamic` + コード分割 | Lighthouse Performance |

### Lighthouse Performance 目標

- **Phase 9.93 DOD**: スコア 80 以上
- **測定条件**: デスクトップ、本番ビルド
- **重点指標**:
  - First Contentful Paint (FCP): < 1.8s
  - Largest Contentful Paint (LCP): < 2.5s
  - Total Blocking Time (TBT): < 200ms

### 対象タブ別の優先度

| タブ | 現状想定サイズ | 削減優先度 | 手法 |
|------|-------------|-----------|------|
| Reports | 大（グラフライブラリ） | 高 | `next/dynamic` |
| ZoomScript | 大（動画プレビュー） | 高 | `next/dynamic` |
| Templates | 中（エディタ） | 中 | `next/dynamic` |
| LeanCanvas | 中（キャンバス描画） | 中 | `next/dynamic` |
| Dashboard | 小 | 低 | RSC化検討（Phase 10） |

### 測定スクリプト

```bash
# ビルドサイズ測定
npm run build | grep -A 20 "Route"

# Lighthouse測定
npx lighthouse https://app.foundersdirect.jp/dashboard --only-categories=performance --output=html --output-path=./lighthouse-report.html
```

**参照**: `docs/TECH-DEBT-INVENTORY.md`, `docs/PHASE9.93-BUGFIX-RUNBOOK.md` セクション 2.5.1

---

## 8. 負荷テスト計画

### 8.1 負荷テスト目標

| テスト種別 | 目的 | 実施頻度 |
|-----------|------|---------|
| スモークテスト | 基本機能の動作確認 | リリース毎 |
| 負荷テスト | 通常負荷での性能確認 | 月次 |
| ストレステスト | 限界性能の確認 | 四半期 |
| スパイクテスト | 急激な負荷増への耐性確認 | 半期 |

### 8.2 負荷シナリオ

**シナリオ A: 通常負荷**
- 同時ユーザー: 50人
- リクエスト/秒: 20 RPS
- 継続時間: 30分

**シナリオ B: ピーク負荷**
- 同時ユーザー: 100人
- リクエスト/秒: 50 RPS
- 継続時間: 15分

**シナリオ C: ストレス負荷**
- 同時ユーザー: 200人
- リクエスト/秒: 100 RPS
- 継続時間: 10分

### 8.3 テストシナリオ（ユーザーフロー）

```
1. ログイン
2. Dashboard 表示
3. Leads タブ表示
4. リード詳細表示 × 3
5. Clients タブ表示
6. Reports タブ表示
7. レポート生成
8. Workspace 切り替え
9. ログアウト
```

### 8.4 成功基準

| 指標 | 通常負荷 | ピーク負荷 | ストレス負荷 |
|------|---------|----------|------------|
| API P95 | < 350ms | < 500ms | < 1000ms |
| エラー率 | < 0.1% | < 0.5% | < 1% |
| スループット | > 20 RPS | > 40 RPS | > 80 RPS |

### 8.5 負荷テストツール

**推奨ツール:**
- k6 (Grafana Labs) - スクリプトベースの負荷テスト
- Artillery - Node.js ベースの負荷テスト

**k6 サンプルスクリプト:**

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // ランプアップ
    { duration: '5m', target: 50 },  // 定常負荷
    { duration: '2m', target: 0 },   // ランプダウン
  ],
  thresholds: {
    http_req_duration: ['p(95)<350'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://app.foundersdirect.jp/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 350ms': (r) => r.timings.duration < 350,
  });
  sleep(1);
}
```

### 8.6 負荷テスト実施手順

1. テスト環境の準備（本番相当 or Staging）
2. ベースラインの計測
3. 負荷テストスクリプトの実行
4. 結果の収集・分析
5. ボトルネックの特定
6. 改善・再テスト
7. レポート作成

---

## 9. データ増加計画

### 9.1 現在のデータ量

| テーブル | 現在のレコード数 | 平均レコードサイズ |
|---------|----------------|------------------|
| users | ~100 | 1KB |
| workspaces | ~50 | 0.5KB |
| workspace_data | ~50 | 50-250KB |
| audit_logs | ~10,000 | 0.5KB |

### 9.2 成長予測

| 期間 | ユーザー数 | ワークスペース数 | データ量 |
|------|----------|----------------|---------|
| 現在 | 100 | 50 | 15MB |
| 6ヶ月後 | 500 | 250 | 75MB |
| 1年後 | 1,000 | 500 | 150MB |
| 2年後 | 5,000 | 2,500 | 750MB |

### 9.3 スケーリング戦略

**Phase 1: 垂直スケーリング（現在〜1年）**
- Supabase Pro プランで十分
- DB: 8GB RAM, 100GB ストレージ

**Phase 2: 水平スケーリング準備（1年〜）**
- Read Replica の導入検討
- データパーティショニングの設計
- キャッシュ層の強化

### 9.4 データアーカイブ戦略

| データ種別 | アクティブ期間 | アーカイブ条件 | 保持期間 |
|-----------|--------------|---------------|---------|
| audit_logs | 90日 | 90日超過 | 2年（冷ストレージ） |
| workspace_data | 無期限 | 解約後 | 90日 |
| sessions | 7日 | 期限切れ | 即時削除 |

**アーカイブ手順:**

```sql
-- 90日以上前の監査ログをアーカイブテーブルに移動
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- 元テーブルから削除
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 9.5 アラート閾値

| メトリクス | Warning | Critical | 対応 |
|-----------|---------|----------|------|
| DB ストレージ使用率 | 70% | 90% | ストレージ拡張 |
| テーブル行数（audit_logs） | 100万 | 500万 | アーカイブ実行 |
| クエリ実行時間 P95 | 100ms | 500ms | クエリ最適化 |
| 接続プール使用率 | 70% | 90% | プール拡張 |

---

## 10. 性能監視ダッシュボード

### 10.1 主要メトリクス

| メトリクス | データソース | 更新頻度 |
|-----------|-------------|---------|
| API レスポンスタイム P95 | Vercel Analytics | リアルタイム |
| エラー率 | Vercel Analytics | リアルタイム |
| Lighthouse スコア | 手動計測 | 週次 |
| DB クエリ実行時間 | Supabase Dashboard | リアルタイム |
| バンドルサイズ | CI/CD | リリース毎 |

### 10.2 レポーティング

**週次レポート項目:**
- API P95 レスポンスタイム（週平均）
- エラー率（週平均）
- ピーク時のパフォーマンス
- 性能改善・劣化のトレンド

**月次レポート項目:**
- 全性能目標の達成状況
- 負荷テスト結果（実施時）
- キャパシティ予測
- 改善アクションアイテム
