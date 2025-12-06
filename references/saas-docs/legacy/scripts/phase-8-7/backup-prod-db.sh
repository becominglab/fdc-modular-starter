#!/bin/bash

# ===================================================================
# Phase 8-7: 本番DB バックアップスクリプト
# ===================================================================
#
# 【目的】
# 本番環境のデータベースをバックアップする
#
# 【使用方法】
# export DATABASE_URL="postgres://..."
# ./scripts/phase-8-7/backup-prod-db.sh
#
# ===================================================================

set -e  # エラーが発生したら即座に終了

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  警告: 本番DB バックアップを開始します ⚠️${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}[ERROR] DATABASE_URL 環境変数が設定されていません${NC}"
  echo "Usage: export DATABASE_URL=\"postgres://...\" && ./backup-prod-db.sh"
  exit 1
fi

# 確認プロンプト
echo -e "${YELLOW}本番データベースをバックアップします。続行しますか？ [y/N]${NC}"
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}[INFO] バックアップをキャンセルしました${NC}"
  exit 0
fi

# バックアップディレクトリ作成
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# バックアップファイル名（タイムスタンプ付き）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/prod_${TIMESTAMP}.sql"

echo -e "${YELLOW}[INFO] バックアップファイル: ${BACKUP_FILE}${NC}"

# pg_dump 実行
echo -e "${YELLOW}[INFO] pg_dump を実行中...${NC}"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

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

# バックアップを安全な場所にコピーするよう促す
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  推奨: バックアップファイルを外部ストレージにコピーしてください${NC}"
echo -e "${YELLOW}  例: cp ${BACKUP_FILE} ~/Google\\ Drive/Backups/${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${GREEN}[Phase 8-7] 本番DB バックアップが正常に完了しました${NC}"
