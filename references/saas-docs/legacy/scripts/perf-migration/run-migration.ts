#!/usr/bin/env tsx
/**
 * scripts/run-migration.ts
 *
 * マイグレーション実行スクリプト
 *
 * 使用法:
 *   npx tsx scripts/run-migration.ts migrations/010-add-version-column.sql
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// マイグレーション用に Direct Connection を使用
const directDbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!directDbUrl) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL is not set in .env.local');
  process.exit(1);
}

console.log(`[Migration] Using DB: ${directDbUrl.replace(/:[^:@]+@/, ':***@')}`);

// 専用のプールを作成
const pool = new Pool({
  connectionString: directDbUrl,
});

async function runMigration(filePath: string) {
  try {
    console.log(`\n[Migration] Starting: ${filePath}`);

    // ファイルの存在確認
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file not found: ${fullPath}`);
    }

    // SQLファイルの読み込み
    const sql = fs.readFileSync(fullPath, 'utf-8');
    console.log('[Migration] SQL file loaded successfully');

    // マイグレーション実行
    console.log('[Migration] Executing...');
    const result = await pool.query(sql);

    console.log('[Migration] ✅ Completed successfully');
    console.log(`[Migration] Rows affected: ${result.rowCount ?? 'N/A'}`);

    // プールを終了
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Failed:');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

// コマンドライン引数からファイルパスを取得
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error('Example: npx tsx scripts/run-migration.ts migrations/010-add-version-column.sql');
  process.exit(1);
}

runMigration(migrationFile);
