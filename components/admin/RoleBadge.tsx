'use client';

/**
 * components/admin/RoleBadge.tsx
 *
 * ロール表示バッジ
 */

import { Shield, Crown, User } from 'lucide-react';
import type { WorkspaceRole } from '@/lib/types/admin';
import { ROLE_INFO } from '@/lib/types/admin';

interface RoleBadgeProps {
  role: WorkspaceRole;
  size?: 'sm' | 'md';
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const info = ROLE_INFO[role];
  const Icon = ROLE_ICONS[role];
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`role-badge role-badge-${size}`}
      style={{ '--role-color': info.color } as React.CSSProperties}
    >
      <Icon size={iconSize} />
      {info.label}
    </span>
  );
}
