-- Phase 15: 10ポイントブランド戦略

-- =============================================
-- brands テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  story TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);

-- RLS 有効化
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own brands" ON brands;
CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brands" ON brands;
CREATE POLICY "Users can insert own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brands" ON brands;
CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own brands" ON brands;
CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- brand_points テーブル（10ポイント）
-- =============================================
CREATE TABLE IF NOT EXISTS brand_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  point_type TEXT NOT NULL CHECK (point_type IN (
    'mission', 'vision', 'target_audience', 'unique_value',
    'brand_personality', 'tone_voice', 'visual_identity',
    'key_messages', 'competitors', 'differentiators'
  )),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, point_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_brand_points_brand_id ON brand_points(brand_id);

-- RLS 有効化
ALTER TABLE brand_points ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（brands 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own brand points" ON brand_points;
CREATE POLICY "Users can view own brand points" ON brand_points
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own brand points" ON brand_points;
CREATE POLICY "Users can insert own brand points" ON brand_points
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own brand points" ON brand_points;
CREATE POLICY "Users can update own brand points" ON brand_points
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own brand points" ON brand_points;
CREATE POLICY "Users can delete own brand points" ON brand_points
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_points.brand_id AND brands.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE brands IS 'ブランド基本情報';
COMMENT ON TABLE brand_points IS '10ポイントブランド戦略';
COMMENT ON COLUMN brand_points.point_type IS 'mission, vision, target_audience, unique_value, brand_personality, tone_voice, visual_identity, key_messages, competitors, differentiators';
