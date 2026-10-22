-- =====================================================================
-- Signage Control Panel - initial schema
-- Jalankan di Supabase Dashboard > SQL Editor (atau via Supabase CLI)
-- =====================================================================

-- ---------- Enums ----------
create type device_status as enum ('online', 'offline');
create type content_type  as enum ('image', 'video', 'text', 'url');

-- ---------- Helper: auto-update updated_at ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- contents ----------
-- payload: URL file (image/video/url) atau isi teks (text)
-- storage_path: path object di Supabase Storage (null jika bukan upload)
create table contents (
  id           uuid primary key default gen_random_uuid(),
  judul        text not null check (char_length(judul) between 1 and 200),
  tipe         content_type not null,
  payload      text not null,
  storage_path text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_contents_updated_at
  before update on contents
  for each row execute function set_updated_at();

-- ---------- playlists (bonus) ----------
create table playlists (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null check (char_length(nama) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_playlists_updated_at
  before update on playlists
  for each row execute function set_updated_at();

create table playlist_items (
  id               uuid primary key default gen_random_uuid(),
  playlist_id      uuid not null references playlists(id) on delete cascade,
  content_id       uuid not null references contents(id)  on delete cascade,
  position         integer not null check (position >= 0),
  duration_seconds integer not null default 10 check (duration_seconds between 1 and 3600),
  created_at       timestamptz not null default now()
);

create index idx_playlist_items_playlist on playlist_items (playlist_id, position);
create index idx_playlist_items_content  on playlist_items (content_id);

-- ---------- devices ----------
-- device_token: kredensial device untuk connect WebSocket
create table devices (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null check (char_length(nama) between 1 and 120),
  lokasi       text,
  status       device_status not null default 'offline',
  last_seen    timestamptz,
  device_token text not null unique
               default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  playlist_id  uuid references playlists(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_devices_status   on devices (status);
create index idx_devices_playlist on devices (playlist_id);

create trigger trg_devices_updated_at
  before update on devices
  for each row execute function set_updated_at();

-- ---------- admins (bonus: JWT auth) ----------
create table admins (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique check (char_length(username) between 3 and 50),
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- RLS aktif TANPA policy => anon/authenticated key tidak bisa akses tabel sama sekali.
-- Semua akses data lewat API kita memakai service_role key (bypass RLS).
alter table devices        enable row level security;
alter table contents       enable row level security;
alter table playlists      enable row level security;
alter table playlist_items enable row level security;
alter table admins         enable row level security;

-- ---------- Storage bucket untuk upload konten ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contents', 'contents', true, 52428800, -- 50 MB
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do nothing;
