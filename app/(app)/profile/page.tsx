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
