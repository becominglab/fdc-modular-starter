/**
 * lib/services/storage.ts
 *
 * Supabase Storage サービス
 */

import { createClient } from '@/lib/supabase/client';
import type { UploadResult, UploadOptions } from '@/lib/types/storage';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * ファイルアップロード
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, folder, file, maxSizeMB = 2 } = options;

  // ファイルサイズチェック
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: `ファイルサイズは${maxSizeMB}MB以下にしてください` };
  }

  // ファイル形式チェック（SVGはセキュリティリスクのため除外）
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: '対応していないファイル形式です（JPEG, PNG, WebP, GIF）' };
  }

  const supabase = createClient();

  // ファイル名生成（MIMEタイプから拡張子を決定）
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[file.type] || 'jpg';
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  // 既存ファイルを削除（同じフォルダ内）
  const { data: existingFiles } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${folder}/${f.name}`);
    await supabase.storage.from(bucket).remove(filesToDelete);
  }

  // アップロード
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'アップロードに失敗しました' };
  }

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { success: true, url: publicUrl, path: filePath };
}

/**
 * ファイル削除
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    return false;
  }

  return true;
}

/**
 * 公開URLを取得
 */
export function getPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
