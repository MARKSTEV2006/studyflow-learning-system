-- STUDYFLOW DATABASE SETUP
-- Run this entire script in Supabase SQL Editor.

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  subject text not null default 'General' check (char_length(subject) between 1 and 80),
  due_date date,
  duration_min integer not null default 25 check (duration_min between 5 and 600),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.study_tasks enable row level security;

drop policy if exists "Users can read their own tasks" on public.study_tasks;
create policy "Users can read their own tasks"
on public.study_tasks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.study_tasks;
create policy "Users can create their own tasks"
on public.study_tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.study_tasks;
create policy "Users can update their own tasks"
on public.study_tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.study_tasks;
create policy "Users can delete their own tasks"
on public.study_tasks
for delete
using (auth.uid() = user_id);

create index if not exists study_tasks_user_id_idx
on public.study_tasks(user_id);

create index if not exists study_tasks_due_date_idx
on public.study_tasks(due_date);
