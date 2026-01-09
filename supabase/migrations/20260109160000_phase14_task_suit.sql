-- Phase 14: タスクに suit（4象限）と google_event_id を追加

-- suit カラム追加（4象限分類）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS suit TEXT CHECK (suit IN ('spade', 'heart', 'diamond', 'club'));

-- Google Calendar イベントID（紐付け用）
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_suit ON tasks(suit);
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON tasks(google_event_id);

-- コメント
COMMENT ON COLUMN tasks.suit IS '4象限分類: spade(緊急重要), heart(重要), diamond(緊急), club(未来創造)';
COMMENT ON COLUMN tasks.google_event_id IS 'Google Calendar イベントID（紐付け用）';
