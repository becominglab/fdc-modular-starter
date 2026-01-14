/**
 * lib/types/storage.ts
 *
 * ストレージ関連の型定義
 */

// アップロード結果
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

// アップロードオプション
export interface UploadOptions {
  bucket: 'avatars' | 'workspace-logos';
  folder: string; // userId or workspaceId
  file: File;
  maxSizeMB?: number;
}

// 画像プレビュー用
export interface ImagePreview {
  url: string;
  file: File;
}
