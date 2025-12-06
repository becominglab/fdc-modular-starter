/**
 * Phase 9.8-A: P95 サイズ計測スクリプト
 *
 * 目的: workspace_data の P95 サイズを計測し、圧縮前のベースラインを記録する
 * 実行: npx tsx scripts/measure-p95.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
})

async function measureP95() {
  console.log('📊 Phase 9.8-A: P95 サイズ計測開始...\n')

  try {
    // workspace_data の全データサイズを取得
    const result = await pool.query(`
      SELECT
        workspace_id,
        pg_column_size(data) AS size_bytes,
        ROUND(pg_column_size(data) / 1024.0, 2) AS size_kb
      FROM workspace_data
      ORDER BY workspace_id
    `)

    if (result.rows.length === 0) {
      console.log('⚠️  workspace_data にデータがありません')
      await pool.end()
      return
    }

    const sizes = result.rows.map((row: any) => ({
      workspaceId: row.workspace_id,
      sizeBytes: Number(row.size_bytes),
      sizeKB: Number(row.size_kb),
    }))

    // ソート
    const sortedSizes = [...sizes].sort((a, b) => a.sizeKB - b.sizeKB)

    // 統計計算
    const total = sizes.length
    const avgKB = sizes.reduce((sum, s) => sum + s.sizeKB, 0) / total
    const p50Index = Math.floor(total * 0.5)
    const p95Index = Math.floor(total * 0.95)
    const p50KB = sortedSizes[p50Index]?.sizeKB || 0
    const p95KB = sortedSizes[p95Index]?.sizeKB || 0
    const maxKB = sortedSizes[total - 1]?.sizeKB || 0

    // 結果表示
    console.log('📈 統計結果:')
    console.log(`   合計ワークスペース数: ${total}`)
    console.log(`   平均サイズ: ${avgKB.toFixed(2)} KB`)
    console.log(`   P50 (中央値): ${p50KB.toFixed(2)} KB`)
    console.log(`   P95: ${p95KB.toFixed(2)} KB`)
    console.log(`   最大サイズ: ${maxKB.toFixed(2)} KB`)
    console.log()

    // DOD チェック
    const threshold = 200 // KB
    if (p95KB < threshold) {
      console.log(`✅ DOD 達成: P95 (${p95KB.toFixed(2)} KB) < ${threshold} KB`)
    } else {
      console.log(`⚠️  警告: P95 (${p95KB.toFixed(2)} KB) >= ${threshold} KB`)
      console.log('   Phase 10 開始前に軽量化策を検討してください')
    }
    console.log()

    // 200KB超過のワークスペース一覧
    const oversized = sizes.filter(s => s.sizeKB > threshold)
    if (oversized.length > 0) {
      console.log(`⚠️  ${threshold}KB 超過ワークスペース (${oversized.length}件):`)
      oversized
        .sort((a, b) => b.sizeKB - a.sizeKB)
        .forEach(s => {
          console.log(`   - Workspace ${s.workspaceId}: ${s.sizeKB.toFixed(2)} KB`)
        })
    } else {
      console.log(`✅ ${threshold}KB を超過しているワークスペースはありません`)
    }

    await pool.end()
  } catch (error) {
    console.error('❌ エラー:', error)
    await pool.end()
    process.exit(1)
  }
}

measureP95()
