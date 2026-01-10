-- Phase 16: Lean Canvas（リーンキャンバス）

-- =============================================
-- lean_canvas テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS lean_canvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Lean Canvas',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_lean_canvas_brand_id ON lean_canvas(brand_id);
CREATE INDEX IF NOT EXISTS idx_lean_canvas_user_id ON lean_canvas(user_id);

-- RLS 有効化
ALTER TABLE lean_canvas ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own lean canvas" ON lean_canvas;
CREATE POLICY "Users can view own lean canvas" ON lean_canvas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lean canvas" ON lean_canvas;
CREATE POLICY "Users can insert own lean canvas" ON lean_canvas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lean canvas" ON lean_canvas;
CREATE POLICY "Users can update own lean canvas" ON lean_canvas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lean canvas" ON lean_canvas;
CREATE POLICY "Users can delete own lean canvas" ON lean_canvas
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- lean_canvas_blocks テーブル（9ブロック）
-- =============================================
CREATE TABLE IF NOT EXISTS lean_canvas_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES lean_canvas(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'problem', 'solution', 'unique_value',
    'unfair_advantage', 'customer_segments',
    'key_metrics', 'channels',
    'cost_structure', 'revenue_streams'
  )),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvas_id, block_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_lean_canvas_blocks_canvas_id ON lean_canvas_blocks(canvas_id);

-- RLS 有効化
ALTER TABLE lean_canvas_blocks ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（lean_canvas 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can view own canvas blocks" ON lean_canvas_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can insert own canvas blocks" ON lean_canvas_blocks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can update own canvas blocks" ON lean_canvas_blocks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own canvas blocks" ON lean_canvas_blocks;
CREATE POLICY "Users can delete own canvas blocks" ON lean_canvas_blocks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM lean_canvas WHERE lean_canvas.id = lean_canvas_blocks.canvas_id AND lean_canvas.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE lean_canvas IS 'Lean Canvas（リーンキャンバス）';
COMMENT ON TABLE lean_canvas_blocks IS 'Lean Canvas の9ブロック';
COMMENT ON COLUMN lean_canvas_blocks.block_type IS 'problem, solution, unique_value, unfair_advantage, customer_segments, key_metrics, channels, cost_structure, revenue_streams';
COMMENT ON COLUMN lean_canvas_blocks.content IS '箇条書きリスト（JSON配列）';
