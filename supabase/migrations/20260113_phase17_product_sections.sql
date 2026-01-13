-- Phase 17: 製品セクション（フロント/ミドル/バック）

-- =============================================
-- product_sections テーブル（製品セクション）
-- =============================================
CREATE TABLE IF NOT EXISTS product_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '製品セクション',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_product_sections_brand_id ON product_sections(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_sections_user_id ON product_sections(user_id);

-- RLS 有効化
ALTER TABLE product_sections ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
DROP POLICY IF EXISTS "Users can view own product sections" ON product_sections;
CREATE POLICY "Users can view own product sections" ON product_sections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own product sections" ON product_sections;
CREATE POLICY "Users can insert own product sections" ON product_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own product sections" ON product_sections;
CREATE POLICY "Users can update own product sections" ON product_sections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own product sections" ON product_sections;
CREATE POLICY "Users can delete own product sections" ON product_sections
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- products テーブル（個別商品）
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES product_sections(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('front', 'middle', 'back')),
  name TEXT NOT NULL,
  description TEXT,
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('free', 'fixed', 'range', 'custom')),
  price_min INTEGER,
  price_max INTEGER,
  price_label TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'online' CHECK (delivery_type IN ('online', 'offline', 'hybrid')),
  duration TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audience TEXT,
  conversion_goal TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_flagship BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_section_id ON products(section_id);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);

-- RLS 有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（product_sections 経由で権限チェック）
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM product_sections WHERE product_sections.id = products.section_id AND product_sections.user_id = auth.uid())
  );

-- コメント
COMMENT ON TABLE product_sections IS '製品セクション（フロント/ミドル/バック商品群）';
COMMENT ON TABLE products IS '個別商品';
COMMENT ON COLUMN products.tier IS 'front=フロント商品, middle=ミドル商品, back=バック商品';
COMMENT ON COLUMN products.price_type IS 'free=無料, fixed=固定価格, range=価格帯, custom=要相談';
COMMENT ON COLUMN products.delivery_type IS 'online=オンライン, offline=オフライン, hybrid=ハイブリッド';
COMMENT ON COLUMN products.features IS '商品の特徴・含まれるもの（JSON配列）';
COMMENT ON COLUMN products.is_flagship IS 'その層の主力商品かどうか';
