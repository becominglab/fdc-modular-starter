Phase 9.5 – Technical Debt Recovery & Performance Stabilization（Final）

Version: 2.0（確定版）
Date: 2025-11-19
Prepared for: Founders Direct Cockpit Phase 10

0. Purpose – なぜ Phase 9.5 が必須なのか（確定版）

Phase 9 の成果：

DB: Neon → Supabase（本番運用ベースへ移行）

Auth: JWT → セッション方式に全面刷新

Encryption: AES-256-GCM 全体暗号化の稼働

API: 27 API の統合 & RLS 完全稼働

しかし、その副作用として：

旧 JWT ロジックの残骸

main.ts / apiClient.js の構造的不整合

フロント初期化の 10 秒遅延

Worker / DevServer の不一致

スキップテスト 21 件の未解消

Dev / Prod の動作差

容量管理ポリシーの未確定

が「システム全体のレイヤー」で露呈している。

Phase 9.5 は、Phase 10 に進む前の “強制メンテナンスフェーズ” である。
ここを飛ばして Phase 10 に進むと：

認証不整合によるログイン不可

250KB を超えた workspace_data の破損

Dev/Prod の挙動差によるテスト不能

API の RLS 誤動作

全体暗号化 → 部分破損 → データ消失リスク

が高確率で発生する。

1. Phase 9.5 – Done Criteria（確定）

以下すべてが完了した時、Phase 10 を開始できる。

区分    Done
認証    フロント/バックが 100% セッション方式で統一
パフォーマンス    初期化 5秒 → 1秒前後に短縮（Phase 9-7 で実現済）
セキュリティ    CSRF・RateLimit を全 API に統合
テスト    スキップテスト 21件 全解除
Dev環境    本番同等の Dev Server（Supabase + Vercel）復元
暗号化    フィールド単位復号に完全移行。破損耐性を確保
容量管理    アーカイブポリシー確定 & 測定スクリプト稼働
ドキュメント    全 Runbook / Guide を現行構造へ更新
ビルド    Vercel Pro 化 & CI/CD 安定化
2. Phase 9.5 – 全体タスクリスト（確定版）
2-1. フロント認証レイヤー完全リファクタ（最優先 + 完成済の一部を含む）
🎯 目的

旧 JWT ロジックの完全排除

/api/auth/session のセッション方式に 全フロントを統合

初期化遅延のボトルネック解消（Phase 9-7 完成）

🛠 作業内容
① apiClient.js（dist/js/core/apiClient.js）

fetchCurrentUserWithRole() を完全再構築

タイムアウト 10 秒 → 5 秒（定数化）

401 レスポンス時の即時 null return

エラーログ強化 & UI ハング防止

② main.ts（js/main.ts）

Phase 9-7 の改善を正式仕様として組み込み：

Google SDK の 非ブロッキング読み込み

ログイン済みユーザーが SDK を待たずに初期化開始

unlockApp() の race timeout → 2秒

各処理の実行時間ログ追加

Local auth の同期復元ロジック最適化

✅ 完了条件

ログイン後の切替が 1秒前後

セッション方式で全画面が安定遷移

コールドスタート / 回線の遅延を吸収

リロードでログアウトされない

2-2. セキュリティ基盤（CSRF + RateLimit）
必要な実装

csrf.ts（Cookie + Header）

rateLimiter.ts（全 API に組込）

セッション固定攻撃対策

session-id 再生成

完了条件

すべての /api/* が CSRF + RateLimit 実装済み

Playwright の CSRF/RateLimit テスト 100% Pass

2-3. スキップテスト 21 件の全解除

分類と対応：

種類    件数    対応
API テスト    10    DevServer 必須
CSRF    2    ミドルウェア後解除
RateLimit    2    limiter 追加後解除
RLS    3    Supabase Auth 連携後解除
Worker    4    Worker API 仮実装

✔ 最終基準：npm test / Playwright 全 PASS

2-4. 暗号化レイヤーのフィールド単位化
課題

1フィールド破損 → workspace_data 全体が復号不能

Leads/Clients の部分破損で UI が白画面

対応

すべての PII を try/catch で個別復号

{ error: true } で graceful degrade

全体 JSON を部分復元可能な構造へ変更

完了条件

データ破損時も UI が落ちない

フィールド単位の安全復旧が可能

2-5. 容量管理（250KB制限）前倒し
実施項目

90日アーカイブポリシー導入

workspace_data 圧縮検討

measure-workspace-size.ts を導入

Phase 10 の ActionMap 増加分を事前試算

2-6. ドキュメント体系の完全再構築

更新対象：

HOW-TO-DEVELOP.md

PHASE9-ENCRYPTION-AND-API-RUNBOOK.md

FDC-GRAND-GUIDE.md（Phase 9.5 追加）

package.json（不要依存排除）

すべてを セッション方式ベース に統一。

2-7. Vercel Pro 化 & CI/CD 安定化
必須理由

Hobby のビルド12回制限は Phase 10〜12 に耐えない

1度ビルド停止 → 本番ログイン不能リスク

作業

Pro プランへ移行

Production Branch 明確化

GitHub → Vercel の自動ビルド復旧

GitHub ユーザ名キャッシュの永続問題を解消

3. Phase 9.5 – 実行順序（Final）
Day    内容
1–2    認証レイヤー（apiClient.js + main.ts）完全リファクタ
3–4    CSRF / RateLimit 実装
5–6    DevServer 構築 → APIテスト解除
7–8    Supabase RLS / Worker テスト解除
9–10    暗号化フィールド単位化
11    容量アーカイブポリシー確定
12–13    ドキュメント全更新
14    Vercel Pro 化 & CI/CD 安定稼働
4. Before / After（確定）
項目    Before    After
認証    JWT 残骸    100% セッション方式
初期化速度    5〜10秒    1秒前後
セキュリティ    部分未対応    CSRF/RateLimit 全API
テスト    21件スキップ    全 PASS
Dev環境    本番と差異    本番同等
暗号化    全体破損リスク    部分復元可能構造
容量管理    未実施    90日アーカイブ
ドキュメント    旧仕様混在    すべて統一
ビルド    Hobby 限界    Pro & CI/CD
5. Final Decision – Go / No-Go

結論：Phase 9.5 完了が Phase 10 の絶対条件。

このフェーズを完了させることで：

Phase 10（TODO + Calendar）

Phase 11（Action Map）

Phase 12（OKR）

を 高速・安全・破綻なし に実装できる状態が整う。

Phase 9.5 の完了は、Founders Direct Cockpit の
「本当のProduction-ready化」を意味する。
