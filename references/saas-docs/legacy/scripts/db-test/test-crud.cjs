/**
 * test-crud.js
 *
 * Supabase データベース CRUD操作テスト
 *
 * 実行方法:
 *   node test-crud.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env ファイルを読み込み
dotenv.config({ path: join(__dirname, '.env') });

console.log('===== Supabase DB CRUD操作テスト =====\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let testUserId = null;
let testWorkspaceId = null;

async function testCRUD() {
  try {
    console.log('🧪 CRUD操作テスト開始\n');

    // 1. CREATE - ユーザー作成
    console.log('1️⃣  CREATE: テストユーザー作成');
    const testGoogleSub = `test_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;

    const userResult = await pool.query(
      `INSERT INTO users (google_sub, email, name, picture, global_role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, google_sub, email, name, global_role`,
      [testGoogleSub, testEmail, 'Test User', null, 'normal']
    );

    testUserId = String(userResult.rows[0].id);
    console.log(`   ✅ ユーザー作成成功 (ID: ${testUserId})`);
    console.log(`   📧 Email: ${userResult.rows[0].email}`);
    console.log('');

    // 2. READ - ユーザー取得
    console.log('2️⃣  READ: ユーザー取得');
    const getUserResult = await pool.query(
      'SELECT id, google_sub, email, name, global_role FROM users WHERE id = $1',
      [testUserId]
    );

    if (getUserResult.rows.length > 0) {
      console.log(`   ✅ ユーザー取得成功`);
      console.log(`   👤 Name: ${getUserResult.rows[0].name}`);
      console.log(`   🔑 Role: ${getUserResult.rows[0].global_role}`);
    } else {
      console.log(`   ❌ ユーザーが見つかりません`);
    }
    console.log('');

    // 3. UPDATE - ユーザー更新
    console.log('3️⃣  UPDATE: ユーザー情報更新');
    await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
      ['Updated Test User', testUserId]
    );

    const updatedUserResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [testUserId]
    );

    console.log(`   ✅ ユーザー更新成功`);
    console.log(`   👤 更新後の名前: ${updatedUserResult.rows[0].name}`);
    console.log('');

    // 4. CREATE - ワークスペース作成
    console.log('4️⃣  CREATE: テストワークスペース作成');
    const workspaceResult = await pool.query(
      `INSERT INTO workspaces (name, created_by, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, name`,
      [`Test Workspace ${Date.now()}`, testUserId]
    );

    testWorkspaceId = String(workspaceResult.rows[0].id);
    console.log(`   ✅ ワークスペース作成成功 (ID: ${testWorkspaceId})`);
    console.log(`   🏢 Name: ${workspaceResult.rows[0].name}`);
    console.log('');

    // 5. CREATE - ワークスペースメンバー追加
    console.log('5️⃣  CREATE: ワークスペースメンバー追加');
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())`,
      [testWorkspaceId, testUserId, 'owner']
    );

    console.log(`   ✅ メンバー追加成功 (Role: owner)`);
    console.log('');

    // 6. READ - ワークスペースメンバー取得
    console.log('6️⃣  READ: ワークスペースメンバー取得');
    const membersResult = await pool.query(
      `SELECT wm.role, u.email, u.name
       FROM workspace_members wm
       INNER JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1`,
      [testWorkspaceId]
    );

    console.log(`   ✅ メンバー取得成功: ${membersResult.rows.length}人`);
    membersResult.rows.forEach(member => {
      console.log(`   👤 ${member.name} (${member.email}) - ${member.role}`);
    });
    console.log('');

    // 7. CREATE - ワークスペースデータ保存
    console.log('7️⃣  CREATE: ワークスペースデータ保存');
    const testData = {
      leads: [],
      clients: [],
      todos: [{ id: '1', title: 'Test TODO', completed: false }],
    };

    await pool.query(
      `INSERT INTO workspace_data (workspace_id, data, updated_at)
       VALUES ($1, $2, NOW())`,
      [testWorkspaceId, JSON.stringify(testData)]
    );

    console.log(`   ✅ ワークスペースデータ保存成功`);
    console.log('');

    // 8. READ - ワークスペースデータ取得
    console.log('8️⃣  READ: ワークスペースデータ取得');
    const dataResult = await pool.query(
      'SELECT data FROM workspace_data WHERE workspace_id = $1',
      [testWorkspaceId]
    );

    if (dataResult.rows.length > 0) {
      const retrievedData = dataResult.rows[0].data;
      console.log(`   ✅ データ取得成功`);
      console.log(`   📋 TODOs: ${retrievedData.todos?.length || 0}件`);
      console.log(`   👥 Leads: ${retrievedData.leads?.length || 0}件`);
      console.log(`   🏢 Clients: ${retrievedData.clients?.length || 0}件`);
    }
    console.log('');

    // 9. DELETE - クリーンアップ
    console.log('9️⃣  DELETE: テストデータクリーンアップ');

    // workspace_data は workspace の CASCADE で削除される
    // workspace_members も workspace の CASCADE で削除される
    await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId]);
    console.log(`   ✅ ワークスペース削除 (CASCADE により関連データも削除)`);

    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log(`   ✅ ユーザー削除`);
    console.log('');

    // 10. 削除確認
    console.log('🔟 削除確認');
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
    const checkWorkspace = await pool.query('SELECT * FROM workspaces WHERE id = $1', [testWorkspaceId]);

    if (checkUser.rows.length === 0) {
      console.log(`   ✅ ユーザー削除確認: 正しく削除されました`);
    } else {
      console.log(`   ❌ ユーザーがまだ存在します`);
    }

    if (checkWorkspace.rows.length === 0) {
      console.log(`   ✅ ワークスペース削除確認: 正しく削除されました`);
    } else {
      console.log(`   ❌ ワークスペースがまだ存在します`);
    }
    console.log('');

    console.log('✅ すべてのCRUD操作テストが完了しました\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error);

    // クリーンアップを試行
    try {
      if (testWorkspaceId) {
        await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId]);
      }
      if (testUserId) {
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
      console.log('⚠️  クリーンアップを実行しました');
    } catch (cleanupError) {
      console.error('⚠️  クリーンアップ中にエラー:', cleanupError.message);
    }

    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 接続を閉じました');
  }
}

testCRUD();
