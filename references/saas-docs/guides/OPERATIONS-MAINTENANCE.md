# 運用・保守手順書

**Version:** 1.0
**制定日:** 2025-12-02
**適用範囲:** Founders Direct Cockpit 運用チーム

---

## 1. 運用体制

### 1.1 運用スケジュール

| 項目 | 時間帯 | 担当 |
|------|--------|------|
| サービス稼働時間 | 24時間365日 | 自動（Vercel） |
| 通常監視 | 平日 9:00-18:00 JST | 開発チーム |
| オンコール対応 | 24時間365日 | ローテーション |
| 定期メンテナンス | 火曜 02:00-05:00 JST | 開発チーム |

### 1.2 役割と責任

| 役割 | 責任範囲 |
|------|---------|
| **運用管理者** | 運用全体の統括、エスカレーション判断 |
| **開発エンジニア** | 障害対応、リリース作業、監視 |
| **オンコール担当** | 時間外の初期対応、エスカレーション |
| **セキュリティ担当** | セキュリティインシデント対応 |

---

## 2. 日次運用タスク

### 2.1 朝のチェック（9:00）

```bash
# 1. ヘルスチェック
curl -s https://app.foundersdirect.jp/api/health | jq

# 2. 前日のエラーログ確認
vercel logs --prod --since 24h | grep -i "error" | head -20

# 3. デプロイメント状態確認
vercel ls | head -5

# 4. Supabase ダッシュボード確認
# - DB 接続数
# - ストレージ使用量
# - API リクエスト数
```

### 2.2 チェック項目

| 項目 | 確認方法 | 正常値 |
|------|---------|--------|
| ヘルスチェック | `/api/health` | 200 OK |
| エラー率 | Vercel Analytics | < 1% |
| レスポンスタイム P95 | Vercel Analytics | < 500ms |
| DB 接続数 | Supabase Dashboard | < 80% |
| ストレージ使用量 | Supabase Dashboard | < 80% |

### 2.3 日次レポート項目

```markdown
# 日次運用レポート YYYY/MM/DD

## サービス状態
- 稼働状況: 正常 / 一部障害 / 障害中
- ヘルスチェック: OK / NG

## メトリクス
- エラー率: X.X%
- API レスポンス P95: Xms
- アクティブユーザー数: XX人

## インシデント
- なし / あり（詳細：...）

## 特記事項
- （あれば記載）
```

---

## 3. 週次運用タスク

### 3.1 週次チェック（毎週月曜）

| 項目 | 確認内容 | 対応 |
|------|---------|------|
| SLA 達成状況 | 週間稼働率の確認 | 未達の場合は原因分析 |
| パフォーマンストレンド | P95 の推移 | 悪化傾向があれば調査 |
| セキュリティアラート | 不審なアクセスパターン | 必要に応じて対応 |
| ストレージ使用量 | 増加トレンド | 80%超過予測時は対策 |
| 依存関係の更新 | npm audit | 脆弱性があれば対応 |

### 3.2 セキュリティチェック

```bash
# 依存関係の脆弱性チェック
npm audit

# 高リスクの脆弱性があれば対応
npm audit fix

# 詳細レポート
npm audit --json > security_audit.json
```

---

## 4. 月次運用タスク

### 4.1 月次チェック（毎月1日）

| 項目 | 確認内容 | 成果物 |
|------|---------|--------|
| SLA レポート | 月間稼働率、インシデント数 | 月次 SLA レポート |
| バックアップ検証 | リストアテスト実施 | テスト結果レポート |
| キャパシティ計画 | リソース使用量予測 | 必要に応じて増強計画 |
| ドキュメント更新 | 運用ドキュメントの見直し | 更新されたドキュメント |

### 4.2 バックアップリストアテスト

```bash
# 1. テスト用 DB に接続
export TEST_DB_URL="postgresql://..."

# 2. 最新バックアップをリストア
pg_restore -h localhost -d test_db -v latest_backup.dump

# 3. データ整合性確認
psql $TEST_DB_URL -c "SELECT COUNT(*) FROM users;"
psql $TEST_DB_URL -c "SELECT COUNT(*) FROM workspaces;"
psql $TEST_DB_URL -c "SELECT COUNT(*) FROM workspace_data;"

# 4. テスト結果を記録
```

### 4.3 月次レポートテンプレート

```markdown
# 月次運用レポート YYYY年MM月

## 1. サービス稼働状況
- 月間稼働率: XX.XX%
- 計画停止時間: X時間
- 計画外停止時間: X時間

## 2. パフォーマンス
| 指標 | 目標 | 実績 | 達成 |
|------|------|------|------|
| API P95 | <350ms | Xms | ✅/❌ |
| エラー率 | <0.5% | X.X% | ✅/❌ |

## 3. インシデント
| 日付 | 概要 | 影響時間 | 対応 |
|------|------|---------|------|
| - | - | - | - |

## 4. キャパシティ
- DB ストレージ: XX GB / XX GB (XX%)
- 月間 API コール数: XX,XXX

## 5. セキュリティ
- 脆弱性検出数: X件
- 対応完了: X件
- 未対応: X件

## 6. 次月の計画
- （計画内容を記載）
```

---

## 5. 監視設定

### 5.1 監視項目

| 監視対象 | メトリクス | 閾値 (Warning) | 閾値 (Critical) |
|---------|-----------|---------------|----------------|
| ヘルスチェック | HTTP ステータス | - | != 200 |
| API レスポンス | P95 レイテンシ | > 500ms | > 1000ms |
| エラー率 | 5xx 率 | > 1% | > 5% |
| DB 接続 | アクティブ接続数 | > 80% | > 95% |
| ストレージ | 使用率 | > 70% | > 90% |

### 5.2 アラート設定

**Vercel Analytics でのアラート設定:**
1. Vercel Dashboard > Analytics > Alerts
2. 以下のアラートを設定:
   - エラー率が 1% を超えた場合
   - レスポンスタイムが 1s を超えた場合

**カスタム監視スクリプト:**

```bash
#!/bin/bash
# monitor.sh - 定期実行用監視スクリプト

HEALTH_URL="https://app.foundersdirect.jp/api/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx"

# ヘルスチェック
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$response" != "200" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 ヘルスチェック失敗: '"$HEALTH_URL"' (HTTP '"$response"')"}' \
    $SLACK_WEBHOOK
fi
```

### 5.3 ログ管理

**ログ種別と保持期間:**

| ログ種別 | 保持期間 | 保存場所 |
|---------|---------|---------|
| アプリケーションログ | 7日 | Vercel Logs |
| 監査ログ | 2年 | Supabase (audit_logs) |
| エラーログ | 30日 | Vercel Logs + 抽出保存 |
| アクセスログ | 90日 | Vercel Analytics |

**ログ抽出・保存:**

```bash
# 重要なエラーログを抽出して保存
vercel logs --prod --since 7d | grep -E "error|Error|ERROR" > \
  logs/errors_$(date +%Y%m%d).log

# 圧縮してアーカイブ
gzip logs/errors_$(date +%Y%m%d).log
```

---

## 6. リリース手順

### 6.1 標準リリースフロー

```
1. 開発完了 → PR 作成
         ↓
2. コードレビュー → 承認
         ↓
3. Preview デプロイ → 動作確認
         ↓
4. main ブランチへマージ
         ↓
5. 自動 Production デプロイ
         ↓
6. デプロイ後検証
         ↓
7. リリース完了通知
```

### 6.2 リリース前チェックリスト

- [ ] `npm run type-check` 成功
- [ ] `npm run test:unit` 成功
- [ ] `npm run build` 成功
- [ ] PR レビュー完了
- [ ] Preview 環境で動作確認
- [ ] 破壊的変更がある場合は関係者に通知

### 6.3 デプロイ後チェックリスト

- [ ] `/api/health` が 200 を返す
- [ ] ログインが成功する
- [ ] Dashboard が正常表示
- [ ] 主要機能の動作確認
- [ ] エラーログに新規エラーがない
- [ ] Vercel Analytics でエラー率を確認

### 6.4 ロールバック手順

```bash
# 1. 問題のあるデプロイを特定
vercel ls

# 2. 前回の正常なデプロイにロールバック
vercel rollback <deployment-id>

# 3. ロールバック後の確認
curl -I https://app.foundersdirect.jp/api/health
vercel logs --prod | tail -20
```

---

## 7. 定期メンテナンス

### 7.1 メンテナンスウィンドウ

- **時間帯:** 火曜 02:00-05:00 JST
- **頻度:** 月1回
- **通知:** 7日前にメール通知

### 7.2 メンテナンス作業内容

| 作業 | 頻度 | 所要時間 |
|------|------|---------|
| 依存関係の更新 | 月次 | 30分 |
| セキュリティパッチ適用 | 必要時 | 30分 |
| DB メンテナンス | 四半期 | 1時間 |
| 証明書更新 | 年次 | 15分 |

### 7.3 メンテナンス手順

**1. 事前準備:**
```bash
# バックアップ確認
vercel ls | head -3  # 現在のデプロイメント確認

# 依存関係の更新確認
npm outdated
npm audit
```

**2. メンテナンス実施:**
```bash
# 依存関係の更新
npm update

# セキュリティ修正
npm audit fix

# ビルド・テスト
npm run type-check && npm run test:unit && npm run build

# デプロイ
git add package-lock.json
git commit -m "chore: update dependencies"
git push
```

**3. 事後確認:**
```bash
# デプロイ完了確認
vercel ls | head -1

# ヘルスチェック
curl -I https://app.foundersdirect.jp/api/health

# ログ確認
vercel logs --prod | tail -20
```

---

## 8. 問い合わせ対応

### 8.1 問い合わせ分類

| カテゴリ | 対応時間 | 担当 |
|---------|---------|------|
| サービス障害 | 即時 | オンコール |
| セキュリティ | 即時 | セキュリティ担当 |
| 機能の不具合 | 24時間以内 | 開発チーム |
| 使い方の質問 | 48時間以内 | サポート |
| 機能要望 | 次回レビュー | プロダクト |

### 8.2 問い合わせ対応フロー

```
問い合わせ受付
    ↓
カテゴリ分類
    ↓
担当者アサイン
    ↓
初期回答（24時間以内）
    ↓
調査・対応
    ↓
解決報告
    ↓
クローズ
```

---

## 9. ドキュメント管理

### 9.1 運用ドキュメント一覧

| ドキュメント | 場所 | 更新頻度 |
|-------------|------|---------|
| 運用・保守手順書（本書） | `docs/guides/OPERATIONS-MAINTENANCE.md` | 四半期 |
| SLA・可用性定義書 | `docs/guides/SLA-AVAILABILITY.md` | 年次 |
| インシデント対応手順書 | `docs/guides/INCIDENT-RESPONSE.md` | 半期 |
| バックアップ・DR方針書 | `docs/guides/BACKUP-DR.md` | 年次 |
| セキュリティポリシー | `docs/guides/SECURITY.md` | 四半期 |

### 9.2 ドキュメント更新ルール

1. 運用手順に変更があった場合は即時更新
2. 四半期ごとに全ドキュメントをレビュー
3. 変更履歴を必ず記録
4. レビュー完了後に次回レビュー日を設定

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-02 | 初版制定 |

---

**次回レビュー予定:** 2026-03-02
