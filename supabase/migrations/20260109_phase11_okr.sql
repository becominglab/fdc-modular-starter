-- =============================================
-- Phase 11: OKR（戦略層）テーブル作成
-- =============================================

-- 1. objectives テーブル
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  period TEXT NOT NULL,  -- 'Q1 2025', '2025年上期' など
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. key_results テーブル
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',  -- '%', '円', '件', '人' など
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. action_maps に key_result_id を追加
ALTER TABLE action_maps
ADD COLUMN IF NOT EXISTS key_result_id UUID REFERENCES key_results(id) ON DELETE SET NULL;

-- 4. RLS ポリシー設定
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

-- objectives ポリシー
CREATE POLICY "Users can view own objectives" ON objectives
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own objectives" ON objectives
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objectives" ON objectives
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own objectives" ON objectives
  FOR DELETE USING (auth.uid() = user_id);

-- key_results ポリシー
CREATE POLICY "Users can view own key_results" ON key_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own key_results" ON key_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own key_results" ON key_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own key_results" ON key_results
  FOR DELETE USING (auth.uid() = user_id);

-- 5. インデックス作成
CREATE INDEX IF NOT EXISTS idx_objectives_user_id ON objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_key_results_objective_id ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_key_results_user_id ON key_results(user_id);
CREATE INDEX IF NOT EXISTS idx_action_maps_key_result_id ON action_maps(key_result_id);

-- 6. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
