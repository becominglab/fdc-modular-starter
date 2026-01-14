-- Phase 20 修正: workspace_members RLS ポリシーの無限再帰を修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;

-- 新しいポリシーを作成（無限再帰を避ける）

-- 1. ユーザーは自分のメンバーシップを閲覧可能（シンプルな直接チェック）
CREATE POLICY "Users can view own memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- 2. ユーザーは同じワークスペースのメンバーを閲覧可能
--    サブクエリで自分のworkspace_idを取得し、それを使ってフィルタ
CREATE POLICY "Users can view same workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- 3. OWNER は新しいメンバーを追加可能
CREATE POLICY "Owners can insert members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
  );

-- 4. OWNER/ADMIN はメンバーを更新可能
CREATE POLICY "Admins can update members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- 5. OWNER/ADMIN はメンバーを削除可能
CREATE POLICY "Admins can delete members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
