# Phase 9〜12 マスタープラン（エンジニアリング完全版）

**Version:** 1.4
**作成日:** 2025-11-16
**最終更新:** 2025-01-24
**ステータス:** Phase 9.8 部分完了（60%）、AI基盤完全実装（v2.9.0）

## 1. 目的
Phase 9〜12の実施順序、依存関係、完了基準、継続的パフォーマンス戦略を定義。段階的で検証済みの機能デプロイを通じて、技術的負債ゼロを確保する。

## 2. Phase 9〜9.5 進捗状況（2025-11-18）

### Phase 9 完了（100%）
- ✅ DB移行（Neon → Supabase）: 100%完了
- ✅ 認証レイヤー（JWT → サーバーセッション）: 100%完了
- ✅ 暗号化統合: 100%完了

### Phase 9.5 完了（96%）
- ✅ Cookie 設定処理完成（`setCookieHeader()` 実装）
- ✅ 環境変数完全整備（`.env.example` 更新、`verify-env.sh` 作成）
- ✅ 型整合完了（TypeScript エラー 50件 → 0件）
- ✅ テストモード Cookie 対応（auth.spec.ts: 6 passed）
- 📋 E2E テスト完全化タスク 54件を Phase 9.7 へ正式移管
  - API テスト: 13件、セキュリティテスト: 5件、RLS テスト: 3件、UI テスト: 9件、Worker テスト: 24件

### Phase 9.7 準備完了
- 🔜 Phase 9.5 から E2E テスト完全化タスク 54件を受領
- 🎯 目標: スキップテスト 0件達成、Next.js App Router 完全整合、レガシー構造全廃

## 3. 基本原則
1. **Phase 9: 基盤確立 + 仕様確定**
   - 暗号化基盤
   - Performance Specification v1.0
   - workspace_data 250KB制限ポリシー

2. **Phase 10〜12: 継続的コンプライアンス**
   - 段階的に機能を追加
   - **各Phase完了時、必ずパフォーマンス＋容量制限を満たす**
   - 「後で最適化」戦略は採用しない

3. **技術的負債ゼロ蓄積**
   - 早期発見、早期解決
   - 安定した基盤の上に機能を積み上げる

---

## 4. Phase実施順序

```
Phase 9: 基盤 + ベースライン確定
  ✅ DB移行（Neon → Supabase）: 100%完了
  ✅ 認証（JWT → サーバーセッション）: 100%完了
  ✅ 暗号化API統合: 100%完了
  ✅ Performance Spec v1.0 確定
  ✅ workspace_data 250KB制限確定
  ステータス: 100%完了（v2.8.0）
        ↓
Phase 9.5: 基盤整備完了 ✅（2025-11-18）
  ✅ Cookie 設定処理完成（setCookieHeader() 実装）
  ✅ 環境変数完全整備（.env.example 更新、verify-env.sh 作成）
  ✅ 型整合完了（TypeScript エラー 50件 → 0件）
  ✅ テストモード Cookie 対応（auth.spec.ts: 6 passed）
  📋 E2E テスト完全化タスク 54件を Phase 9.7 へ正式移管
  ステータス: 96%完了（v2.8.1）
        ↓
Phase 9.7: 最終ハードニング ⏭️（スキップ）
  📝 Phase 9.5 からの引き継ぎタスク（E2E 54件）は Phase 9.8 で吸収
  📝 技術負債ゼロ化は Phase 9.7 完了として記録済み
        ↓
Phase 9.8: スケーラビリティ・AI基盤・ガバナンス 🟡（60%完了 - 2025-01-24）
  ✅ AI基盤完全実装（Phase 9.8-B: 100%）
    - AI SDK 導入（ai, @ai-sdk/openai）
    - AI Context Control（PII除外・マスキング）
    - AI Gateway（レート制限 5req/min）
    - 監査ログ記録機構
  🟡 データ基盤強化開始（Phase 9.8-A: 50%）
    - ✅ DB マイグレーション（version カラム追加完了）
    - ✅ P95 計測スクリプト実行完了
    - ✅ DB接続二重化（Transaction Pooler + Direct Connection）
    - ⏳ 楽観的ロック API実装（残タスク）
    - ⏳ Conflict UI、Compression、Validator（残タスク）
  🟡 ガバナンス準備（Phase 9.8-C: 30%）
    - ✅ Admin Seed スクリプト作成
    - ⏳ Admin Dashboard UI（残タスク）
    - ⏳ Role UI、Security Settings（残タスク）
  📝 Phase 10 移行判定: ⚠️ 条件付き可能
    - AI基盤完全実装済み → Phase 10 で AI活用可能
    - データ基盤・ガバナンスUI は Phase 10 並行実装推奨
        ↓
Phase 10: TODO拡張（4象限 + カレンダー）
  - 4象限ボード（リーンキャンバス風UI）
  - Googleカレンダー連携
  - Elastic Habits（松竹梅）
  - 容量計測（10-0）→ パフォーマンステスト（10-6）
  - 目標: workspace_data ≤ 225KB
        ↓
Phase 11: Action Map（戦術レイヤー）
  - Action Map CRUD
  - TODO連携（生成/紐付け）
  - 進捗ロールアップ
  - 容量計測（11-0）→ パフォーマンステスト（11-6）
  - 目標: workspace_data ≤ 200KB（推奨）
  - アーカイブ機能（容量戦略）
        ↓
Phase 12: OKR（戦略レイヤー）
  - Objective / Key Result CRUD
  - KR ↔ ActionMap 連携（N:M）
  - 完全ロールアップ（Task → ActionItem → ActionMap → KR → Objective）
  - 容量計測（12-0）→ 統合E2E（12-7）
  - 目標: workspace_data ≤ 200KB（推奨）
  - Phase 9〜12 全パフォーマンス基準維持
        ↓
✅ 本番環境運用開始可能
```

---

## 5. Phase 9 完了基準（DOD）
### 5.1 機能実装
- [x] DB基盤移行（Neon → Supabase）完了
- [x] 認証レイヤー（JWT → サーバーセッション）完了
- [x] 暗号化API統合完了
- [x] 既存API 27エンドポイント実装済み

### 5.2 仕様確定
- [x] Performance Specification v1.0 確定
- [x] workspace_data 250KB容量制限ポリシー確定
- [x] Encryption Allocation Table 確定

### 5.3 テスト
- [x] Phase 9対象 スキップテスト30件対応完了
- [ ] 残り21件はPhase 10へ延期（API/CSRF/RLS/Worker）

### 5.4 対象API（Phase 8までの既存機能のみ）
- [x] `/api/auth/*` - サーバーセッション認証・ロール管理
- [x] `/api/workspaces/*` - ワークスペース管理
- [x] `/api/audit-logs` - 監査ログ
- [x] `/api/reports/*` - レポート
- [x] `/api/leads/*`, `/api/clients/*` - 既存CRUD

### 5.5 Phase 10への引き継ぎ事項
- ✅ Performance Specification v1.0
- ✅ workspace_data 容量制限ポリシー（250KB ハード上限）
- ✅ Encryption Allocation Table
- ⚠️ スキップテスト解除（21件）
- 📝 暗号化改善（Leads/Clients API 復号エラーハンドリング）
- 📝 セキュリティ強化（CSRF・レート制限）

---

## 5.6. Phase 9.5 完了基準（DOD）
### 5.6.1 Core Hardening（9.5-A）
- [ ] 暗号化レイヤーのフィールド単位化・破損耐性
  - フィールド単位またはロジカルセクション単位の復号
  - 復号失敗時のフェイルセーフ（部分リセット、アプリ全体は動作維持）
  - 復号失敗ログの設計
- [ ] 容量管理ポリシーの確定
  - workspace_data 250KB制限の運用ルール確立
  - 90日以上前のデータアーカイブ方針
  - Phase 10以降の容量見積もり
- [ ] Dev / Prod / Local の環境整合性
  - Supabase プロジェクト構成統一
  - 環境変数の再整理
  - 環境差分の解消
- [ ] CI/CD安定化
  - Vercel デプロイの安定化
  - Production Branch 明示
  - ビルド再現性の確保

### 5.6.2 Next.js 15 移行（9.5-B）
- [ ] Next.js 15 プロジェクト初期化
  - App Router 有効化
  - TypeScript / ESLint / Prettier 設定
- [ ] API Route Handlers 化
  - `api/*` → `app/api/**/route.ts` 移行
  - 共通ロジック `lib/server/*` に集約
  - 既存APIインターフェース維持
- [ ] フロントエンドReact化
  - `js/core/*` → `lib/core/*` 移動
  - `js/tabs/*` → `app/(app)/*/page.tsx` 変換
  - React Hooks化
- [ ] 認証フローNext.js統合
  - Route Handlers前提の認証フロー
  - 未ログインGuard実装
  - セッション情報取得API

### 5.6.3 テスト・ドキュメント対応（9.5-C）
- [ ] E2E/Integration/Unitテスト更新
  - Playwright E2E（Next App Router対応）
  - Integration（Route Handlers対応）
  - Unit（`lib/core/`, `lib/server/` 対応）
- [ ] スキップテスト解消
  - 21件のスキップテスト棚卸し
  - Next構成で必要なテスト復活
  - 不要テストの明示的削除
- [ ] ドキュメントNext対応
  - FDC-GRAND-GUIDE.md（Next.js 15アーキテクチャ図）
  - HOW-TO-DEVELOP.md（App Router前提の開発手順）
  - Performance-Specification-v1.0（Next構成でのP95目標）

### 5.6.4 Phase 9.7への引き継ぎ事項
- Next.js 15 + Supabase + AES基盤完成
- スキップテスト削減（Phase 9.7で0件達成）
- 環境差分解消
- CI/CD安定化

---

## 5.8. Phase 9.8 完了基準（DOD）

### 5.8.1 Phase 9.8-A: データ基盤強化
- [x] DB マイグレーション（`version` カラム追加）
- [x] P95 計測スクリプト実行
- [x] DB接続方式改善（Transaction Pooler + Direct Connection）
- [ ] 楽観的排他制御（API側 CAS 実装）
- [ ] データ圧縮（暗号化前 Gzip 圧縮）
- [ ] Validator 実装（`lib/core/validator.ts`）
- [ ] Conflict Recovery UI（409エラー時の解決モーダル）
- [ ] Client Versioning（バージョン不一致検知）
- [ ] Performance Monitor（処理時間計測）

### 5.8.2 Phase 9.8-B: AI インフラストラクチャ
- [x] AI SDK 導入（`ai`, `@ai-sdk/openai`）
- [x] AI Context Control 実装（`lib/core/ai-context.ts`）
  - [x] AIContextLevel enum（MINIMAL/STANDARD/FULL）
  - [x] PII除外（メール・電話）
  - [x] 個人名マスキング
- [x] AI Gateway 実装（`app/api/ai/chat/route.ts`）
  - [x] レート制限 5req/min
  - [x] AI有効化フラグチェック
  - [x] 監査ログ記録
- [x] Type Check 完全Pass

### 5.8.3 Phase 9.8-C: ガバナンス & 管理ツール
- [x] Admin Seed スクリプト作成（`scripts/seed-admin.ts`）
- [ ] Super Admin Dashboard UI 実装
- [ ] Role Management UI 実装（招待時のロール選択）
- [ ] Security Settings UI 実装（AI設定、鍵ローテーション）
- [ ] Admin権限付与（初回ログイン後実行）

### 5.8.4 重要な技術的発見
- [x] Supabase DB接続の二重化の必要性
  - Transaction Pooler: 高速だがマイグレーション不可
  - Direct Connection: マイグレーション可能だが接続数制限あり
  - ユーザー名の違い: `postgres.PROJECT_REF` vs `postgres`

### 5.8.5 Phase 10への引き継ぎ事項
- ✅ AI基盤完全実装（Phase 10 で AI機能活用可能）
- 🟡 楽観的ロック機構（Phase 10 並行実装推奨）
- 🟡 ガバナンスUI（Phase 10 並行実装推奨）
- 📝 DB接続二重化の運用ガイドライン
- 📝 AI Context Control の使用例

---

## 5.9. Phase 9.7 完了基準（DOD）【アーカイブ】
### 5.7.1 API層の完全整合
- [ ] 認証ミドルウェアの統合・共通化
- [ ] セッションCookieの厳格検証
- [ ] 401/403/404レスポンスの正規化
- [ ] 入力バリデーションの共通化
- [ ] HTTP動詞の誤用排除（GET/POST/PUT/DELETE）

### 5.7.2 暗号化層の完全安定化
- [ ] Master Keyの取り扱い標準化
- [ ] AES-256-GCM decrypt の全エンドポイント検証
- [ ] Nonce再利用禁止・検証
- [ ] Workspace Key生成フローの一貫化

### 5.7.3 Supabase RLS完全検証
- [ ] `workspace_data` RLSポリシー確認
- [ ] `workspace_keys` RLSポリシー確認
- [ ] ユーザー別行レベルアクセスの正常性

### 5.7.4 レガシー構造の全廃
- [ ] レガシー `unlockApp()` の全削除
- [ ] localStorage フォールバックの廃止
- [ ] エラーフォーマットの標準化
- [ ] AppData整合性バリデータの導入
- [ ] 9.3〜9.5残存レガシーコードの完全削除

### 5.7.5 全テスト成功
- [ ] E2Eテスト全成功（ログイン、WS切替、CRUD、リロード永続化、RLS境界）
- [ ] Unitテスト全成功（暗号化ヘルパー、APIClient、状態管理）
- [ ] Integrationテスト全成功（DBマイグレーション、`/api/workspaces/*`）
- [ ] スキップテスト0件達成

### 5.7.6 パフォーマンス基準達成
- [ ] Dashboard初期表示: P95 < 2s
- [ ] API応答: P95 < 300ms
- [ ] WorkspaceData サイズ: P95 < 250KB
- [ ] Google SDK読み込みレース条件解決

### 5.7.7 環境変数ガバナンス
- [ ] 全必須環境変数の設定確認（JWT_SECRET, MASTER_ENCRYPTION_KEY, SUPABASE_URL等）
- [ ] Vercel環境変数の完全整合
- [ ] Dev/Prod/Local環境の完全一致

### 5.7.8 Phase 10への引き継ぎ事項
- 技術負債ゼロの状態達成
- 全テスト成功（スキップテスト0件）
- Next.js App Router完全整合
- 環境変数ガバナンス確立

---

## 6. Phase 10 完了基準（DOD）
### 6.1 機能実装
- [ ] 4象限ボード（リーンキャンバス風UI）
- [ ] Googleカレンダー連携
- [ ] Elastic Habits（松竹梅）
- [ ] `/api/todos/*` - TODO CRUD

### 6.2 パフォーマンス
- [ ] 4象限ボード表示: P95 < 1.2秒
- [ ] TODO作成・編集: P95 < 800ms
- [ ] カレンダー連携: P95 < 1.5秒

### 6.3 容量
- [ ] workspace_data ≤ 225KB（250KB制限の90%以内）

### 6.4 テスト
- [ ] E2Eテスト全成功
- [ ] 既存機能回帰テスト全成功

### 6.5 Phase 11への引き継ぎ事項
- TODO機能（Phase 11で連携）
- workspace_data 容量実測値
- パフォーマンス計測結果

---

## 7. Phase 11 完了基準（DOD）
### 7.1 機能実装
- [ ] Action Map CRUD
- [ ] Action Item ツリー構造
- [ ] TODO連携（生成/紐付け）
- [ ] 進捗集計（ロールアップ）
- [ ] アーカイブ機能（90日間更新なし→自動アーカイブ）
- [ ] `/api/action-maps/*` - Action Map CRUD
- [ ] `/api/action-items/*` - Action Item CRUD

### 7.2 パフォーマンス
- [ ] Action Map タブ表示: P95 < 1.5秒
- [ ] Action Item 進捗計算: P95 < 100ms
- [ ] Phase 10基準も維持

### 7.3 容量
- [ ] workspace_data ≤ 200KB（推奨、250KB制限の80%以内）

### 7.4 テスト
- [ ] E2Eテスト全成功
- [ ] Phase 10回帰テスト全成功

### 7.5 Phase 12への引き継ぎ事項
- Action Map 機能（Phase 12で連携）
- workspace_data 容量実測値
- アーカイブ戦略実装状況

---

## 8. Phase 12 完了基準（DOD）
### 8.1 機能実装
- [ ] Objective / Key Result CRUD
- [ ] KR ↔ ActionMap 連携（N:M対応）
- [ ] 完全ロールアップ（Task → ActionItem → ActionMap → KR → Objective）
- [ ] Dashboard OKRウィジェット
- [ ] OKRアーカイブポリシー実装
- [ ] `/api/objectives/*` - Objective CRUD
- [ ] `/api/key-results/*` - Key Result CRUD

### 8.2 パフォーマンス
- [ ] ロールアップ処理: P95 < 100ms
- [ ] OKRタブ表示: P95 < 1.5秒
- [ ] Phase 9〜11の基準もすべて維持

### 8.3 容量
- [ ] workspace_data ≤ 200KB（推奨、250KB制限の80%以内）

### 8.4 テスト
- [ ] 統合E2Eテスト全成功
- [ ] 既存機能（Phase 9〜11）破壊的変更なし

### 8.5 本番運用への引き継ぎ事項
- 全Phaseのパフォーマンス計測結果
- workspace_data 容量実測値
- 監視・アラート設定

---

## 9. 継続的パフォーマンス維持戦略
### 9.1 基本方針
**「後で一括最適化」ではなく、「継続的にパフォーマンス基準を維持」**

### 9.2 Phase X-0: 容量計測（全Phase必須）
- [ ] 全Workspaceの容量確認
- [ ] 最大・平均・P95サイズ算出
- [ ] Phase X 追加容量見積もり
- [ ] 250KB制限に対する余裕確認
- [ ] 超過リスク時の軽量化策検討

### 9.3 Phase X-6: パフォーマンステスト（全Phase必須）
- [ ] 新機能のパフォーマンス計測
- [ ] 既存機能のパフォーマンス回帰確認
- [ ] ボトルネック特定
- [ ] 改善実施
- [ ] 再計測
- [ ] **基準を満たさない限り次Phaseへ進まない**

### 9.4 パフォーマンス計測ツール
1. Chrome DevTools Performance（CPU 6x slowdown、LCP/FCP/TTI計測）
2. Lighthouse CLI（Score 85以上目標）
3. Vercel Analytics（P95/P99確認）
4. Prisma Query Logging（N+1クエリ検出）
5. 暗号化処理インライン計測（`api/_lib/encryption.ts`）

### 9.5 改善サイクル
```
計測 → ボトルネック特定 → 改善 → 再計測
                              ↓
                         基準達成 → 次Phaseへ
                              ↓ 未達成
                         改善継続（ループ）
```

---

## 10. 容量制限ポリシー
### 10.1 workspace_data 容量目標
| Phase | 目標容量 | ハード上限 | 対策 |
|-------|---------|-----------|------|
| Phase 9 | 150KB | 250KB | - |
| Phase 10 | ≤225KB（90%） | 250KB | 初期値30分推奨、subTasks最大10件 |
| Phase 11 | ≤200KB（80%） | 250KB | アーカイブ機能実装（必須） |
| Phase 12 | ≤200KB（80%） | 250KB | OKRアーカイブポリシー実装 |

### 10.2 アーカイブポリシー
| データ種別 | アーカイブ条件 | 実装Phase |
|-----------|--------------|----------|
| Task | 完了後180日経過 | Phase 10 |
| ActionMap | 90日間更新なし | Phase 11 |
| Objective | 期間終了後90日経過 | Phase 12 |

### 10.3 データ最適化（上限値）
| データ種別 | フィールド | 上限値 | 超過時の動作 |
|-----------|-----------|--------|-------------|
| Task | subTasks | 10件 | UI警告、保存不可 |
| Task | title | 200文字 | UI警告、保存不可 |
| ActionItem | linkedTaskIds | 20件 | UI警告、保存不可 |
| ActionItem | description | 500文字 | UI警告、保存不可 |
| KeyResult | linkedActionMapIds | 10件 | UI警告、保存不可 |
| Objective | description | 1000文字 | UI警告、保存不可 |

---

## 11. GO/NO-GO基準
### 11.1 Phase 9 → Phase 9.5
**GO条件:**
- [x] サーバーセッション認証動作（dev/本番）
- [x] 暗号化基盤整備（Encryption Allocation Table確定）
- [x] 既存API（Phase 8まで）実装完了（27エンドポイント）
- [x] Performance Specification v1.0 確定
- [x] workspace_data 250KB容量制限ポリシー確定

**NO-GO条件:**
- [ ] セッション認証が不安定
- [ ] 暗号化復号エラーが頻発
- [ ] workspace_data > 250KB

**Phase 9.5で対応するタスク:**
- Core Hardening（暗号化・容量管理・環境整合性・CI/CD）
- Next.js 15全面移行（API Route Handlers化、フロントReact化）
- スキップテスト21件解消

### 11.2 Phase 9.5 → Phase 9.7
**GO条件:**
- [ ] Next.js 15プロジェクト稼働（App Router）
- [ ] API Route Handlers化完了（`app/api/**/route.ts`）
- [ ] フロントエンドReact化完了（`app/(app)/*/page.tsx`）
- [ ] E2E/Integration/Unitテスト大半成功
- [ ] Dev/Prod/Local環境差分解消
- [ ] CI/CD安定化（Vercelデプロイ成功率100%）
- [ ] ドキュメント更新完了（GRAND-GUIDE, HOW-TO-DEVELOP）

**NO-GO条件:**
- [ ] Next.js移行が不完全（旧構成が残存）
- [ ] 主要E2Eテストが通らない
- [ ] 環境差分が未解消

**Phase 9.7で対応するタスク:**
- レガシー構造の全廃
- 全テスト成功（スキップテスト0件達成）
- 環境変数ガバナンス確立
- 暗号化データの完全安定化

### 11.3 Phase 9.8 → Phase 10

**現状（2025-01-24）:**
- Phase 9.8 は 60% 完了
- AI基盤（Phase 9.8-B）は 100% 完了 ✅
- データ基盤（Phase 9.8-A）は 50% 部分完了 🟡
- ガバナンス（Phase 9.8-C）は 30% 部分完了 🟡

**GO条件（条件付き移行可能）:**
- [x] AI基盤完全実装（Phase 10 で AI活用可能）
- [x] DB マイグレーション完了（`version` カラム追加済み）
- [x] Type Check 完全Pass
- [ ] 楽観的ロック API実装（Phase 10 並行実装可）
- [ ] Validator 実装（Phase 10 並行実装可）
- [ ] Conflict UI 実装（Phase 10 並行実装可）

**移行判定: ⚠️ 条件付き可能**
- ✅ **AI機能を Phase 10 で活用する場合**: 即座に移行可能
- 🟡 **データ競合防止が必須の場合**: 楽観的ロック完全実装後に移行推奨
- 🟡 **管理機能が必須の場合**: ガバナンスUI実装後に移行推奨

**推奨アプローチ:**
Phase 10 に移行し、Phase 9.8 の残タスクを並行実装する。
- Phase 10-0〜10-2: TODO基礎機能実装
- Phase 10-3: Phase 9.8 残タスク（楽観的ロック、Validator、Conflict UI）
- Phase 10-4〜10-6: TODO拡張機能実装

**NO-GO条件:**
- [ ] AI基盤が未実装（→ 実装済みのため該当なし）
- [ ] Type Check がエラー（→ Pass済みのため該当なし）
- [ ] DB接続が不安定（→ 安定稼働中のため該当なし）

### 11.4 Phase 10 → Phase 11
**GO条件:**
- [ ] 4象限ボード動作
- [ ] Googleカレンダー連携動作
- [ ] Elastic Habits実装
- [ ] Phase 10 E2Eテスト全成功
- [ ] workspace_data ≤ 225KB
- [ ] Phase 10パフォーマンス基準達成

**NO-GO条件:**
- [ ] TODO機能が不安定
- [ ] workspace_data > 225KB
- [ ] パフォーマンス基準未達

### 11.5 Phase 11 → Phase 12
**GO条件:**
- [ ] Action Map CRUD動作
- [ ] Action Item ツリー構造実装
- [ ] TODO連携動作
- [ ] 進捗集計動作
- [ ] Phase 11 E2Eテスト全成功
- [ ] workspace_data ≤ 200KB（推奨）
- [ ] Phase 11パフォーマンス基準達成
- [ ] アーカイブ機能実装

**NO-GO条件:**
- [ ] Action Map機能が不安定
- [ ] workspace_data > 225KB
- [ ] パフォーマンス基準未達

---

## 12. 環境変数マトリクス
| 変数名 | 必須 | 説明 |
|--------|------|------|
| JWT_SECRET | Yes | Cookie署名 |
| MASTER_ENCRYPTION_KEY | Yes | AES暗号化キー |
| SUPABASE_URL | Yes | DB接続 |
| SUPABASE_SERVICE_ROLE | Yes | 管理操作 |
| GOOGLE_CLIENT_ID | Yes | OAuth |
| GOOGLE_CLIENT_SECRET | Yes | OAuth |

---

## 13. 成功の鍵
1. **継続的パフォーマンス維持** - 各Phaseで基準を満たす、基準未達なら次へ進まない
2. **容量制限の厳守** - Phase X-0で容量計測、アーカイブ機能実装
3. **明確な依存関係** - 各Phase開始前にGO/NO-GO確認
4. **技術的負債ゼロ** - 各Phaseでコード品質維持

## 14. Claude Code用プロンプト
Phase 9〜12開発時に以下を含める:

```
あなたは FDC Phase X 完了エンジニアです。
DOD（完了基準）を厳密に遵守してください。
新機能は追加しないでください。
差分のみを生成してください。
暗号化設計を保持してください。
Vercelサーバーレス制約を尊重してください。
```

## 15. 付録
- API マトリクス
- エラーコードカタログ
- RLS ポリシーインデックス

---

**作成者:** Claude Code
**バージョン:** 1.4
**最終更新:** 2025-01-24 (Phase 9.8 実施報告反映)
**次回更新:** Phase 10 開始時
