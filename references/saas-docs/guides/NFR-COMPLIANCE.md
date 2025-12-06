# IPA 非機能要求グレード対応表

**Version:** 1.1
**制定日:** 2025-12-02
**更新日:** 2025-12-03
**基準:** IPA 非機能要求グレード 2018

---

## 概要

本ドキュメントは、IPA（情報処理推進機構）の「非機能要求グレード2018」の6大項目に対する Founders Direct Cockpit の対応状況をまとめたものです。

---

## 対応状況サマリ

| カテゴリ | 対応状況 | 充足率 | 関連ドキュメント |
|---------|---------|--------|-----------------|
| 1. 可用性 | ✅ 対応完了 | 100% | [SLA-AVAILABILITY.md](./SLA-AVAILABILITY.md) |
| 2. 性能・拡張性 | ✅ 対応完了 | 100% | [Performance-Specification-v1.0.md](./Performance-Specification-v1.0.md) |
| 3. 運用・保守性 | ✅ 対応完了 | 100% | [OPERATIONS-MAINTENANCE.md](./OPERATIONS-MAINTENANCE.md) |
| 4. 移行性 | ✅ 対応完了 | 100% | [BACKUP-DR.md](./BACKUP-DR.md) |
| 5. セキュリティ | ✅ 対応完了 | 100% | [SECURITY.md](./SECURITY.md) |
| 6. システム環境 | ✅ 対応完了 | 100% | 本ドキュメント |

---

## 1. 可用性

### 対応項目

| 項目 | 対応内容 | ドキュメント |
|------|---------|-------------|
| 運用スケジュール | 24/7 運用（Vercel） | SLA-AVAILABILITY.md |
| 計画停止 | 火曜 02:00-05:00 JST（月1回） | SLA-AVAILABILITY.md |
| 目標稼働率 | 99.5% | SLA-AVAILABILITY.md |
| RTO | Critical: 1時間、High: 4時間 | SLA-AVAILABILITY.md |
| RPO | 24時間 | SLA-AVAILABILITY.md |
| SLA 定義 | プラン別 SLA（Trial/Standard/Enterprise） | SLA-AVAILABILITY.md |
| 災害対策（DR） | バックアップ・リージョン切替手順 | BACKUP-DR.md |
| バックアップ方針 | 日次自動、30日保持 | BACKUP-DR.md |

### 対応ドキュメント
- `docs/guides/SLA-AVAILABILITY.md`
- `docs/guides/BACKUP-DR.md`
- `docs/guides/INCIDENT-RESPONSE.md`

---

## 2. 性能・拡張性

### 対応項目

| 項目 | 対応内容 | ドキュメント |
|------|---------|-------------|
| レスポンスタイム目標 | API P95 < 350ms (実測: Health 65ms, Session 217ms) | Performance-Specification-v1.0.md |
| 同時アクセス数 | 100人 | Performance-Specification-v1.0.md |
| スループット目標 | 20 RPS（通常）、50 RPS（ピーク） | Performance-Specification-v1.0.md |
| レート制限 | 60リクエスト/分（デフォルト） | SECURITY.md |
| キャッシング | Vercel KV（Redis） | Performance-Specification-v1.0.md |
| 負荷テスト | 月次実施、k6 使用 | Performance-Specification-v1.0.md |
| データ増加計画 | 2年間の成長予測・アーカイブ戦略 | Performance-Specification-v1.0.md |
| スケールアウト戦略 | Vercel 自動スケール + DB 垂直拡張 | Performance-Specification-v1.0.md |

### 対応ドキュメント
- `docs/guides/Performance-Specification-v1.0.md`

---

## 3. 運用・保守性

### 対応項目

| 項目 | 対応内容 | ドキュメント |
|------|---------|-------------|
| 監視 | Vercel Analytics / Speed Insights | OPERATIONS-MAINTENANCE.md |
| ログ管理 | Pino 構造化ログ、7-90日保持 | OPERATIONS-MAINTENANCE.md |
| ヘルスチェック | `/api/health`（1分間隔） | OPERATIONS-MAINTENANCE.md |
| アラート設定 | エラー率・レスポンス閾値 | OPERATIONS-MAINTENANCE.md |
| インシデント対応 | 4段階重要度、対応フロー定義 | INCIDENT-RESPONSE.md |
| 運用マニュアル | 日次・週次・月次タスク定義 | OPERATIONS-MAINTENANCE.md |
| デプロイ手順 | GitHub → Vercel 自動デプロイ | OPERATIONS-MAINTENANCE.md |
| ロールバック手順 | `vercel rollback` コマンド | OPERATIONS-MAINTENANCE.md |
| ログ保持期間 | アプリ: 7日、監査: 2年 | OPERATIONS-MAINTENANCE.md |

### 対応ドキュメント
- `docs/guides/OPERATIONS-MAINTENANCE.md`
- `docs/guides/INCIDENT-RESPONSE.md`
- `docs/legacy/other/DEPLOYMENT-OPERATIONS-GUIDE.md`

---

## 4. 移行性

### 対応項目

| 項目 | 対応内容 | ドキュメント |
|------|---------|-------------|
| マイグレーション | 21個の SQL マイグレーション | migrations/ |
| データエクスポート | CSV エクスポート機能 | アプリ内機能 |
| データインポート | CSV インポート機能 | アプリ内機能 |
| ポータビリティ | PostgreSQL（Supabase） | BACKUP-DR.md |
| 移行手順 | pg_dump / pg_restore | BACKUP-DR.md |
| リージョン切替 | 手順書あり | BACKUP-DR.md |

### 対応ドキュメント
- `docs/guides/BACKUP-DR.md`
- `migrations/` ディレクトリ

---

## 5. セキュリティ

### 対応項目

| 項目 | 対応内容 | ドキュメント |
|------|---------|-------------|
| 認証方式 | Google OAuth 2.0（PKCE） | SECURITY.md |
| 認可 | RBAC + ワークスペースベース | SECURITY.md |
| 暗号化（保存時） | AES-256-GCM（2層構造） | SECURITY.md |
| 暗号化（通信時） | HTTPS（HSTS） | SECURITY.md |
| 入力検証 | Zod v4 | SECURITY.md |
| XSS 対策 | React 自動エスケープ | SECURITY.md |
| CSRF 対策 | SameSite Cookie | SECURITY.md |
| SQL インジェクション対策 | パラメータ化クエリ | SECURITY.md |
| 監査ログ | 全操作を記録、2年保持 | SECURITY.md |
| 脆弱性管理 | npm audit、Dependabot | SECURITY.md |
| 開発者ガイドライン | セキュアコーディング原則 | SECURITY.md |
| GDPR/個人情報保護法 | 対応方針定義 | SECURITY.md |

### 対応ドキュメント
- `docs/guides/SECURITY.md`

---

## 6. システム環境・エコロジー

### 対応項目

| 項目 | 対応内容 |
|------|---------|
| ホスティング | Vercel（Serverless） |
| データベース | Supabase（Managed PostgreSQL） |
| グリーンホスティング | Vercel（再生可能エネルギー使用） |
| リソース効率 | オンデマンドスケーリング |
| リージョン | AWS ap-northeast-1（東京） |

### クラウド環境詳細

**Vercel:**
- Serverless Functions
- Edge Network（グローバル CDN）
- 自動スケーリング
- ゼロコールドスタート

**Supabase:**
- PostgreSQL 17.6
- 自動バックアップ
- Point-in-Time Recovery
- Row Level Security（無効化、アプリ層で制御）

---

## ドキュメント一覧

| ドキュメント | 場所 | 内容 |
|-------------|------|------|
| SLA・可用性定義書 | `docs/guides/SLA-AVAILABILITY.md` | 稼働率目標、RTO/RPO、エスカレーション |
| 障害対応手順書 | `docs/guides/INCIDENT-RESPONSE.md` | インシデント分類、対応フロー |
| バックアップ・DR方針書 | `docs/guides/BACKUP-DR.md` | バックアップ、復旧手順、災害対策 |
| 性能要件定義書 | `docs/guides/Performance-Specification-v1.0.md` | 性能目標、負荷テスト、データ増加計画 |
| 運用・保守手順書 | `docs/guides/OPERATIONS-MAINTENANCE.md` | 日次/週次/月次タスク、監視、リリース |
| セキュリティポリシー | `docs/guides/SECURITY.md` | 認証認可、暗号化、脆弱性管理 |
| 非機能要求対応表 | `docs/guides/NFR-COMPLIANCE.md` | 本ドキュメント |

---

## 定期レビュー

| レビュー | 頻度 | 担当 |
|---------|------|------|
| ドキュメント更新確認 | 四半期 | 開発チーム |
| SLA 達成状況確認 | 月次 | 運用チーム |
| 非機能要求グレード適合確認 | 年次 | 管理者 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2025-12-02 | 初版制定 |
| v1.1 | 2025-12-03 | Phase 14.8 性能最適化結果を反映、監査レポート自動送信機能追加 |

---

## 監査・通知設定

### 自動監査スケジュール

| 種別 | スケジュール | 内容 |
|------|-------------|------|
| 日次ヘルスチェック | 毎日 18:00 JST | システム稼働確認、異常時メール通知 |
| 週次レポート | 毎週月曜 09:00 JST | パフォーマンス・セキュリティチェック |
| 月次NFR監査 | 毎月1日 09:00 JST | 全6カテゴリの準拠状況レポート |

### 通知先

- **アラート通知**: admin@example.com
- **監査レポート**: admin@example.com

### 手動監査実行

```bash
# GitHub Actions から手動実行
gh workflow run monthly-audit.yml -f report_type=monthly

# APIから監査レポート送信（SA権限必要）
curl -X POST https://app.foundersdirect.jp/api/admin/audit-report \
  -H "Cookie: fdc_session=YOUR_SESSION"
```

---

**次回レビュー予定:** 2026-03-02
