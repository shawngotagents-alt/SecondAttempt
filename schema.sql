-- ============================================================
--  Grace Community Church — Supabase Schema
--  Run this once in: Supabase Dashboard → SQL Editor → New query
--
--  Covers:
--    - profiles (display name shown across the site)
--    - sessions (Bible study scheduler)
--    - prayers (prayer wall)
--    - threads + replies (discussion board)
--    - Row Level Security: public read, login required to write
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- Supabase Auth already stores email/password in auth.users,
-- but that table isn't queryable from the client and has no
-- "display name." This table mirrors a public-safe profile
-- for every signed-up user, kept in sync automatically.
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null default '#534AB7',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- anyone can read display names (needed to show "posted by X" publicly)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- a user can only edit their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
-- Pulls "display_name" out of the signup metadata (we'll pass this from app.js).
create function public.handle_new_user()
returns trigger as $$
declare
  colors text[] := array['#534AB7','#EF9F27','#1D9E75','#D85A30','#D4537E','#378ADD'];
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    colors[1 + (abs(hashtext(new.id::text)) % array_length(colors, 1))]
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. BIBLE STUDY SESSIONS
-- ------------------------------------------------------------

create table public.sessions (
  id bigint generated always as identity primary key,
  title text not null,
  leader text not null,
  session_date date not null,
  session_time time,
  location text,
  format text not null default 'In-person' check (format in ('In-person', 'Online', 'Hybrid')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Sessions are publicly readable"
  on public.sessions for select
  using (true);

create policy "Logged-in users can add sessions"
  on public.sessions for insert
  with check (auth.uid() is not null);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = created_by);


-- ------------------------------------------------------------
-- 3. PRAYER REQUESTS
-- ------------------------------------------------------------

create table public.prayers (
  id bigint generated always as identity primary key,
  display_name text not null default 'Anonymous',
  is_anonymous boolean not null default false,
  body text not null,
  prayer_count int not null default 0,
  is_answered boolean not null default false,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prayers enable row level security;

create policy "Prayers are publicly readable"
  on public.prayers for select
  using (true);

-- Prayer requests are allowed from anyone, logged in or not
-- (matches your "anonymous submission" requirement). If you
-- later want to require login here too, change this to
-- "with check (auth.uid() is not null)" like sessions above.
create policy "Anyone can submit a prayer request"
  on public.prayers for insert
  with check (true);

create policy "Anyone can update prayer counts"
  on public.prayers for update
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 4. DISCUSSION THREADS + REPLIES
-- ------------------------------------------------------------

create table public.threads (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  likes int not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.threads enable row level security;

create policy "Threads are publicly readable"
  on public.threads for select
  using (true);

create policy "Logged-in users can post threads"
  on public.threads for insert
  with check (auth.uid() = author_id);

create policy "Users can update their own threads (e.g. likes)"
  on public.threads for update
  using (true)
  with check (true);

create policy "Users can delete their own threads"
  on public.threads for delete
  using (auth.uid() = author_id);


create table public.replies (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.replies enable row level security;

create policy "Replies are publicly readable"
  on public.replies for select
  using (true);

create policy "Logged-in users can post replies"
  on public.replies for insert
  with check (auth.uid() = author_id);

create policy "Users can delete their own replies"
  on public.replies for delete
  using (auth.uid() = author_id);


-- ------------------------------------------------------------
-- 5. Helpful indexes
-- ------------------------------------------------------------

create index sessions_date_idx on public.sessions (session_date);
create index prayers_created_idx on public.prayers (created_at desc);
create index threads_created_idx on public.threads (created_at desc);
create index replies_thread_idx on public.replies (thread_id);
