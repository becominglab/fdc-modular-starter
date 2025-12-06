#!/bin/bash

# ===================================================================
# Phase 8-7: 本番DB への RLS ポリシー適用スクリプト
# ===================================================================
#
# 【目的】
# 本番環境に RLS ポリシーを適用する
#
# 【使用方法】
# export DATABASE_URL="postgres://..."
# ./scripts/phase-8-7/apply-rls-prod.sh
#
# 【警告】
# この操作は本番環境に影響を与えます。必ずバックアップを取得してから実行してください。
#
# ===================================================================

set -e  # エラーが発生したら即座に終了

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️⚠️⚠️  警告: 本番DB への RLS ポリシー適用  ⚠️⚠️⚠️${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}[ERROR] DATABASE_URL 環境変数が設定されていません${NC}"
  echo "Usage: export DATABASE_URL=\"postgres://...\" && ./apply-rls-prod.sh"
  exit 1
fi

# バックアップ確認
BACKUP_DIR="backups"
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/prod_*.sql 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo -e "${RED}[ERROR] 本番DB のバックアップが見つかりません${NC}"
  echo -e "${RED}必ず先に ./scripts/phase-8-7/backup-prod-db.sh を実行してください${NC}"
  exit 1
fi

echo -e "${GREEN}[INFO] 最新バックアップ: ${LATEST_BACKUP}${NC}"
echo ""

# 確認プロンプト 1
echo -e "${YELLOW}本番データベースに RLS ポリシーを適用します。${NC}"
echo -e "${YELLOW}バックアップは取得済みですか？ [y/N]${NC}"
read -r CONFIRM1

if [[ ! "$CONFIRM1" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}[INFO] 適用をキャンセルしました${NC}"
  exit 0
fi

# 確認プロンプト 2（二重確認）
echo -e "${RED}⚠️  本当に実行しますか？この操作は本番環境に影響を与えます [y/N]${NC}"
read -r CONFIRM2

if [[ ! "$CONFIRM2" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}[INFO] 適用をキャンセルしました${NC}"
  exit 0
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

echo ""
echo -e "${GREEN}[Phase 8-7] 本番DB への RLS ポリシー適用を開始...${NC}"
echo ""

# 1. workspace_keys テーブルを作成（未作成の場合）
echo -e "${YELLOW}[INFO] workspace_keys テーブルを作成中...${NC}"
psql "$DATABASE_URL" -f "$KEYS_MIGRATION" || {
  echo -e "${YELLOW}[WARNING] workspace_keys テーブルは既に存在するか、エラーが発生しました${NC}"
}

# 2. RLS ポリシーを適用
echo -e "${YELLOW}[INFO] RLS ポリシーを適用中...${NC}"
psql "$DATABASE_URL" -f "$RLS_MIGRATION"

# 3. 適用確認
echo -e "${YELLOW}[INFO] RLS が有効になっているか確認中...${NC}"
psql "$DATABASE_URL" -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_members', 'workspace_data', 'audit_logs');
"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ RLS ポリシーが正常に適用されました!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}[Phase 8-7] 次のステップ:${NC}"
echo -e "${YELLOW}  1. ./scripts/phase-8-7/verify-rls-prod.sql で動作確認${NC}"
echo -e "${YELLOW}  2. 本番アプリケーションで動作確認${NC}"
echo -e "${YELLOW}  3. 問題があればロールバック: psql \$DATABASE_URL < ${LATEST_BACKUP}${NC}"
echo ""
