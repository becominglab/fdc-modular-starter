#!/bin/bash

# ===================================================================
# Phase 8-7: Vercel 環境変数確認スクリプト
# ===================================================================
#
# 【目的】
# Vercel 環境で必要な環境変数が正しく設定されているか確認する
#
# 【使用方法】
# ./scripts/phase-8-7/verify-vercel-env.sh
#
# 【前提条件】
# - Vercel CLI がインストールされていること: npm install -g vercel
# - Vercel プロジェクトにログイン済みであること: vercel login
#
# ===================================================================

set -e  # エラーが発生したら即座に終了

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Phase 8-7] Vercel 環境変数の確認を開始...${NC}"
echo ""

# Vercel CLI の確認
if ! command -v vercel &> /dev/null; then
  echo -e "${RED}[ERROR] Vercel CLI がインストールされていません${NC}"
  echo "インストール方法: npm install -g vercel"
  exit 1
fi

# 現在のディレクトリが Vercel プロジェクトか確認
if [ ! -f ".vercel/project.json" ]; then
  echo -e "${YELLOW}[WARNING] .vercel/project.json が見つかりません${NC}"
  echo -e "${YELLOW}Vercel プロジェクトにリンクされていない可能性があります${NC}"
  echo "リンク方法: vercel link"
  echo ""
fi

# ===================================================================
# 1. ローカル環境変数の確認
# ===================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  1. ローカル環境変数の確認${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# .env.local を読み込む
if [ -f ".env.local" ]; then
  source .env.local
  echo -e "${GREEN}✅ .env.local が見つかりました${NC}"
else
  echo -e "${YELLOW}⚠️  .env.local が見つかりません${NC}"
  echo "取得方法: vercel env pull .env.local"
  echo ""
fi

# 必須環境変数のチェック
check_local_env() {
  local var_name=$1
  local var_value=${!var_name}

  if [ -n "$var_value" ]; then
    # 最初の10文字のみ表示
    local preview="${var_value:0:10}..."
    echo -e "${GREEN}✅ ${var_name}: ${preview}${NC}"
    return 0
  else
    echo -e "${RED}❌ ${var_name}: 未設定${NC}"
    return 1
  fi
}

check_local_env "DATABASE_URL" || true
check_local_env "POSTGRES_URL" || true
check_local_env "MASTER_ENCRYPTION_KEY" || true
check_local_env "GOOGLE_CLIENT_ID" || true
check_local_env "GOOGLE_CLIENT_SECRET" || true

echo ""

# ===================================================================
# 2. Vercel 本番環境変数の確認
# ===================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  2. Vercel 本番環境変数の確認${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

check_vercel_env() {
  local var_name=$1
  local environment=$2  # production, preview, development

  # Vercel CLI で環境変数を確認
  local result=$(vercel env ls $environment 2>/dev/null | grep "^${var_name}" || echo "")

  if [ -n "$result" ]; then
    echo -e "${GREEN}✅ ${var_name} (${environment})${NC}"
    return 0
  else
    echo -e "${RED}❌ ${var_name} (${environment}): 未設定${NC}"
    return 1
  fi
}

# 本番環境
echo -e "${YELLOW}本番環境 (production):${NC}"
check_vercel_env "MASTER_ENCRYPTION_KEY" "production" || true
check_vercel_env "DATABASE_URL" "production" || check_vercel_env "POSTGRES_URL" "production" || true
check_vercel_env "GOOGLE_CLIENT_ID" "production" || true
check_vercel_env "GOOGLE_CLIENT_SECRET" "production" || true

echo ""

# プレビュー環境
echo -e "${YELLOW}プレビュー環境 (preview):${NC}"
check_vercel_env "MASTER_ENCRYPTION_KEY" "preview" || true
check_vercel_env "DATABASE_URL" "preview" || check_vercel_env "POSTGRES_URL" "preview" || true
check_vercel_env "GOOGLE_CLIENT_ID" "preview" || true
check_vercel_env "GOOGLE_CLIENT_SECRET" "preview" || true

echo ""

# ===================================================================
# 3. 環境変数の追加方法
# ===================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  環境変数の追加方法${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1. MASTER_ENCRYPTION_KEY の生成と設定:"
echo "   # キーを生成（32バイト、base64エンコード）"
echo "   openssl rand -base64 32"
echo ""
echo "   # Vercel に設定"
echo "   vercel env add MASTER_ENCRYPTION_KEY"
echo "   # 生成したキーを入力"
echo "   # 環境を選択: Production, Preview"
echo ""

echo "2. DATABASE_URL の確認:"
echo "   # Vercel Dashboard で確認"
echo "   # Settings > Storage > Postgres > .env.local タブ"
echo ""

echo "3. Google OAuth の設定:"
echo "   # Google Cloud Console で確認"
echo "   # https://console.cloud.google.com/apis/credentials"
echo ""

# ===================================================================
# 4. 暗号化キーの検証
# ===================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  4. 暗号化キーの検証${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$MASTER_ENCRYPTION_KEY" ]; then
  # base64 デコードしてバイト数を確認
  KEY_BYTES=$(echo "$MASTER_ENCRYPTION_KEY" | base64 -d 2>/dev/null | wc -c)

  if [ "$KEY_BYTES" -eq 32 ]; then
    echo -e "${GREEN}✅ MASTER_ENCRYPTION_KEY は正しい長さ（32バイト）です${NC}"
  else
    echo -e "${RED}❌ MASTER_ENCRYPTION_KEY の長さが不正です（${KEY_BYTES}バイト、32バイトが必要）${NC}"
    echo "再生成方法: openssl rand -base64 32"
  fi
else
  echo -e "${RED}❌ MASTER_ENCRYPTION_KEY が設定されていません${NC}"
fi

echo ""

# ===================================================================
# 5. 完了
# ===================================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Vercel 環境変数の確認が完了しました${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "次のステップ:"
echo "  1. すべての必須環境変数が設定されていることを確認"
echo "  2. 本番環境で暗号化・復号が正常に動作するか確認"
echo "  3. アプリケーションを再デプロイして環境変数を反映"
echo ""
