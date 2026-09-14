-- ASS (Donkey Master) — Supabase schema
-- Run this once in your project's SQL Editor (https://supabase.com/dashboard -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'ended')),
  max_players int not null,
  min_players int not null default 2,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_host boolean not null default false,
  cards jsonb not null default '[]'::jsonb,
  escaped boolean not null default false,
  escape_rank int,
  ready boolean not null default true,
  avatar_color text not null default '#2563EB',
  seat_order int not null default 0,
  connected boolean not null default true,
  joined_at timestamptz not null default now()
);

create index if not exists players_room_id_idx on players(room_id);
create index if not exists rooms_code_idx on rooms(code);

-- Row Level Security: this is a private-room game with no auth, so we allow
-- anonymous read/write scoped to the anon key. Anyone with a room code can
-- read/join that room, which matches "friends sitting together" usage.
alter table rooms enable row level security;
alter table players enable row level security;

create policy "rooms are readable by anyone" on rooms for select using (true);
create policy "rooms are insertable by anyone" on rooms for insert with check (true);
create policy "rooms are updatable by anyone" on rooms for update using (true);
create policy "rooms are deletable by anyone" on rooms for delete using (true);

create policy "players are readable by anyone" on players for select using (true);
create policy "players are insertable by anyone" on players for insert with check (true);
create policy "players are updatable by anyone" on players for update using (true);
create policy "players are deletable by anyone" on players for delete using (true);

-- Enable realtime (Postgres logical replication publication) for both tables.
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
