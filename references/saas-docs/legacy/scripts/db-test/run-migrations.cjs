/**
 * run-migrations.js
 *
 * Supabase データベースにマイグレーションを適用
 *
 * 実行方法:
 *   node run-migrations.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env ファイルを読み込み
dotenv.config({ path: join(__dirname, '.env') });

console.log('===== Supabase マイグレーション実行 =====\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function runMigrations() {
  try {
    console.log('📋 マイグレーションファイル確認中...\n');

    const migrations = [
      '000-base-schema.sql',
      '001-rls-policies.sql',
      '002-workspace-keys.sql',
    ];

    for (const migrationFile of migrations) {
      console.log(`🔧 ${migrationFile} を適用中...`);

      const migrationPath = join(__dirname, 'migrations', migrationFile);
      const sql = readFileSync(migrationPath, 'utf-8');

      const start = Date.now();
      await pool.query(sql);
      const elapsed = Date.now() - start;

      console.log(`   ✅ 完了 (${elapsed}ms)`);
      console.log('');
    }

    console.log('✅ すべてのマイグレーションが完了しました\n');

    // テーブル確認
    console.log('📊 作成されたテーブル確認:');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    tables.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

    console.log('');

  } catch (error) {
    console.error('❌ マイグレーションエラー:');
    console.error(error.message);
    console.error('\n詳細:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 接続を閉じました');
  }
}

runMigrations();
