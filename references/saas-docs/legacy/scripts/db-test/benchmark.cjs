/**
 * benchmark.js
 *
 * Supabase データベース パフォーマンステスト (100 iteration)
 *
 * 実行方法:
 *   node benchmark.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env ファイルを読み込み
dotenv.config({ path: join(__dirname, '.env') });

console.log('===== Supabase DB パフォーマンステスト (100 iteration) =====\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 統計計算用ヘルパー
function calculateStats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { min, max, avg, p50, p95, p99 };
}

function formatTime(ms) {
  return `${ms.toFixed(2)}ms`;
}

async function runBenchmark() {
  try {
    console.log('🔧 準備中...\n');

    // テストユーザーを作成
    const testGoogleSub = `bench_${Date.now()}`;
    const testEmail = `bench_${Date.now()}@example.com`;

    const userResult = await pool.query(
      `INSERT INTO users (google_sub, email, name, picture, global_role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [testGoogleSub, testEmail, 'Benchmark User', null, 'normal']
    );

    const testUserId = String(userResult.rows[0].id);
    console.log(`✅ テストユーザー作成 (ID: ${testUserId})\n`);

    // ワークスペース作成
    const workspaceResult = await pool.query(
      `INSERT INTO workspaces (name, created_by, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [`Benchmark Workspace ${Date.now()}`, testUserId]
    );

    const testWorkspaceId = String(workspaceResult.rows[0].id);
    console.log(`✅ テストワークスペース作成 (ID: ${testWorkspaceId})\n`);

    // メンバー追加
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())`,
      [testWorkspaceId, testUserId, 'owner']
    );

    console.log('📊 ベンチマーク開始 (100 iteration)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. SELECT クエリベンチマーク
    console.log('1️⃣  SELECT クエリ (ユーザー取得) x 100');
    const selectTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
      selectTimes.push(Date.now() - start);

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   進捗: ${i + 1}/100\r`);
      }
    }
    console.log('');

    const selectStats = calculateStats(selectTimes);
    console.log(`   平均: ${formatTime(selectStats.avg)}`);
    console.log(`   P50: ${formatTime(selectStats.p50)}, P95: ${formatTime(selectStats.p95)}, P99: ${formatTime(selectStats.p99)}`);
    console.log(`   最小: ${formatTime(selectStats.min)}, 最大: ${formatTime(selectStats.max)}`);
    console.log('');

    // 2. INSERT クエリベンチマーク
    console.log('2️⃣  INSERT クエリ (監査ログ作成) x 100');
    const insertTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await pool.query(
        `INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [testWorkspaceId, testUserId, 'benchmark_test', 'test', `test_${i}`, JSON.stringify({ iteration: i })]
      );
      insertTimes.push(Date.now() - start);

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   進捗: ${i + 1}/100\r`);
      }
    }
    console.log('');

    const insertStats = calculateStats(insertTimes);
    console.log(`   平均: ${formatTime(insertStats.avg)}`);
    console.log(`   P50: ${formatTime(insertStats.p50)}, P95: ${formatTime(insertStats.p95)}, P99: ${formatTime(insertStats.p99)}`);
    console.log(`   最小: ${formatTime(insertStats.min)}, 最大: ${formatTime(insertStats.max)}`);
    console.log('');

    // 3. UPDATE クエリベンチマーク
    console.log('3️⃣  UPDATE クエリ (ユーザー更新) x 100');
    const updateTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await pool.query(
        'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
        [`Benchmark User ${i}`, testUserId]
      );
      updateTimes.push(Date.now() - start);

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   進捗: ${i + 1}/100\r`);
      }
    }
    console.log('');

    const updateStats = calculateStats(updateTimes);
    console.log(`   平均: ${formatTime(updateStats.avg)}`);
    console.log(`   P50: ${formatTime(updateStats.p50)}, P95: ${formatTime(updateStats.p95)}, P99: ${formatTime(updateStats.p99)}`);
    console.log(`   最小: ${formatTime(updateStats.min)}, 最大: ${formatTime(updateStats.max)}`);
    console.log('');

    // 4. JOIN クエリベンチマーク
    console.log('4️⃣  JOIN クエリ (メンバー一覧取得) x 100');
    const joinTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await pool.query(
        `SELECT wm.role, u.email, u.name
         FROM workspace_members wm
         INNER JOIN users u ON wm.user_id = u.id
         WHERE wm.workspace_id = $1`,
        [testWorkspaceId]
      );
      joinTimes.push(Date.now() - start);

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   進捗: ${i + 1}/100\r`);
      }
    }
    console.log('');

    const joinStats = calculateStats(joinTimes);
    console.log(`   平均: ${formatTime(joinStats.avg)}`);
    console.log(`   P50: ${formatTime(joinStats.p50)}, P95: ${formatTime(joinStats.p95)}, P99: ${formatTime(joinStats.p99)}`);
    console.log(`   最小: ${formatTime(joinStats.min)}, 最大: ${formatTime(joinStats.max)}`);
    console.log('');

    // 5. JSONB クエリベンチマーク
    console.log('5️⃣  JSONB クエリ (ワークスペースデータ保存・取得) x 100');
    const jsonbTimes = [];
    for (let i = 0; i < 100; i++) {
      const testData = {
        leads: Array(10).fill(null).map((_, j) => ({ id: `${i}_${j}`, name: `Lead ${j}` })),
        clients: [],
        todos: [],
      };

      const start = Date.now();

      // UPSERT
      await pool.query(
        `INSERT INTO workspace_data (workspace_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (workspace_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [testWorkspaceId, JSON.stringify(testData)]
      );

      // SELECT
      await pool.query(
        'SELECT data FROM workspace_data WHERE workspace_id = $1',
        [testWorkspaceId]
      );

      jsonbTimes.push(Date.now() - start);

      if ((i + 1) % 20 === 0) {
        process.stdout.write(`   進捗: ${i + 1}/100\r`);
      }
    }
    console.log('');

    const jsonbStats = calculateStats(jsonbTimes);
    console.log(`   平均: ${formatTime(jsonbStats.avg)}`);
    console.log(`   P50: ${formatTime(jsonbStats.p50)}, P95: ${formatTime(jsonbStats.p95)}, P99: ${formatTime(jsonbStats.p99)}`);
    console.log(`   最小: ${formatTime(jsonbStats.min)}, 最大: ${formatTime(jsonbStats.max)}`);
    console.log('');

    // サマリー
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 パフォーマンス サマリー (P95 基準)\n');

    const performanceTargets = {
      'SELECT (GET)': { p95: selectStats.p95, target: 350, unit: 'ms' },
      'INSERT (POST)': { p95: insertStats.p95, target: 450, unit: 'ms' },
      'UPDATE (PUT)': { p95: updateStats.p95, target: 450, unit: 'ms' },
      'JOIN (複雑クエリ)': { p95: joinStats.p95, target: 450, unit: 'ms' },
      'JSONB (暗号化想定)': { p95: jsonbStats.p95, target: 280, unit: 'ms' },
    };

    Object.entries(performanceTargets).forEach(([name, { p95, target, unit }]) => {
      const status = p95 < target ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${name}: ${formatTime(p95)} (目標: < ${target}${unit})`);
    });

    console.log('');
    console.log('🧹 クリーンアップ中...\n');

    // テストデータ削除
    await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);

    console.log('✅ ベンチマークテスト完了\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 接続を閉じました');
  }
}

runBenchmark();
