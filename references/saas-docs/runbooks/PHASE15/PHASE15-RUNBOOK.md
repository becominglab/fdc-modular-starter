# PHASE 15 RUNBOOK  
Security & Scale NEXT Step（Google Token / Audit Log / Background Sync）

- Version: 1.0
- Status: Phase 15 事前設計
- 対象リポジトリ: `/Users/5dmgmt/プラグイン/foundersdirect`
- 対象プロダクト: Founders Direct Cockpit（FDC）
- 前提フェーズ:
  - Phase 14.6.7 SECURITY HOTFIX 完了
  - Phase 14.9-C Tenant Boundary Hardening 完了（全 API checkTenantBoundary 適用済）
  - Google 連携 / AI / Org-Chart 基本機能は安定稼働中

---

## 0. Phase 15 の目的と全体像

### 0-1. 目的

Phase 15 の目的は、「一般的なSaaSとしての標準レベル」から一歩進めて、

1. **長期権限トークン（Google リフレッシュトークン）の暗号化**
2. **重要操作の監査ログの体系化（ミニマム版から開始）**
3. **バックグラウンド同期基盤のスケール余地確保（並列化と冪等性設計）**

を実装し、**Security / Auditability / Scalability を “B2B SaaS 水準” に引き上げること**。

### 0-2. サブフェーズ構成

- **Phase 15-A:** Google OAuth Refresh Token Encryption  
- **Phase 15-B:** Minimum Audit Log Implementation  
- **Phase 15-C:** Background Sync Parallelization

原則として「A → B → C」の順に実施する。  
※C は実データ規模と Cron の負荷状況を見て着手タイミングを調整してよい。

---

## 1. Phase 15-A  
Google OAuth Refresh Token Encryption

### 1-1. 目的

- Google リフレッシュトークン（長期権限トークン）をアプリ層で暗号化し、
  - DB ダンプ流出
  - Service Role Key 漏えい
  が起きた場合でも、**それ単体では Google アカウントにアクセスできない状態**を作る。

### 1-2. 対象範囲

- 対象データ:
  - `google_tokens` 相当のテーブル（refresh_token / access_token 保存先）
- 対象コード:
  - OAuth callback / token 保存処理
  - Google API 呼び出し前の token refresh 処理
  - 既存の暗号化モジュール（`lib/server/encryption/*`）があれば再利用

### 1-3. 設計ポリシー

1. **暗号方式**
   - AES-256-GCM を基本とする
   - IV を毎回ランダム生成
   - authTag を含めたエンベロープ形式で保存

2. **鍵管理**
   - Vercel 環境変数でバージョン付き管理
     - `FDC_GOOGLE_TOKEN_KEY_V1`（本番）
     - `FDC_GOOGLE_TOKEN_KEY_V1_STG`（ステージング）
   - コード側では
     - `ENCRYPTION_KEYS = { v1: ..., v2: ... }`
     - `CURRENT_KEY_VERSION = "v1"`

3. **DB スキーマ**
   - `encrypted_refresh_token TEXT`
   - `token_key_version TEXT` (`'v1'` 等)
   - 将来のローテーション前提で、**バージョンを必ず保存**する。

4. **移行戦略**
   - 新規保存分はすべて暗号化
   - 既存データは:
     - （オプション）バックグラウンドで順次暗号化するマイグレーション  
       または  
     - 「再連携時に暗号化」する方針を明示

### 1-4. 実装ステップ

1. **暗号化モジュール追加**
   - `lib/server/encryption/google-tokens.ts` を新規作成
     - `encryptRefreshToken(plain: string) => { ciphertext: string; version: string }`
     - `decryptRefreshToken(ciphertext: string, version: string) => string`

2. **DB スキーマ変更**
   - マイグレーションファイルを作成
     - `encrypted_refresh_token` / `token_key_version` を追加
     - 既存 `refresh_token` カラムがあれば残しつつ、段階的に移行

3. **保存処理の改修**
   - OAuth callback / token 保存処理にて、
     - `encryptRefreshToken(refresh_token)` を通した値＋`version` を保存
     - 生の `refresh_token` は保存しない（マイグレーション完了後に削除）

4. **利用処理の改修**
   - token refresh 処理で、
     - DB から `encrypted_refresh_token` / `token_key_version` を取得
     - `decryptRefreshToken` で復号してから Google API に送信

5. **（オプション）既存データのマイグレーション**
   - 管理者専用スクリプト or Cron で、
     - 既存 `refresh_token` を一件ずつ暗号化し直す
   - もしくは、「全ユーザーに再認可を促す」運用で済ませる前提ならマイグレーション無しも可

### 1-5. テスト & リスク

- テスト観点:
  - 正常系: 連携 ON → 同期 → アクセストークン更新が通ること
  - 異常系: 鍵が存在しない / 間違っている場合に同期を安全に失敗できること
- リスク:
  - 鍵を誤って削除・上書きした場合、**全 Google 連携が一斉に死ぬ**  
    → 鍵運用を Runbook 化し、バックアップルールを決める。

### 1-6. DOD（Definition of Done）

- [ ] 本番・ステージングに `FDC_GOOGLE_TOKEN_KEY_V1` が安全に設定されている
- [ ] 新規に連携したユーザーの `refresh_token` が暗号化されて保存される
- [ ] Google 同期・タスク・カレンダーが通常どおり動作する
- [ ] 既存ユーザーについての方針（マイグレーション or 再連携）が決まっている
- [ ] `docs/PHASE15-A-GOOGLE-TOKEN-ENCRYPTION-RUNBOOK.md` が作成されている

---

## 2. Phase 15-B  
Minimum Audit Log Implementation

### 2-1. 目的

- 「誰が / いつ / どのテナントで / 何をしたか」という **監査証跡を最低限確保**し、
  - 大きなトラブル時に原因を追える
  - 将来のエンタープライズ対応（ISMS / SOC2 等）の土台にする

※このフェーズでは「完全版」ではなく、**クリティカル操作だけに絞ったミニマム版**を実装する。

### 2-2. 対象イベント（Minimum Set）

- テナント / ワークスペース関連:
  - テナント設定変更
  - ワークスペース作成 / 削除
  - ロール変更（管理者権限付与 / 削除）
- 外部連携:
  - Google 連携 ON / OFF
- プラン / 課金関連（必要に応じて定義）:
  - プラン変更
  - 契約関連の重要操作

※後から拡張可能な設計にする前提で、**まずは 5〜10 程度の“本当に重要な操作”に限定**する。

### 2-3. 設計方針

1. **スキーマ**
   - `audit_logs` テーブル（例）:
     - `id`
     - `tenant_id`
     - `workspace_id`（任意）
     - `user_id`
     - `action`（例: `"workspace.deleted"`, `"google.linked"`）
     - `payload`（JSONB, 変更前後の少量情報）
     - `created_at`
   - append-only（削除・更新禁止）を原則とする。

2. **ロギング API / サービス**
   - `lib/server/audit-log-service.ts`（例）:
     - `recordAuditLog({ session, tenantId, workspaceId, action, payload })`
   - 各 API ハンドラから呼び出す。

3. **スコープ**
   - Phase 15-B では:
     - DB への書き込みと、
     - 開発者用の簡易閲覧（SQL / Supabase コンソール）レベルまで。
   - 専用 UI や高度な検索は Phase 16 以降の拡張とする。

### 2-4. 実装ステップ

1. **テーブル作成**
   - `audit_logs` テーブル（上記スキーマ）を作成。

2. **共通サービス実装**
   - `recordAuditLog` ヘルパーを `lib/server` に追加。
   - `getSession` / `checkTenantBoundary` 結果 を使い、`tenant_id` / `user_id` を自動で埋める。

3. **対象イベントへの組み込み**
   - 次の API に最優先で埋め込む：
     - テナント設定変更 API
     - ワークスペース作成 / 削除 API
     - ロール変更 API
     - Google 連携 ON/OFF API
   - 各 API の最後（DB 更新成功後）に `recordAuditLog` を呼び出す。

4. **開発者向け動作確認**
   - Supabase コンソールから `SELECT * FROM audit_logs` を確認し、
     - 想定どおりの action / payload が記録されているかチェック。

### 2-5. テスト & リスク

- テスト観点:
  - 正常操作時に必ず 1 行の audit_log が記録されること
  - 失敗した操作（DB ロールバック）では書き込まれないこと
- リスク:
  - ログ量・ストレージ増加（ただしミニマム版の範囲では問題になりにくい）
  - PII の扱い（payload に余計な個人情報を入れない）

### 2-6. DOD

- [ ] `audit_logs` テーブルが作成されている
- [ ] 対象イベント（最低 5〜10種）に対して監査ログが記録されている
- [ ] ログフォーマット（action 名・payload の粒度）が決まっている
- [ ] シンプルなクエリで、「誰が / 何を / いつ」実行したかを追える
- [ ] 今後 Phase 16 以降で拡張すべき対象イベントの候補リストが整理されている
- [ ] `docs/PHASE15-B-AUDIT-LOG-RUNBOOK.md` が作成されている

---

## 3. Phase 15-C  
Background Sync Parallelization

### 3-1. 目的

- Google 同期などのバックグラウンド処理を**安全に並列化**し、
  - テナント数・同期対象数が増えても Cron Worker が詰まらないようにする。
- 同時に、**冪等性とエラーハンドリング**を整理し、  
  「一部テナントでエラーが出ても全体が止まらない」構造にする。

### 3-2. 着手条件（トリガー）

**リリースバージョン**: v2.10.0 以降

※現実的な優先順位付けのため、以下のいずれかを満たした時点で着手してよい。

#### 定量トリガー（いずれか1つを満たした場合）

| メトリクス | 閾値 | 確認方法 |
|-----------|------|----------|
| Google 連携 ON のテナント数 | **≥ 30** | `SELECT COUNT(DISTINCT tenant_id) FROM users WHERE google_api_enabled = true` |
| Cron Worker 平均処理時間 | **≥ 45秒** | Vercel Functions Logs / 監査ログ |
| Cron Worker タイムアウト回数 | **≥ 3回/月** | Vercel Deployment Logs |
| 同期対象イベント件数/日 | **≥ 500件** | `SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 day'` |

#### 定性トリガー（いずれか1つを満たした場合）

- 大口顧客（10人以上のワークスペース）の導入決定
- 同期遅延に関するユーザーからのフィードバック
- エンタープライズ契約で同期 SLA が求められる

#### モニタリング方法

```sql
-- 週次で実行：同期パフォーマンス確認
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as sync_count,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE action = 'google_linked'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

#### 先延ばし可能な期間

- 上記トリガーを**いずれも満たさない限り**、Phase 15-C は先延ばし可能
- 月次で上記メトリクスをチェックし、閾値に近づいたら計画を立てる

### 3-3. 設計方針

1. **単位ジョブの定義**
   - 「1テナント×1ワークスペース」の同期を**最小ジョブ単位**とする。
   - Cron Worker は「ジョブ一覧の取得」と「ジョブの並列実行」に専念。

2. **並列実行**
   - `Promise.allSettled` 等を使い、
     - 同時に N ジョブまで並列実行（例: 5〜10）
   - 各ジョブの成功／失敗をログに残す。

3. **冪等性**
   - 同じジョブが二重に走っても、整合性が壊れないことを保証する。
   - 必要であれば「同期状態テーブル」を用意し、処理中フラグ / 最終実行時刻を持つ。

4. **maxDuration の見直し**
   - `maxDuration` を現行 60s→300s などに調整しつつ、
     - 「1回の Cron でどこまで処理するか」のポリシーを決める。

### 3-4. 実装ステップ

1. **現状フローの棚卸し**
   - `app/api/cron/sync-worker/route.ts` の処理フローを整理し、
     - 現在どの粒度でループしているか
     - どこで DB アクセスが集中しているか
     を可視化。

2. **ジョブ抽象化**
   - `lib/server/sync-jobs.ts`（例）を作成し、
     - `fetchPendingSyncJobs() => Job[]`
     - `runSyncJob(job: Job) => Promise<void>`
   - Cron Worker はこれを呼ぶだけに近づける。

3. **並列実行レイヤの追加**
   - Cron ハンドラ内で、
     - `const jobs = await fetchPendingSyncJobs();`
     - `await Promise.allSettled(jobs.slice(0, N).map(runSyncJob));`
   - N は環境変数や定数で制御。

4. **ログとメトリクス**
   - ジョブ単位で成功 / 失敗を logger に出力
   - 将来的なメトリクス取り込み（Datadog 等）を見越してキーを揃える

### 3-5. テスト & リスク

- テスト観点:
  - 少数テナントで、同期結果が従来と変わらないこと
  - あえて 1 テナントをエラーにし、他テナントの同期が継続すること
- リスク:
  - 並列実行により、Google API クォータ消費が増える  
    → Phase 14 でのレート制限とセットで運用する。

### 3-6. DOD

- [ ] Cron Worker が「ジョブ一覧＋並列実行」の形に整理されている
- [ ] 小規模環境で同期結果が問題なく得られる
- [ ] エラーを意図的に起こしたテナント以外への影響がない
- [ ] `maxDuration` / 並列数 / レート制限のバランスがドキュメント化されている
- [ ] `docs/PHASE15-C-BG-SYNC-RUNBOOK.md` が作成されている

---

## 4. Phase 15 全体の DOD

Phase 15 を完了とみなす条件:

- [x] Phase 15-A: Google リフレッシュトークン暗号化が実装され、本番で稼働している（2025-12-04 完了）
- [x] Phase 15-B: 最低限の監査ログが本番で記録されている（2025-12-04 完了）
- [x] Phase 15.1: マルチテナント開発環境（2025-12-05 インフラ構築完了）
- [x] Phase 15.2: テナントカスタマイズ機能（2025-12-04 完了）
- [x] Phase 15.3: セキュリティ監視機能（2025-12-04 完了）
- [x] Phase 15.4: ダッシュボードパフォーマンス最適化（2025-12-04 完了）
- [x] 各サブフェーズの個別 Runbook が `docs/runbooks/PHASE15/` に存在する
- [x] Phase 15-C（同期並列化）は `PHASE1？-FUTURE-DESIGN.md` Section 7 へ移管（トリガー条件待ち）

**Phase 15 ステータス: ✅ 完了（2025-12-05）**

---

## 5. 備考

- Phase 15 は「Security / Audit / Scale の上位化フェーズ」であり、
  - Phase 14 までで整えた「技術負債ゼロ」のベース上に構築する。
- Phase 16 以降では、
  - KMS 連携
  - 完全版監査ログ（全アクション）
  - 高度なモニタリング / メトリクス
  などをテーマに、エンタープライズ水準に向けた拡張を検討する。

---

## 6. Phase 15 実装状況サマリ（2025-12-05 更新）

### 完了済みサブフェーズ

| サブフェーズ | 内容 | 完了日 | 主要成果物 |
|-------------|------|--------|-----------|
| **15-A** | Google Token Encryption | 2025-12-04 | `lib/server/encryption/google-tokens.ts`, `migrations/025-google-token-key-version.sql` |
| **15-B** | Minimum Audit Log | 2025-12-04 | `lib/server/audit.ts` 拡張（クリティカル操作ログ） |
| **15.1** | Multi-Tenant Dev Environment | 2025-12-05 | Supabase/Vercel dev プロジェクト、DNS設定完了 |
| **15.2** | Tenant Customization | 2025-12-04 | `app/(app)/dashboard/components/customTabRegistry.ts` |
| **15.3** | Security Monitoring | 2025-12-04 | `lib/server/security-monitor.ts`, `lib/server/security-middleware.ts`, `migrations/026-security-events.sql` |
| **15.4** | Dashboard Performance | 2025-12-04 | `lib/hooks/useDerivedWorkspaceData.ts`, React.memo最適化 |

### 移管済みタスク

| タスク | 移管先 | 備考 |
|--------|-------|------|
| **15-C** Background Sync Parallelization | `PHASE1？-FUTURE-DESIGN.md` Section 7 | トリガー条件待ち（テナント数 30+ など） |

### 実装ファイル一覧

```
lib/
├── server/
│   ├── encryption/
│   │   ├── google-tokens.ts     # Phase 15-A
│   │   ├── core.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── audit.ts                 # Phase 15-B 拡張
│   ├── security-monitor.ts      # Phase 15.3
│   ├── security-middleware.ts   # Phase 15.3
│   └── security-notifier.ts     # Phase 15.3
├── hooks/
│   └── useDerivedWorkspaceData.ts  # Phase 15.4
app/
├── (app)/dashboard/components/
│   └── customTabRegistry.ts     # Phase 15.2
migrations/
├── 025-google-token-key-version.sql  # Phase 15-A
├── 026-security-events.sql           # Phase 15.3
└── 027-session-fingerprint.sql       # Phase 15.3
```
