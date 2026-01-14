-- Phase 20 修正 v2: workspace_members RLS ポリシーの無限再帰を修正
-- SECURITY DEFINER 関数を使用して RLS チェックをバイパス

-- =============================================
-- ヘルパー関数の作成（SECURITY DEFINER）
-- =============================================

-- ユーザーがワークスペースのメンバーかどうかをチェック
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- ユーザーのワークスペースでのロールを取得
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM workspace_members
  WHERE workspace_id = ws_id
    AND user_id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- ユーザーが所属するワークスペースIDの一覧を取得
CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS SETOF UUID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- workspace_members のRLSポリシーを再作成
-- =============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view same workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can delete members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;

-- 新しいポリシー: ユーザーは自分のメンバーシップを閲覧可能
CREATE POLICY "Users can view own memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- 新しいポリシー: 同じワークスペースのメンバーを閲覧可能
CREATE POLICY "Users can view same workspace members" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- 新しいポリシー: OWNER/ADMINは新しいメンバーを追加可能
CREATE POLICY "Admins can insert members" ON workspace_members
  FOR INSERT WITH CHECK (get_workspace_role(workspace_id) IN ('owner', 'admin'));

-- 新しいポリシー: OWNER/ADMINはメンバーを更新可能
CREATE POLICY "Admins can update members" ON workspace_members
  FOR UPDATE USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

-- 新しいポリシー: OWNER/ADMINはメンバーを削除可能
CREATE POLICY "Admins can delete members" ON workspace_members
  FOR DELETE USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

-- =============================================
-- invitations のRLSポリシーも修正
-- =============================================

DROP POLICY IF EXISTS "Admins can view workspace invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

CREATE POLICY "Admins can view workspace invitations" ON invitations
  FOR SELECT USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (get_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete invitations" ON invitations
  FOR DELETE USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

-- =============================================
-- audit_logs のRLSポリシーも修正
-- =============================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Members can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (get_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Members can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
