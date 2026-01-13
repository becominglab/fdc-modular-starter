-- ==============================================
-- Phase 19: MVV（Mission/Vision/Value）
-- ==============================================

-- MVV テーブル
CREATE TABLE IF NOT EXISTS mvv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission TEXT,
  vision TEXT,
  values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1ブランドに1つのMVV
  CONSTRAINT unique_brand_mvv UNIQUE (brand_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mvv_brand_id ON mvv(brand_id);
CREATE INDEX IF NOT EXISTS idx_mvv_user_id ON mvv(user_id);

-- RLS 有効化
ALTER TABLE mvv ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 自分のMVVのみ
CREATE POLICY "Users can manage own mvv"
  ON mvv
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_mvv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mvv_updated_at
  BEFORE UPDATE ON mvv
  FOR EACH ROW
  EXECUTE FUNCTION update_mvv_updated_at();
