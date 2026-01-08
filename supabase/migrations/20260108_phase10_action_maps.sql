-- Phase 10: Action Map テーブル作成
-- 実行日: 2026-01-08

-- Action Maps テーブル
CREATE TABLE IF NOT EXISTS action_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_period_start DATE,
  target_period_end DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE action_maps ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own action_maps"
  ON action_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action_maps"
  ON action_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action_maps"
  ON action_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action_maps"
  ON action_maps FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_action_maps_user_id ON action_maps(user_id);
CREATE INDEX idx_action_maps_is_archived ON action_maps(is_archived);

-- Action Items テーブル
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_map_id UUID REFERENCES action_maps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done')),
  parent_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own action_items"
  ON action_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action_items"
  ON action_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action_items"
  ON action_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action_items"
  ON action_items FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_action_items_action_map_id ON action_items(action_map_id);
CREATE INDEX idx_action_items_user_id ON action_items(user_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_parent ON action_items(parent_item_id);

-- tasks テーブルに action_item_id カラム追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_action_item_id ON tasks(action_item_id);
