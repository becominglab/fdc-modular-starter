import { createClient } from '@/lib/supabase/client';
import type { DbTask, DbTaskInsert, DbTaskUpdate } from '@/lib/types/database';

export async function fetchTasks(): Promise<DbTask[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data || [];
}

export async function createTask(title: string, userId: string): Promise<DbTask> {
  const supabase = createClient();
  const newTask: DbTaskInsert = {
    title,
    user_id: userId,
    completed: false,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data;
}

export async function updateTask(
  id: string,
  updates: DbTaskUpdate
): Promise<DbTask> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<DbTask> {
  return updateTask(id, { completed });
}
