📘 PHASE9-DB-MIGRATION-DESIGN.md
Founders Direct Cockpit (FDC)
Phase 9 – DB基盤移行（Neon → Supabase）設計方針レポート

作成日: 2025-11-17
担当: DB基盤移行エンジニア

1. 目的

Founders Direct Cockpit (FDC) のデータベース基盤を
Vercel Postgres (Neon) から Supabase（PostgreSQL） へ移行する。

移行範囲

DB 接続レイヤーのみ を Supabase に切り替える。

認証・暗号化・RLSロジック（Row Level Security）は変更しない。

ゴール

暗号化・RLS・E2Eテストを壊さずに、DB接続先のみを Supabase に切り替える。

制約

破壊的変更は禁止（appData構造・APIレスポンス形式・RLSポリシーを維持）。

Phase 9 は「既存機能の完成」であり、新機能追加は禁止。

2. 変更対象ファイル一覧
2.1 コアレイヤー（必須変更）
ファイル	変更内容	理由
api/_lib/db.ts	必須変更	Neon 依存の @vercel/postgres を pg（node-postgres）へ置換
api/_lib/keyManagement.ts	必須変更	sql タグ関数を pool.query() に変更
package.json	必須変更	@vercel/postgres 削除、pg 追加
.env.local / Vercel環境変数	必須変更	SUPABASE_DB_URL 追加
2.2 依存ファイル（影響の確認のみ）
ファイル	影響	対応
api/_lib/auth.ts	影響なし	db.ts を介して接続（直接依存なし）
api/_lib/encryption.ts	影響なし	crypto のみ使用
api/workspaces/index.ts	影響なし	db.ts 経由
api/reports/*.ts	影響なし	db.ts 経由
api/audit-logs/index.ts	影響なし	db.ts 経由
migrations/*.sql	影響なし	PostgreSQL 標準のため Supabase でも使用可能
3. Neon 依存分析と現状把握
3.1 現在の接続方式（Neon）
import { sql } from '@vercel/postgres';

const result = await sql`
  SELECT * FROM users WHERE id = ${userId}
`;


特徴:

自動接続管理

SQLインジェクション対策済み（タグ関数）

Neon専用で Supabase には使えない

3.2 使用箇所カウント
関数	使用回数	内容
`sql`` タグ	約40ヶ所	CRUD 全般
setRLSUserId()	全API	SET LOCAL app.current_user_id = ...
トランザクション	0回	現在は未使用（コメント有）
4. Supabase 接続方式の設計
4.1 採用方式：pg (node-postgres)

採用理由

SQL文をそのまま使える（最小変更）

Supabase の PostgreSQL が RLS をフルサポート

トランザクションが利用可能

Vercel Serverless Functions で実績豊富

4.2 接続方式比較
方式	メリット	デメリット	採用
pg	標準的、柔軟、低変更	コネクションプール必要	採用
@supabase/supabase-js	Supabase公式	全SQL書き換え必要	不採用
@vercel/postgres	-	Neon専用	不採用
4.3 コネクションプール設計
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
  return pool;
}


シングルトンでプール管理

Vercel Serverless Functions の再利用を想定

10接続程度に抑制（Supabase Free プラン上限を考慮）

4.4 SQL の置換
Before (Neon)
const result = await sql`
  SELECT * FROM users WHERE id = ${userId}
`;

After (Supabase)
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);


${変数} → $1 プレースホルダ

パラメータは配列で渡す

SQLインジェクション対策は維持

4.5 RLS セッション変数
await pool.query(
  'SET LOCAL app.current_user_id = $1',
  [userId]
);


Supabase PostgreSQL で完全に互換あり。

5. 互換性・暗号化・RLS への影響
5.1 RLS
項目	Neon	Supabase	結論
RLSポリシー	〇	〇	変更不要
SET LOCAL	〇	〇	完全互換
5.2 暗号化（AES-256-GCM）

encryption.ts → 変更なし

keyManagement.ts → SQL書き換えのみ

アルゴリズムは DB 非依存で完全互換

5.3 AppData / API response

JSONB構造 → PostgreSQL 標準

既存型定義 → 全て互換

APIレスポンス形式 → 変更不要

6. リスクと対策
6.1 コネクションプール枯渇

max 10 に抑制

Supabase 側の接続制限（Free: 60, Pro: 200）を考慮

client.release() の徹底

6.2 Vercel の Cold Start

keepAlive: true

タイムアウト短縮

任意：ヘルスチェックによるウォームアップ

6.3 PostgreSQL バージョン差異

標準SQLしか使用していないため影響小

マイグレーション実行時にエラー確認

E2Eテストで最終確認

6.4 性能劣化

Performance Specification v1.0 の基準に従う

GET API: P95 < 350ms

POST API: P95 < 450ms

暗号化保存: P95 < 180ms

復号: P95 < 280ms

移行後：簡易ベンチマークで比較。

7. 環境変数の設計
7.1 新規
変数名	意味
SUPABASE_DB_URL	Supabase の Postgres 接続URL

（オプション）SUPABASE_DB_URL_READONLY

7.2 既存（維持）

MASTER_ENCRYPTION_KEY

JWT_SECRET

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

7.3 切り替え戦略
Option 1: フィーチャーフラグ

環境変数 USE_SUPABASE で ON/OFF

Option 2: 完全切替（推奨）

dev → Supabase

preview → Supabase

本番は準備できた段階で切り替え

Neon の DATABASE_URL は移行完了まで残す

8. まとめと次ステップ
8.1 設計方針の結論
項目	結論
接続方式	pg (node-postgres)
変更範囲	db.ts, keyManagement.ts, package.json
RLS/暗号化	完全互換（変更不要）
主リスク	コネクション管理 / Performance
必須条件	Phase 9 の全33テストを PASS すること
8.2 次ステップ（Task 2〜5）

Task 2: package.json, db.ts, keyManagement.ts を pg 接続へ書き換え

Task 3: Supabase スキーマ移行・データ移行手順書を作成

Task 4: 影響ファイルの微修正

Task 5: 全テストを Supabase 接続で PASS させる