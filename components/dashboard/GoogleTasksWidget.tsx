'use client';

import { CheckSquare, Square } from 'lucide-react';
import { useGoogleTasks } from '@/lib/hooks/useGoogleTasks';

function formatDueDate(due: string | undefined): string | null {
  if (!due) return null;

  const dueDate = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);

  if (dueDateOnly.getTime() === today.getTime()) {
    return '今日';
  }
  if (dueDateOnly.getTime() === tomorrow.getTime()) {
    return '明日';
  }
  if (dueDateOnly < today) {
    return '期限切れ';
  }

  return dueDate.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
}

export function GoogleTasksWidget() {
  const { tasks, isLoading, error, isConnected } = useGoogleTasks();

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-dark)',
  };

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <CheckSquare size={20} color="var(--success)" />
            <span>Google Tasks</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <CheckSquare size={20} color="var(--success)" />
            <span>Google Tasks</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <CheckSquare size={40} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px' }}>Google Tasks が連携されていません</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>再ログインして連携を許可してください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <CheckSquare size={20} color="var(--success)" />
            <span>Google Tasks</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--error)' }}>
          <p style={{ fontSize: '14px' }}>読み込みエラー</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <CheckSquare size={20} color="var(--success)" />
          <span>Google Tasks</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {tasks.length} 件
        </span>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <CheckSquare size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <p style={{ fontSize: '14px' }}>未完了のタスクはありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => {
            const dueLabel = formatDueDate(task.due);
            const isOverdue = dueLabel === '期限切れ';

            return (
              <div
                key={task.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-gray)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ marginTop: '2px' }}>
                    {task.status === 'completed' ? (
                      <CheckSquare size={18} color="var(--success)" />
                    ) : (
                      <Square size={18} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      margin: 0,
                      color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-dark)',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </h4>
                    {task.notes && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}>
                        {task.notes}
                      </p>
                    )}
                    {dueLabel && (
                      <span style={{
                        fontSize: '12px',
                        marginTop: '4px',
                        display: 'inline-block',
                        color: isOverdue ? 'var(--error)' : 'var(--text-muted)',
                      }}>
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
