# OPS-LESSONS.md - FDC運用教訓・Lessons Learned

> **注**: 本ドキュメントは `FDC-GRAND-GUIDE.md` から分離された運用教訓・Lessons Learnedの記録です。
> コア開発ガイドは `docs/FDC-CORE.md` を参照してください。

---

## 1. Phase 9.7 からの教訓（技術負債ゼロ化フェーズ）

### 1.1 背景
Phase 9.7 は当初「完了」とされていたが、実態は達成率 75%（未完）であることが判明。ドキュメント上の完了と実態の乖離が発生した。

### 1.2 発見された問題
1. **実装漏れ**: AppData Validator が未実装
2. **コンパイルエラー**: 旧 API パス参照が残存（型チェックで 26件のエラー）
3. **計測未完了**: workspace_data P95 サイズ計測が未実施
4. **ガードレール不足**: ESLint による .archive/ import 禁止ルールが未設定

### 1.3 根本原因
- ドキュメント更新を「完了」としたが、実装・テスト・計測が追いついていなかった
- CI での旧コード参照禁止が未強制だったため、archive 移動後も参照が残った

### 1.4 対策と成果
1. ✅ **AppData Validator 実装完了** (`lib/core/validator.ts`)
   - Zod ベースの安全なバリデーション
   - 破損データでも UI がクラッシュしない補完処理
2. ✅ **型チェック完全Pass** (`npm run type-check` エラー 0件)
   - 旧 API 参照の 7つのテストファイルを archive 移動
   - Playwright 形式への移行
3. ✅ **ESLint ガードレール構築** (`.eslintrc.json` 更新)
   - `no-restricted-imports` ルール追加
   - `.archive/**` および `api/_lib/**` への import を禁止
4. ✅ **workspace_data P95 計測スクリプト完成** (`scripts/monitor-workspace-size.sql`)
   - 実際のスキーマに合わせて修正
   - 動作確認済み（本番環境で計測可能）

### 1.5 教訓
> **「ドキュメント上の完了と実態の乖離を防ぐため、移行時は CI での旧コード参照禁止を強制する」**
>
> - フェーズ完了時には、必ず以下を確認すること:
>   1. **コンパイルチェック**: `npm run type-check` が完全に Pass
>   2. **Lint チェック**: `npm run lint` でガードレールが機能
>   3. **計測実施**: 定量的な指標（P95サイズ等）を実測
>   4. **監査ログ更新**: TECH-DEBT-AUDIT.md に証拠を記録
>
> - 「ドキュメントを更新 = 完了」ではなく、「実装 + テスト + 計測 + 証明 = 完了」とする

---

## 2. Phase 移行時のチェックリスト（再発防止）

次回以降の Phase 移行時には、以下を必須とする:

- [ ] `npm run type-check` が Pass
- [ ] `npm run lint` が Pass（ガードレールルールが機能）
- [ ] 定量的指標の計測完了（容量、パフォーマンス等）
- [ ] 監査ログ（TECH-DEBT-AUDIT.md）更新済み
- [ ] Runbook のすべての DOD 項目が ✅ 状態
- [ ] 新規追加したガードレールが CI で自動実行される状態

---

## 3. Phase 9.8 開始時の教訓（プロアクティブな基盤強化）

### 3.1 背景
Phase 9.7 で技術負債ゼロ化を達成したが、Phase 10（TODO機能拡張）に向けて、**先行投資的な基盤強化の必要性**が明確になった。

### 3.2 Phase 9.8 で対処する課題
1. **マルチデバイス利用時のデータ競合**: 複数のタブ/デバイスで同時編集すると、Last Write Wins により変更が失われる可能性
2. **データ容量の増大**: Phase 10 以降の TODO 機能により、workspace_data のサイズが増加する見込み（250KB制限に接近）
3. **AI 導入のコスト制御**: 無制限にデータを AI に送信すると、コストとプライバシーの両面でリスク
4. **運用ガバナンスの不在**: システム管理者機能や、ユーザー自身によるセキュリティ設定が未整備

### 3.3 Phase 9.8 で実装する対策
1. 🟡 **楽観的排他制御（Optimistic Locking）**: `workspace_data` テーブルに `version` カラムを追加完了（マイグレーション実施済み）、API側のCAS実装は未完了
2. ⏳ **競合解決UI**: 未実装（BR-06）
3. ⏳ **データ圧縮**: 未実装（BR-02）
4. ✅ **AI Context Control**: `lib/core/ai-context.ts` に完全実装済み（PII除外・マスキング機能含む）
5. ✅ **AI Audit Log**: `app/api/ai/chat/route.ts` に実装済み（logAIUsage関数）
6. 🟡 **管理者ダッシュボード**: Seed準備完了、UI未実装
7. ⏳ **セキュリティ設定画面**: 未実装（GOV-03）

### 3.4 実装完了した重要機能
- ✅ **AI基盤（Phase 9.8-B）完全実装**: AI SDK導入、Context Control、Gateway、監査ログすべて完了
- ✅ **DB基盤（Phase 9.8-A部分完了）**: マイグレーション実施、P95計測完了
- ✅ **DB接続の二重化**: Transaction Pooler（API用）と Direct Connection（管理用）の分離

### 3.5 教訓
> **「機能追加の前に、それを支える基盤を先に強化する」**
>
> - Phase 10 で TODO 機能を追加する前に、Phase 9.8 でデータ基盤を堅牢化することで、以下を達成:
>   1. **安全性**: データ競合による消失を防止（楽観的ロック導入中）
>   2. **スケーラビリティ**: データ容量の増大に対応（圧縮機構準備中）
>   3. ✅ **コスト効率**: AI 利用のコストを制御（レート制限5req/min実装済み）
>   4. **運用性**: 管理者による監視と設定を可能に（Seed準備完了、UI実装待ち）
>
> - 「機能を追加してから問題が起きる」のではなく、「問題が起きない基盤を作ってから機能を追加する」アプローチ

---

## 4. Supabase DB接続の二重化

### 4.1 問題
- Transaction Pooler (pgbouncer) は高速だがマイグレーション不可
- Direct Connection はマイグレーション可能だが接続数制限あり

### 4.2 解決策
用途に応じて2つの接続URLを使い分ける:
- `DATABASE_URL`: Transaction Pooler (API routes用)
- `DIRECT_DATABASE_URL`: Direct Connection (マイグレーション/管理スクリプト用)

---

## 5. Performance Specification v1.0（基準値）

Phase 9 で確立したパフォーマンス基準:

### 5.1 P95 目標値（抜粋）
- 初回Dashboard表示 < 2.0秒
- タブ切替 < 1.2秒
- Workspace切替 < 2.2秒（暗号化復号込み）
- API GET < 350ms / POST < 450ms / レポート処理 < 800ms（許容1.2s）
- Workspace復号 < 280ms、保存時暗号化 < 180ms
- `workspace_data` は 1 Workspace **250KB 以下**

### 5.2 測定ルール
- P95は本番トラフィックの直近7日間で算出
- Vercel Analytics / Chrome DevTools / Lighthouse / Prisma Query Logging で裏付け
- Error Rate: 5xx < 0.5%、4xx < 3%（BOT除外）
- Availability: 月間99.5%以上

### 5.3 容量・負荷想定
- 同時接続100ユーザー / 平均RPS 20を想定負荷
- 上記P95を満たすことを基準とする

### 5.4 フロントエンド指針
- 初回ロードのgzippedバンドルは1.0MB以下を推奨
- First Contentful Paint (FCP) を3秒以内に維持

### 5.5 見直しトリガー
- Workspace数100超
- 1 Workspaceあたり1万件超
- 「重い/遅い」フィードバック多発時

---

## 6. Phase 9-12 継続的パフォーマンス維持戦略

### 6.1 基本方針
Phase 9〜12 は、**継続的にパフォーマンス基準と容量制限を守りながら順次機能を追加していく**アプローチを採用する。

1. **Phase 9で基盤確立 + 基準確定**
2. **Phase 9.5〜9.7で基盤強化**
3. **Phase 10〜12で継続的改善**
   - 各Phaseで新機能を追加
   - **各Phase完了時に必ずパフォーマンス基準と容量制限を満たす**
   - 満たさない場合は次Phaseへ進まない
4. **「後で一括最適化」は行わない**
   - 技術的負債が蓄積しない
   - 問題の早期発見・早期対応
   - 安定した基盤の上に機能を積み上げる

---

## 7. 技術負債解消状況（Phase 9.99 計測: 2025-11-28）

| カテゴリ | 解消率 | 詳細 |
|---------|-------|------|
| コード分割 | 100% | 7コンポーネントに next/dynamic 適用済み |
| RSC化 | Reports完了 | Phase 10 で他ページにも展開 |
| CSS移行 | 方針決定 | CSS Modules 採用、Phase 10 で移行開始 |
| any型 | **6件残存** | 27件→6件（意図的ジェネリック） |
| CI/CD | 90% | GitHub Actions（修正中） |
| WorkspaceData | **P95: 751 bytes** | 目標 < 200KB を大幅クリア |
| npm audit | critical 0 | high 3（開発依存）, moderate 7 |
| 高重要度負債 | 100% | 完全解消 |

---

## 8. Phase 9.7 GO/NO-GO 条件

### GO 条件
1. すべてのテストが成功
2. Performance Spec v1.0 に準拠
3. 暗号化エラーが 0 件
4. DB schema が凍結（変更完了）
5. スキップテスト0件
6. Next.js/Vercel Serverless制約に完全準拠
7. Vercel環境変数が完全設定・整合済み

### NO-GO 条件
1. ログインループ（session flapping）が発生
2. リロード後の永続化が不安定
3. WorkspaceData が 250KB を超過
4. スキップテストが1件でも残存

---

## 9. ブランチ戦略

- **main**: 本番環境（保護ブランチ）
- **feature/***: 機能開発ブランチ
- **fix/***: バグ修正ブランチ
- **phase-***: フェーズ専用ブランチ

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `test`: テスト追加・修正
- `refactor`: リファクタリング
- `chore`: その他（ビルド、設定等）

---

**Last Updated**: 2025-11-30
**Source**: FDC-GRAND-GUIDE.md（分割）
