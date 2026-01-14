# Phase 21: ファイルアップロード（Supabase Storage）

## 目標

Supabase Storage を使用したファイルアップロード機能を実装します。

### 習得する概念

- **Supabase Storage**: S3互換のファイルストレージ
- **バケット**: ファイルを格納するコンテナ
- **ストレージポリシー**: ファイルへのアクセス制御
- **画像最適化**: アップロード画像のリサイズ・圧縮

### 実装する機能

1. プロフィールアバター画像
2. ワークスペースロゴ
3. 画像プレビュー・削除

---

## Step 1: Supabase Storage バケット作成

### 1.1 Supabase Dashboard でバケット作成

Supabase Dashboard → Storage → New bucket

**バケット 1: avatars（プロフィール画像）**
- Name: `avatars`
- Public bucket: ON
- File size limit: 2MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

**バケット 2: workspace-logos（ワークスペースロゴ）**
- Name: `workspace-logos`
- Public bucket: ON
- File size limit: 2MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/svg+xml`

### 1.2 ストレージポリシー設定

SQL Editor で実行:

```sql
-- avatars バケットポリシー
-- 認証済みユーザーは自分のアバターをアップロード可能
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のアバターを更新可能
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のアバターを削除可能
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 公開バケットなので誰でも閲覧可能
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- workspace-logos バケットポリシー
-- ワークスペースのオーナー/管理者のみアップロード可能
CREATE POLICY "Workspace admins can upload logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id::text = (storage.foldername(name))[1]
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Workspace admins can update logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id::text = (storage.foldername(name))[1]
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Workspace admins can delete logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workspace-logos' AND
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id::text = (storage.foldername(name))[1]
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Anyone can view workspace logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-logos');
```

### 1.3 profiles テーブルに avatar_url カラム追加

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### 確認ポイント

- [ ] avatars バケットを作成した
- [ ] workspace-logos バケットを作成した
- [ ] ストレージポリシーを設定した
- [ ] profiles テーブルに avatar_url を追加した

---

## Step 2: 型定義の作成

### ファイル: `lib/types/storage.ts`

```typescript
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
```

### 確認ポイント

- [ ] `lib/types/storage.ts` を作成した

---

## Step 3: ストレージサービス作成

### ファイル: `lib/services/storage.ts`

```typescript
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

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: '対応していないファイル形式です' };
  }

  const supabase = createClient();

  // ファイル名生成（タイムスタンプ + 元のファイル名）
  const ext = file.name.split('.').pop();
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
```

### 確認ポイント

- [ ] `lib/services/storage.ts` を作成した

---

## Step 4: アバターアップロード API 作成

### ファイル: `app/api/profile/avatar/route.ts`

```typescript
/**
 * app/api/profile/avatar/route.ts
 *
 * POST /api/profile/avatar - アバター画像アップロード
 * DELETE /api/profile/avatar - アバター画像削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイルサイズチェック（2MB）
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // ファイル名生成
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    // 既存ファイルを削除
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // アップロード
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // 公開URL取得
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // profiles テーブル更新
    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient as any)
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 既存ファイルを削除
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // profiles テーブル更新
    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient as any)
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/profile/avatar/route.ts` を作成した

---

## Step 5: アバターアップロードコンポーネント作成

### ファイル: `components/profile/AvatarUpload.tsx`

```typescript
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
```

### 確認ポイント

- [ ] `components/profile/AvatarUpload.tsx` を作成した

---

## Step 6: プロフィールページ作成

### ファイル: `app/(app)/profile/page.tsx`

```typescript
/**
 * app/(app)/profile/page.tsx
 *
 * プロフィール設定ページ
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { AvatarUpload } from '@/components/profile/AvatarUpload';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFullName(data.full_name || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setMessage({ type: 'success', text: 'プロフィールを更新しました' });
      } else {
        throw new Error('Update failed');
      }
    } catch {
      setMessage({ type: 'error', text: '更新に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    setMessage({ type: 'success', text: 'アバターを更新しました' });
  };

  const handleAvatarDelete = () => {
    setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
    setMessage({ type: 'success', text: 'アバターを削除しました' });
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="profile-page">
      <header className="page-header">
        <User size={24} />
        <h1>プロフィール設定</h1>
      </header>

      {message && (
        <div className={`message message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-avatar-section">
          <h2>アバター画像</h2>
          <AvatarUpload
            currentUrl={profile?.avatar_url}
            onUploadComplete={handleAvatarUpload}
            onDeleteComplete={handleAvatarDelete}
          />
        </div>

        <div className="profile-info-section">
          <h2>基本情報</h2>

          <div className="form-group">
            <label>メールアドレス</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="input"
            />
            <p className="form-hint">メールアドレスは変更できません</p>
          </div>

          <div className="form-group">
            <label>表示名</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="山田太郎"
              className="input"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 確認ポイント

- [ ] `app/(app)/profile/page.tsx` を作成した

---

## Step 7: プロフィール API 作成

### ファイル: `app/api/profile/route.ts`

```typescript
/**
 * app/api/profile/route.ts
 *
 * GET /api/profile - プロフィール取得
 * PATCH /api/profile - プロフィール更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (serviceClient as any)
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: result.error.issues },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (serviceClient as any)
      .from('profiles')
      .update({ full_name: result.data.full_name })
      .eq('id', user.id)
      .select('id, email, full_name, avatar_url')
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 確認ポイント

- [ ] `app/api/profile/route.ts` を作成した

---

## Step 8: ナビゲーション更新

### `app/(app)/layout.tsx` に追加

NAV_ITEMS 配列に追加:

```typescript
{ href: '/profile', label: 'プロフィール', icon: User },
```

### 確認ポイント

- [ ] ナビゲーションにプロフィールリンクを追加した

---

## Step 9: CSS スタイル追加

### `app/globals.css` に追加

```css
/* ===================================
   Profile & Avatar Upload Styles
   =================================== */

.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 32px;
}

.profile-avatar-section,
.profile-info-section {
  margin-bottom: 32px;
}

.profile-avatar-section h2,
.profile-info-section h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 16px;
}

/* Avatar Upload */
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid var(--border-color);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--bg-light);
  border: 3px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.avatar-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.avatar-error {
  color: var(--ws-primary, #ef4444);
  font-size: 14px;
}

.avatar-hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-medium);
  margin-bottom: 6px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.input:disabled {
  background: var(--bg-light);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Message */
.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.message--success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.message--error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Danger button */
.btn-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Spin animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 確認ポイント

- [ ] CSS スタイルを追加した

---

## Step 10: 型チェック & ビルド

```bash
npm run type-check
npm run build
```

### 確認ポイント

- [ ] 型チェックが通る
- [ ] ビルドが成功する

---

## Step 11: 動作確認

1. `/profile` にアクセス
2. アバター画像をアップロード
3. 表示名を変更して保存
4. アバター画像を削除

### 確認ポイント

- [ ] プロフィールページが表示される
- [ ] アバターをアップロードできる
- [ ] プロフィールを更新できる
- [ ] アバターを削除できる

---

## Step 12: Git プッシュ

```bash
git add -A
git commit -m "Phase 21: ファイルアップロード（Supabase Storage）を実装"
git push
```

### 確認ポイント

- [ ] コミットした
- [ ] プッシュした
- [ ] Vercel デプロイが成功した

---

## 完了チェック

- [ ] Supabase Storage バケットを作成した
- [ ] ストレージポリシーを設定した
- [ ] アバターアップロードが動作する
- [ ] プロフィール更新が動作する
- [ ] GitHub にプッシュした

---

## 補足: 画像最適化

本番運用時は画像の最適化を検討:

1. **Supabase Image Transformations**: URLパラメータでリサイズ
   ```
   /storage/v1/object/public/avatars/xxx.jpg?width=200&height=200
   ```

2. **Next.js Image Optimization**: `next/image` コンポーネント使用

3. **クライアントサイドリサイズ**: アップロード前に canvas で圧縮
