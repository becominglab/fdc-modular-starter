/**
 * components/profile/AvatarUpload.tsx
 *
 * アバター画像アップロードコンポーネント
 */

'use client';

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  onDeleteComplete?: () => void;
}

export function AvatarUpload({
  currentUrl,
  onUploadComplete,
  onDeleteComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // アップロード
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadComplete?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setPreview(null);
    } finally {
      setUploading(false);
      // 入力をリセット（同じファイルを再選択可能にする）
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('アバター画像を削除しますか？')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      setPreview(null);
      onDeleteComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="avatar-upload">
      <div className="avatar-container">
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            <Camera size={32} />
          </div>
        )}

        {(uploading || deleting) && (
          <div className="avatar-loading">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}
      </div>

      <div className="avatar-actions">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || deleting}
        >
          <Camera size={16} />
          {currentUrl ? '変更' : 'アップロード'}
        </button>

        {currentUrl && (
          <button
            type="button"
            className="btn btn-danger btn-small"
            onClick={handleDelete}
            disabled={uploading || deleting}
          >
            <Trash2 size={16} />
            削除
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && <p className="avatar-error">{error}</p>}

      <p className="avatar-hint">
        JPEG, PNG, WebP, GIF（最大2MB）
      </p>
    </div>
  );
}
