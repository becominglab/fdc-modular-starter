#!/bin/bash

# ===================================================================
# Phase 8-7: テストDB バックアップスクリプト
# ===================================================================
#
# 【目的】
# テスト環境のデータベースをバックアップする
#
# 【使用方法】
# export TEST_DATABASE_URL="postgres://..."
# ./scripts/phase-8-7/backup-test-db.sh
#
# ===================================================================

set -e  # エラーが発生したら即座に終了

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Phase 8-7] テストDB バックアップを開始...${NC}"

# 環境変数チェック
if [ -z "$TEST_DATABASE_URL" ]; then
  echo -e "${RED}[ERROR] TEST_DATABASE_URL 環境変数が設定されていません${NC}"
  echo "Usage: export TEST_DATABASE_URL=\"postgres://...\" && ./backup-test-db.sh"
  exit 1
fi

# バックアップディレクトリ作成
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# バックアップファイル名（タイムスタンプ付き）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/test_${TIMESTAMP}.sql"

echo -e "${YELLOW}[INFO] バックアップファイル: ${BACKUP_FILE}${NC}"

# pg_dump 実行
echo -e "${YELLOW}[INFO] pg_dump を実行中...${NC}"
pg_dump "$TEST_DATABASE_URL" > "$BACKUP_FILE"

# バックアップファイルサイズ確認
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}[SUCCESS] バックアップ完了!${NC}"
echo -e "${GREEN}  ファイル: ${BACKUP_FILE}${NC}"
echo -e "${GREEN}  サイズ: ${FILE_SIZE}${NC}"

# バックアップファイルが空でないか確認
if [ ! -s "$BACKUP_FILE" ]; then
  echo -e "${RED}[ERROR] バックアップファイルが空です${NC}"
  exit 1
fi

echo -e "${GREEN}[Phase 8-7] テストDB バックアップが正常に完了しました${NC}"
