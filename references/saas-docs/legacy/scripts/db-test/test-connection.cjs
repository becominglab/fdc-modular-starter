/**
 * test-connection.js
 *
 * Supabase データベース接続テスト
 *
 * 実行方法:
 *   node test-connection.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env ファイルを読み込み
dotenv.config({ path: join(__dirname, '.env') });

console.log('===== Supabase DB 接続テスト =====\n');

// 環境変数の確認
console.log('📋 環境変数チェック:');
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL が設定されていません');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
console.log(`✅ DATABASE_URL: ${dbUrl.substring(0, 30)}...`);

// Supabase かどうか確認
if (dbUrl.includes('supabase')) {
  console.log('✅ Supabase 接続文字列を確認');
} else if (dbUrl.includes('neon')) {
  console.log('⚠️  警告: Neon 接続文字列が検出されました');
} else {
  console.log('ℹ️  PostgreSQL 接続文字列');
}

console.log('');

// Pool 作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('🔌 データベース接続テスト開始...\n');

    // 1. 基本接続テスト
    console.log('1️⃣  基本接続テスト');
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const elapsed = Date.now() - startTime;

    console.log(`   ✅ 接続成功 (${elapsed}ms)`);
    console.log(`   📅 現在時刻: ${result.rows[0].current_time}`);
    console.log(`   🗄️  PostgreSQL バージョン: ${result.rows[0].pg_version.substring(0, 50)}...`);
    console.log('');

    // 2. テーブル存在確認
    console.log('2️⃣  テーブル存在確認');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const expectedTables = ['users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs', 'workspace_keys'];
    const existingTables = tables.rows.map(r => r.table_name);

    console.log(`   📊 検出されたテーブル: ${existingTables.length}個`);
    expectedTables.forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (未作成)`);
      }
    });
    console.log('');

    // 3. RLS ポリシー確認
    console.log('3️⃣  RLS (Row Level Security) ポリシー確認');
    const rlsTables = await pool.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('   RLS 有効化状態:');
    rlsTables.rows.forEach(row => {
      const status = row.rowsecurity ? '✅ 有効' : '⚠️  無効';
      console.log(`   ${status} ${row.tablename}`);
    });
    console.log('');

    // 4. レコード数確認
    console.log('4️⃣  レコード数確認');
    for (const tableName of expectedTables.filter(t => existingTables.includes(t))) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   📋 ${tableName}: ${countResult.rows[0].count} 件`);
      } catch (err) {
        console.log(`   ⚠️  ${tableName}: エラー (${err.message})`);
      }
    }
    console.log('');

    // 5. コネクションプール状態
    console.log('5️⃣  コネクションプール状態');
    console.log(`   総接続数: ${pool.totalCount}`);
    console.log(`   アイドル接続数: ${pool.idleCount}`);
    console.log(`   待機中クライアント数: ${pool.waitingCount}`);
    console.log('');

    console.log('✅ すべての接続テストが完了しました\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 接続を閉じました');
  }
}

testConnection();
