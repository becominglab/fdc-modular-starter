# 障害対応・インシデント対応手順書

**Version:** 1.0
**制定日:** 2025-12-02
**適用範囲:** Founders Direct Cockpit 運用チーム

---

## 1. インシデント分類

### 1.1 重要度定義

| レベル | 名称 | 定義 | 例 |
|--------|------|------|-----|
| **P1** | Critical | 全サービス停止、データ損失、セキュリティ侵害 | DB停止、認証不可、不正アクセス |
| **P2** | High | 主要機能の停止、多数ユーザーに影響 | Dashboard表示不可、API全断 |
| **P3** | Medium | 一部機能の障害、限定的な影響 | レポート生成失敗、特定APIエラー |
| **P4** | Low | 軽微な不具合、回避策あり | UI表示崩れ、非クリティカルなエラー |

### 1.2 対応時間目標

| レベル | 初期対応 | 状況報告 | 解決目標 |
|--------|---------|---------|---------|
| P1 | 15分 | 30分毎 | 1時間 |
| P2 | 30分 | 1時間毎 | 4時間 |
| P3 | 2時間 | 4時間毎 | 8時間 |
| P4 | 24時間 | 日次 | 72時間 |

---

## 2. 障害対応フロー

### 2.1 全体フロー

```
┌─────────────────┐
│  1. 検知        │  監視アラート / ユーザー報告 / 内部発見
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. トリアージ   │  重要度判定、影響範囲確認
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. 封じ込め    │  被害拡大防止（ロールバック等）
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. 調査        │  原因特定、ログ分析
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. 復旧        │  サービス回復
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. 事後対応    │  レポート作成、再発防止策
└─────────────────┘
```

### 2.2 Phase 1: 検知

**アラート受信時のアクション:**

```bash
# 1. Vercel ログ確認
vercel logs --prod | tail -100

# 2. エラーログ抽出
vercel logs --prod | grep -i "error\|exception\|fatal"

# 3. ヘルスチェック
curl -I https://app.foundersdirect.jp/api/health
```

**ユーザー報告受信時:**
1. 報告内容を記録（日時、症状、ユーザー情報）
2. 再現確認を試みる
3. 影響範囲を確認

### 2.3 Phase 2: トリアージ

**確認項目チェックリスト:**

- [ ] 影響を受けているユーザー数は？
- [ ] 影響を受けている機能は？
- [ ] いつから発生している？
- [ ] 直近のデプロイはあったか？
- [ ] 外部サービス（Google、Supabase）の障害情報は？

**重要度判定フローチャート:**

```
全サービス停止？
├── Yes → P1
└── No
    主要機能停止？
    ├── Yes → P2
    └── No
        複数ユーザーに影響？
        ├── Yes → P3
        └── No → P4
```

### 2.4 Phase 3: 封じ込め

**即時対応オプション:**

| 状況 | 対応 | コマンド |
|------|------|---------|
| デプロイ後の障害 | ロールバック | `vercel rollback <deployment-id>` |
| 特定APIの問題 | API無効化 | 環境変数で機能フラグOFF |
| DB負荷過大 | レート制限強化 | 設定変更→再デプロイ |
| セキュリティ侵害 | サービス停止 | `vercel remove --yes` |

**ロールバック手順:**

```bash
# 1. デプロイメント一覧を確認
vercel ls

# 2. 前回の正常なデプロイIDを確認
vercel inspect <deployment-url>

# 3. ロールバック実行
vercel rollback <deployment-id>

# 4. 確認
vercel logs --prod | tail -20
```

### 2.5 Phase 4: 調査

**ログ収集:**

```bash
# Vercel ログ（直近1時間）
vercel logs --prod --since 1h > incident_logs.txt

# エラーのみ抽出
vercel logs --prod --since 1h | grep -E "error|Error|ERROR" > errors.txt

# 特定エンドポイントのログ
vercel logs --prod | grep "/api/auth" > auth_logs.txt
```

**データベース確認:**

```sql
-- 最新のエラーログ（audit_logs テーブル）
SELECT * FROM audit_logs
WHERE action LIKE '%error%'
ORDER BY created_at DESC
LIMIT 50;

-- セッション状態確認
SELECT COUNT(*), status
FROM sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

**外部サービス状況確認:**

| サービス | ステータスページ |
|---------|----------------|
| Vercel | https://www.vercel-status.com/ |
| Supabase | https://status.supabase.com/ |
| Google Cloud | https://status.cloud.google.com/ |
| OpenAI | https://status.openai.com/ |

### 2.6 Phase 5: 復旧

**復旧確認チェックリスト:**

- [ ] `/api/health` が 200 を返す
- [ ] ログイン機能が動作する
- [ ] Dashboard が表示される
- [ ] データの読み書きが可能
- [ ] エラーログが減少している

**復旧完了の判断基準:**
- 5分間連続でエラーなし
- ヘルスチェックが3回連続成功
- ユーザーからの報告が停止

### 2.7 Phase 6: 事後対応

**インシデントレポート作成:**

```markdown
# インシデントレポート

## 概要
- インシデントID: INC-YYYYMMDD-XXX
- 発生日時: YYYY/MM/DD HH:MM
- 復旧日時: YYYY/MM/DD HH:MM
- 影響時間: XX分
- 重要度: P1/P2/P3/P4

## 影響範囲
- 影響ユーザー数: XX人
- 影響機能: [機能名]

## タイムライン
| 時刻 | イベント |
|------|---------|
| HH:MM | 障害検知 |
| HH:MM | 初期対応開始 |
| HH:MM | 原因特定 |
| HH:MM | 復旧完了 |

## 根本原因
[原因の詳細説明]

## 対応内容
[実施した対応の詳細]

## 再発防止策
1. [対策1]
2. [対策2]

## 担当者
- 初期対応: [名前]
- 調査: [名前]
- 復旧: [名前]
```

---

## 3. エスカレーションマトリクス

### 3.1 連絡体制

| 役割 | 担当 | 連絡先 | 通知タイミング |
|------|------|--------|---------------|
| 一次対応 | オンコール担当 | Slack #alerts | 即時 |
| 二次対応 | 開発リーダー | 電話 | P1/P2発生時 |
| 三次対応 | CTO | 電話 | P1発生時 or 1時間未解決 |
| 経営報告 | CEO | メール | P1発生時 |

### 3.2 通知テンプレート

**初期通知（Slack）:**
```
🚨 【障害発生】{重要度}

発生時刻: {時刻}
症状: {症状の概要}
影響範囲: {影響範囲}
担当者: {担当者名}
対応状況: 調査中

次回更新: {時刻}
```

**解決通知（Slack）:**
```
✅ 【障害解決】{インシデントID}

解決時刻: {時刻}
影響時間: {XX分}
原因: {原因の概要}
対応: {対応内容}

詳細レポートは後日共有します。
```

---

## 4. 障害パターン別対応

### 4.1 認証障害

**症状:** ログインできない、セッションが無効

**確認手順:**
```bash
# Supabase Auth 状態確認
curl -I https://xxx.supabase.co/auth/v1/health

# セッションテーブル確認
SELECT * FROM sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 10;
```

**対応:**
1. Google OAuth ステータス確認
2. Supabase Auth ステータス確認
3. セッション Cookie の有効期限確認
4. 必要に応じてセッションテーブルをクリア

### 4.2 データベース障害

**症状:** API が 500 エラー、データ取得失敗

**確認手順:**
```bash
# DB 接続確認
psql $DATABASE_URL -c "SELECT 1"

# 接続数確認
SELECT count(*) FROM pg_stat_activity;
```

**対応:**
1. Supabase ダッシュボードで状態確認
2. 接続プール設定の確認
3. 必要に応じて接続をリセット

### 4.3 パフォーマンス劣化

**症状:** レスポンスが遅い、タイムアウト

**確認手順:**
```bash
# API レスポンス時間確認
curl -w "%{time_total}\n" -o /dev/null -s https://app.foundersdirect.jp/api/health

# Vercel Functions ログ
vercel logs --prod | grep "duration"
```

**対応:**
1. 負荷の原因特定（特定API、特定ユーザー）
2. レート制限の強化
3. 問題のあるクエリの最適化

### 4.4 セキュリティインシデント

**症状:** 不正アクセス、データ漏洩の疑い

**即時対応:**
1. **封じ込め** - 該当アカウントの無効化
2. **証拠保全** - ログの保存
3. **報告** - security@5dmgmt.com に即時報告

**調査項目:**
```sql
-- 不審なアクセスログ
SELECT * FROM audit_logs
WHERE user_id = {suspicious_user_id}
ORDER BY created_at DESC;

-- 失敗したログイン試行
SELECT * FROM audit_logs
WHERE action = 'login_failed'
AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 5. 定期訓練

### 5.1 訓練スケジュール

| 訓練種別 | 頻度 | 参加者 |
|---------|------|--------|
| 机上訓練（シナリオ検討） | 四半期 | 開発チーム |
| ロールバック訓練 | 月次 | 開発チーム |
| フルスケール障害訓練 | 年次 | 全社 |

### 5.2 訓練シナリオ例

1. **シナリオA:** デプロイ後の全面障害
2. **シナリオB:** データベース接続不可
3. **シナリオC:** セキュリティ侵害の検知
4. **シナリオD:** サードパーティサービス障害

---

## 6. ツール・リソース

### 6.1 監視ツール

| ツール | 用途 | URL |
|--------|------|-----|
| Vercel Analytics | パフォーマンス監視 | Vercel Dashboard |
| Vercel Logs | ログ確認 | `vercel logs --prod` |
| Supabase Dashboard | DB 監視 | Supabase Dashboard |

### 6.2 コミュニケーション

| チャネル | 用途 |
|---------|------|
| Slack #alerts | 障害アラート |
| Slack #incidents | 障害対応コミュニケーション |
| 電話 | P1 エスカレーション |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-02 | 初版制定 |

---

**次回レビュー予定:** 2026-03-02
