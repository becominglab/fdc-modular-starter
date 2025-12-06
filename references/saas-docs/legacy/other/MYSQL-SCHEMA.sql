-- ========================================
-- [LEGACY] Founders Direct Cockpit (FDC)
-- MySQL Database Schema (Phase 4 - 廃止)
-- ========================================
--
-- [LEGACY] 本番運用では使用しません。
-- Phase 7 で Vercel Postgres に移行済み。
--
-- 対象環境: ConoHa WING (MySQL 5.7+) - 廃止
-- 文字コード: UTF8MB4
--
-- 作成日: 2025-11-11
-- 作成者: Claude Code (Sonnet 4.5)
-- ステータス: 廃止（Phase 7 で Postgres に移行）
--
-- 現在の本番スキーマについては、以下を参照してください:
-- DOCS/PRODUCTION-DEPLOYMENT-CHECKLIST.md - Postgres スキーマ
-- ========================================

-- データベース作成（既存の場合はスキップ）
-- CREATE DATABASE IF NOT EXISTS fdc_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE fdc_production;

-- ========================================
-- テーブル: users
-- ========================================
-- Google認証ユーザー情報を管理
-- ========================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ユーザーID（内部管理用）',
    google_sub VARCHAR(64) UNIQUE NOT NULL COMMENT 'GoogleユーザーID（sub）',
    email VARCHAR(255) NOT NULL COMMENT 'メールアドレス',
    name VARCHAR(255) DEFAULT NULL COMMENT '表示名',
    picture TEXT DEFAULT NULL COMMENT 'プロフィール画像URL',
    global_role ENUM('fdc_admin', 'normal') DEFAULT 'normal' COMMENT 'グローバルロール',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',

    INDEX idx_google_sub (google_sub),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Google認証ユーザー';

-- ========================================
-- テーブル: workspaces
-- ========================================
-- ワークスペース（顧客単位）の基本情報
-- ========================================

CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY COMMENT 'ワークスペースID（ランダム文字列）',
    name VARCHAR(255) NOT NULL COMMENT 'ワークスペース名',
    owner_user_id INT NOT NULL COMMENT 'オーナーのユーザーID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',

    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner_user_id (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ワークスペース';

-- ========================================
-- テーブル: workspace_members
-- ========================================
-- ワークスペースのメンバーシップとロールを管理
-- ========================================

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id VARCHAR(64) NOT NULL COMMENT 'ワークスペースID',
    user_id INT NOT NULL COMMENT 'ユーザーID',
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member' COMMENT 'ロール',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '参加日時',

    PRIMARY KEY (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ワークスペースメンバー';

-- ========================================
-- テーブル: workspace_data
-- ========================================
-- ワークスペースごとのAppData（JSON形式）を保存
-- ========================================

CREATE TABLE IF NOT EXISTS workspace_data (
    workspace_id VARCHAR(64) PRIMARY KEY COMMENT 'ワークスペースID',
    data_json LONGTEXT NOT NULL COMMENT 'AppDataのJSON文字列',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最終更新日時',

    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ワークスペースデータ';

-- ========================================
-- 初期データ投入（オプション）
-- ========================================

-- FDC管理者アカウントの例（Google認証後に手動でglobal_roleを'fdc_admin'に変更する運用を推奨）
-- INSERT INTO users (google_sub, email, name, global_role)
-- VALUES ('ADMIN_GOOGLE_SUB', 'admin@foundersdirect.jp', 'FDC Admin', 'fdc_admin')
-- ON DUPLICATE KEY UPDATE global_role = 'fdc_admin';

-- ========================================
-- スキーマ情報
-- ========================================

-- バージョン: Phase 4 (MVP)
-- 最終更新: 2025-11-11
--
-- 注意事項:
-- 1. ConoHa WINGのコントロールパネルでデータベースを作成後、
--    このSQLファイルをphpMyAdmin等で実行してください。
-- 2. DB接続情報は /fdc-api/config/db.php に設定します。
-- 3. 本番環境では必ずSSL/TLS接続を使用してください。
