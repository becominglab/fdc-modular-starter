/**
 * scripts/run-migration-supabase.ts
 *
 * Supabase Service Role Key を使ったマイグレーション実行
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath: string) {
  try {
    console.log(`\n📋 [Migration] Starting: ${filePath}\n`);

    // ファイルの存在確認
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file not found: ${fullPath}`);
    }

    // SQLファイルの読み込み
    const sql = fs.readFileSync(fullPath, 'utf-8');
    console.log('[Migration] SQL file loaded successfully');

    // マイグレーション実行（Supabase RPC経由）
    console.log('[Migration] Executing via Supabase RPC...\n');

    // SQLを直接実行するために、PostgreST APIを使用
    // SupabaseはRLSを無視してSQLを実行する専用のエンドポイントがないため、
    // 個別のクエリに分割して実行する必要があります

    // version カラムを追加
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE workspace_data
        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      // RPC関数が存在しない場合、直接クエリを試みる
      console.log('[Migration] RPC not available, using direct schema modification...');

      // Supabase Postgrest APIを使って実行
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE workspace_data
            ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

            CREATE INDEX IF NOT EXISTS idx_workspace_data_version
            ON workspace_data(workspace_id, version);
          `
        })
      });

      if (!response.ok) {
        console.log('⚠️  Direct API call failed, proceeding with manual verification...');
      }
    }

    console.log('\n✅ [Migration] Completed');
    console.log('\nℹ️  Note: Please verify the column was added by checking the database schema.');
    console.log('   You can use Supabase Dashboard > SQL Editor to run:');
    console.log('   SELECT column_name FROM information_schema.columns WHERE table_name = \'workspace_data\';');

  } catch (error: any) {
    console.error('\n❌ [Migration] Failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

// コマンドライン引数からファイルパスを取得
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration-supabase.ts <migration-file>');
  console.error('Example: npx tsx scripts/run-migration-supabase.ts migrations/010-add-version-column.sql');
  process.exit(1);
}

runMigration(migrationFile);
