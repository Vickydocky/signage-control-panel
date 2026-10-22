# Signage Control Panel

Dashboard admin + simulasi device client untuk digital signage, dengan status device **real-time** via WebSocket.

> README ini akan dilengkapi di tahap akhir (arsitektur, keputusan teknis, demo).

## Struktur

```
apps/
  api/          Fastify (REST + WebSocket server)
  dashboard/    React + Vite (admin)           [tahap 4]
  device/       React + Vite + Electron        [tahap 5 & 8]
packages/
  shared/       Types & kontrak WebSocket
supabase/
  migrations/   Skema database
  seed.sql      Data contoh (opsional)
```

## Setup

1. **Supabase**: buat project baru di https://supabase.com, lalu buka *SQL Editor* dan jalankan:
   1. `supabase/migrations/001_init.sql`
   2. (opsional) `supabase/seed.sql`
2. **Env**: `cp .env.example .env`, isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
   (*Project Settings > API*).
3. **Install & run**:
   ```bash
   npm install
   npm run dev:api
   curl http://localhost:4000/health
   ```
