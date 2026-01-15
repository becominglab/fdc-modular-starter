/**
 * app/api/dashboard/stats/route.ts
 *
 * GET /api/dashboard/stats - ダッシュボード統計情報
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 日付計算
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // タスク統計
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, scheduled_date, completed')
      .eq('user_id', user.id);

    const taskStats = {
      total: tasks?.length || 0,
      completed: tasks?.filter(t => t.status === 'done' || t.completed).length || 0,
      completionRate: 0,
      thisWeek: tasks?.filter(t => {
        if (!t.scheduled_date) return false;
        const date = new Date(t.scheduled_date);
        return date >= startOfWeek && date <= now;
      }).length || 0,
      overdue: tasks?.filter(t => {
        if (!t.scheduled_date || t.status === 'done' || t.completed) return false;
        return new Date(t.scheduled_date) < now;
      }).length || 0,
    };
    taskStats.completionRate = taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

    // リード統計
    const { data: prospects } = await supabase
      .from('prospects')
      .select('id, status, created_at')
      .eq('user_id', user.id);

    const leadsByStatus = {
      new: 0,
      approaching: 0,
      negotiating: 0,
      proposing: 0,
      won: 0,
      lost: 0,
    };

    prospects?.forEach(p => {
      if (p.status && leadsByStatus.hasOwnProperty(p.status)) {
        leadsByStatus[p.status as keyof typeof leadsByStatus]++;
      }
    });

    // 今月のコンバージョン（won になったリード数）
    const thisMonthConversions = prospects?.filter(p => {
      if (p.status !== 'won') return false;
      // created_atを使用（本来はステータス変更日が必要だが簡略化）
      const date = new Date(p.created_at || '');
      return date >= startOfMonth && date <= endOfMonth;
    }).length || 0;

    const leadStats = {
      total: prospects?.length || 0,
      byStatus: leadsByStatus,
      thisMonthConversions,
    };

    // クライアント統計
    const { data: clients } = await supabase
      .from('clients')
      .select('id, created_at')
      .eq('user_id', user.id);

    const thisMonthClients = clients?.filter(c => {
      const date = new Date(c.created_at || '');
      return date >= startOfMonth && date <= endOfMonth;
    }).length || 0;

    const clientStats = {
      total: clients?.length || 0,
      thisMonth: thisMonthClients,
    };

    // 最近のアクティビティ（audit_logsテーブルから取得）
    let recentActivity: Array<{
      id: string;
      action: string;
      resource_type: string;
      created_at: string;
      details: Record<string, unknown> | null;
    }> = [];

    const { data: activities } = await supabase
      .from('audit_logs')
      .select('id, action, resource_type, created_at, details')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activities) {
      recentActivity = activities.map((a) => ({
        id: a.id,
        action: a.action,
        resource_type: a.resource_type || '',
        created_at: a.created_at || '',
        details: a.details as Record<string, unknown> | null,
      }));
    }

    // タスク完了推移（過去7日間）
    const taskCompletionTrend: Array<{ date: string; completed: number; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks?.filter(t => {
        if (!t.scheduled_date) return false;
        return t.scheduled_date.startsWith(dateStr);
      }) || [];

      taskCompletionTrend.push({
        date: dateStr,
        completed: dayTasks.filter(t => t.status === 'done' || t.completed).length,
        total: dayTasks.length,
      });
    }

    return NextResponse.json({
      tasks: taskStats,
      leads: leadStats,
      clients: clientStats,
      recentActivity,
      taskCompletionTrend,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
