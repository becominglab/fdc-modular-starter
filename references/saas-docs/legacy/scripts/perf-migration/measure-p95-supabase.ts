/**
 * Phase 9.8-A: P95 サイズ計測スクリプト (Supabase SDK版)
 *
 * 目的: workspace_data の P95 サイズを計測し、圧縮前のベースラインを記録する
 * 実行: npx tsx scripts/measure-p95-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function measureP95() {
  console.log('📊 Phase 9.8-A: P95 サイズ計測開始...\n')

  try {
    // workspace_data の全データを取得
    const { data: workspaceData, error } = await supabase
      .from('workspace_data')
      .select('workspace_id, data')
      .order('workspace_id')

    if (error) {
      throw new Error(`データ取得エラー: ${error.message}`)
    }

    if (!workspaceData || workspaceData.length === 0) {
      console.log('⚠️  workspace_data にデータがありません')
      return
    }

    // サイズを計算
    const sizes = workspaceData.map(row => {
      const jsonStr = JSON.stringify(row.data)
      const sizeBytes = new TextEncoder().encode(jsonStr).length
      const sizeKB = sizeBytes / 1024
      return {
        workspaceId: row.workspace_id,
        sizeBytes,
        sizeKB
      }
    })

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

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

measureP95()
