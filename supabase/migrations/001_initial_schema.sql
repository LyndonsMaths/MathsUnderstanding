-- ============================================================
-- NZ Maths Year 6 Portal — Supabase Schema
-- ============================================================

-- PROFILES (extends Supabase auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('teacher', 'student')),
  full_name   text not null,
  teacher_id  uuid references public.profiles(id) on delete set null, -- students link to their teacher
  created_at  timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

-- Teachers can see all their students; students can see themselves and their teacher
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Teachers can view their students"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
    and teacher_id = auth.uid()
  );

create policy "Teachers can insert student profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- STUDENT CLASS CODES (teachers create, students join)
create table public.class_codes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  code        text not null unique,
  class_name  text not null,
  created_at  timestamptz default now()
);

alter table public.class_codes enable row level security;

create policy "Teachers manage their class codes"
  on public.class_codes for all
  using (teacher_id = auth.uid());

create policy "Anyone can read class codes (for join)"
  on public.class_codes for select
  using (true);

-- TEST RESULTS
create table public.test_results (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  teacher_id      uuid not null references public.profiles(id) on delete cascade,
  test_module     text not null,          -- 'PV', 'AS', 'MD', 'WP', 'GR', 'FR'
  test_title      text not null,
  completed_at    timestamptz default now(),
  score_pct       numeric(5,2),           -- overall % score
  skill_results   jsonb not null,         -- { "PV1": { score: 4, total: 6, pct: 67, status: "Mastered" }, ... }
  answers_raw     jsonb,                  -- full per-question answer log
  time_taken_secs integer
);

alter table public.test_results enable row level security;

create policy "Students can insert own results"
  on public.test_results for insert
  with check (auth.uid() = student_id);

create policy "Students can view own results"
  on public.test_results for select
  using (auth.uid() = student_id);

create policy "Teachers can view their students results"
  on public.test_results for select
  using (auth.uid() = teacher_id);

-- ASSIGNED TESTS (teacher assigns specific modules to students)
create table public.assigned_tests (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete cascade, -- null = whole class
  module      text not null,
  due_date    date,
  note        text,
  created_at  timestamptz default now()
);

alter table public.assigned_tests enable row level security;

create policy "Teachers manage assignments"
  on public.assigned_tests for all
  using (teacher_id = auth.uid());

create policy "Students see their assignments"
  on public.assigned_tests for select
  using (
    auth.uid() = student_id
    or student_id is null  -- class-wide assignment
  );

-- Handy view: latest result per student per module
create or replace view public.latest_results_per_module as
  select distinct on (student_id, test_module)
    id, student_id, teacher_id, test_module, test_title,
    completed_at, score_pct, skill_results, time_taken_secs
  from public.test_results
  order by student_id, test_module, completed_at desc;

-- Function: auto-create profile after sign-up (for teacher self-registration)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Only auto-create if role metadata was supplied (teacher self-signup)
  if new.raw_user_meta_data->>'role' is not null then
    insert into public.profiles (id, role, full_name)
    values (
      new.id,
      new.raw_user_meta_data->>'role',
      coalesce(new.raw_user_meta_data->>'full_name', new.email)
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
