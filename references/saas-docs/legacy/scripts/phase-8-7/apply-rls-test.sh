#!/bin/bash

# ===================================================================
# Phase 8-7: テストDB への RLS ポリシー適用スクリプト
# ===================================================================
#
# 【目的】
# テスト環境に RLS ポリシーを適用する
#
# 【使用方法】
# export TEST_DATABASE_URL="postgres://..."
# ./scripts/phase-8-7/apply-rls-test.sh
#
# ===================================================================

set -e  # エラーが発生したら即座に終了

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Phase 8-7] テストDB への RLS ポリシー適用を開始...${NC}"

# 環境変数チェック
if [ -z "$TEST_DATABASE_URL" ]; then
  echo -e "${RED}[ERROR] TEST_DATABASE_URL 環境変数が設定されていません${NC}"
  echo "Usage: export TEST_DATABASE_URL=\"postgres://...\" && ./apply-rls-test.sh"
  exit 1
fi

# マイグレーションファイルのパス
MIGRATION_DIR="migrations"
RLS_MIGRATION="${MIGRATION_DIR}/001-rls-policies.sql"
KEYS_MIGRATION="${MIGRATION_DIR}/002-workspace-keys.sql"

# ファイル存在確認
if [ ! -f "$RLS_MIGRATION" ]; then
  echo -e "${RED}[ERROR] マイグレーションファイルが見つかりません: ${RLS_MIGRATION}${NC}"
  exit 1
fi

if [ ! -f "$KEYS_MIGRATION" ]; then
  echo -e "${RED}[ERROR] マイグレーションファイルが見つかりません: ${KEYS_MIGRATION}${NC}"
  exit 1
fi

# 1. workspace_keys テーブルを作成（未作成の場合）
echo -e "${YELLOW}[INFO] workspace_keys テーブルを作成中...${NC}"
psql "$TEST_DATABASE_URL" -f "$KEYS_MIGRATION" || {
  echo -e "${YELLOW}[WARNING] workspace_keys テーブルは既に存在するか、エラーが発生しました${NC}"
}

# 2. RLS ポリシーを適用
echo -e "${YELLOW}[INFO] RLS ポリシーを適用中...${NC}"
psql "$TEST_DATABASE_URL" -f "$RLS_MIGRATION"

# 3. 適用確認
echo -e "${YELLOW}[INFO] RLS が有効になっているか確認中...${NC}"
psql "$TEST_DATABASE_URL" -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs');
"

echo -e "${GREEN}[SUCCESS] RLS ポリシーが正常に適用されました!${NC}"
echo -e "${GREEN}[Phase 8-7] 次のステップ: ./scripts/phase-8-7/verify-rls-test.sql で動作確認を実施${NC}"
