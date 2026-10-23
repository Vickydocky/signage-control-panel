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

## REST API

Base URL `http://localhost:4000`. Semua endpoint admin ada di bawah `/api`. Error selalu berformat
`{ "error": { "code", "message", "details?" } }`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/health` | Cek server + koneksi database |
| GET | `/api/devices` | List device. Query: `page`, `pageSize` (maks 100), `q`, `status` |
| GET | `/api/devices/:id` | Detail device (termasuk `device_token`) |
| POST | `/api/devices` | Buat device `{ nama, lokasi? }` |
| PATCH | `/api/devices/:id` | Ubah `nama` / `lokasi` |
| POST | `/api/devices/:id/regenerate-token` | Buat token baru (token lama tidak berlaku) |
| DELETE | `/api/devices/:id` | Hapus device |
| GET | `/api/contents` | List konten. Query: `page`, `pageSize`, `q`, `tipe` |
| GET | `/api/contents/:id` | Detail konten |
| POST | `/api/contents` | Buat konten `text` / `url` / `image` / `video` (URL eksternal) via JSON |
| POST | `/api/contents/upload` | Upload gambar/video (`multipart/form-data`: `file`, `judul?`), maks 50 MB |
| PATCH | `/api/contents/:id` | Ubah `judul` / `payload` (payload file upload tidak bisa diubah) |
| DELETE | `/api/contents/:id` | Hapus konten (+ file di Storage) |

Keputusan desain REST:

- **`status` & `last_seen` read-only lewat REST.** Hanya WebSocket server yang boleh mengubahnya,
  supaya status tidak bisa dipalsukan dan selalu mencerminkan koneksi nyata.
- **`device_token` tidak pernah muncul di list**, hanya di detail dan saat create/regenerate.
- **Validasi dengan zod, skema dipakai bersama** (`packages/shared`) oleh API dan frontend.
- **Upload aman**: allowlist MIME, batas ukuran 50 MB, nama file di storage di-generate (UUID),
  dan rollback otomatis kalau insert DB gagal setelah upload.
- **Pencarian disanitasi** sebelum masuk ke filter PostgREST.
- Layer REST memancarkan event internal (`device:changed`, `device:removed`, `device:token_rotated`)
  yang akan didengarkan WebSocket server, jadi modul REST tidak bergantung pada WebSocket.

## Testing

```bash
npm run dev:api                       # terminal 1
npm run smoke -w @signage/api         # terminal 2: smoke test end-to-end (butuh Supabase)
```
