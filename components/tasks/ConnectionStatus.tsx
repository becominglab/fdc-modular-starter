'use client';

import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '@/lib/types/realtime';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  lastSyncedAt: Date | null;
}

export function ConnectionStatus({ status, lastSyncedAt }: ConnectionStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi size={16} />,
          text: 'リアルタイム接続中',
          className: 'bg-green-100 text-green-700',
        };
      case 'connecting':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          text: '接続中...',
          className: 'bg-yellow-100 text-yellow-700',
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={16} />,
          text: 'オフライン',
          className: 'bg-gray-100 text-gray-700',
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: '接続エラー',
          className: 'bg-red-100 text-red-700',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded ${config.className}`}
      >
        {config.icon}
        {config.text}
      </span>
      {lastSyncedAt && status === 'connected' && (
        <span className="text-gray-500">
          最終同期: {formatTime(lastSyncedAt)}
        </span>
      )}
    </div>
  );
}
