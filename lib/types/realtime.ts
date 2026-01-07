export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeState {
  status: ConnectionStatus;
  lastSyncedAt: Date | null;
  error: Error | null;
}
