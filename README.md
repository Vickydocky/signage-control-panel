# Signage Control Panel

Platform digital signage modern berbasis monorepo: mencakup **REST API & Real-time WebSocket Server**, **Admin Mission Control Dashboard**, dan **Kiosk Screen Player** dengan sinkronisasi status perangkat secara langsung (*live*).

---

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Struktur Monorepo](#struktur-monorepo)
- [Prasyarat](#prasyarat)
- [Panduan Instalasi & Setup](#panduan-instalasi--setup)
- [Cara Menjalankan Project](#cara-menjalankan-project)
- [Panduan Pengujian End-to-End](#panduan-pengujian-end-to-end-simulasi-layar)
- [Dokumentasi REST API](#dokumentasi-rest-api)
- [Protokol Real-time WebSocket](#protokol-real-time-websocket)
- [Arsitektur & Keputusan Teknis](#arsitektur--keputusan-teknis)

---

## Fitur Utama

- **Live Fleet Monitoring**: Pantau status semua layar TV/kiosk secara *real-time* (Online/Offline, Last Seen, dan IP/lokasi) tanpa perlu refresh halaman via koneksi WebSocket bi-directional.
- **Instant Remote Push**: Kirim pengumuman teks mendesak, gambar promosi, video, atau tautan web langsung ke layar tertentu dalam hitungan milidetik dengan durasi kustom (*override* sementara).
- **Playlist & Timeline Sequencer**: Buat urutan rotasi konten otomatis (*looping*) dengan pengaturan durasi per slide, reorder posisi, serta penugasan playlist ke perangkat target.
- **Multi-Format Media Library**:
  - File upload gambar & video langsung ke storage (maksimal 50 MB dengan proteksi MIME type dan auto-rollback).
  - External URL untuk gambar, video CDN, atau embed website interaktif.
  - Tipografi kutipan/teks pengumuman dengan styling otomatis.
- **Kiosk Player Resilience**: Pemutar layar client dilengkapi *auto-reconnect* (exponential backoff), deteksi sesi putus, mode layar penuh (*fullscreen*), serta auto-hide kursor saat idle.
- **Mission Control Glassmorphism UI**: Antarmuka bertema *dark-mode* berestetika tinggi dengan radar pulse indikator, kartu metrik statistik, modal interaktif, dan notifikasi toast.
- **Keamanan Terintegrasi**: Autentikasi Admin berbasis JWT, proteksi token unik per device dengan fitur regenerasi instan (*token rotation*), serta enkapsulasi database menggunakan Row Level Security (RLS).

---

## Struktur Monorepo

```
signage-control-panel/
├── apps/
│   ├── api/            # Fastify 5 REST API + WebSocket Server (Node.js & TypeScript)
│   ├── dashboard/      # Web Admin Panel (React 19, Vite, Tailwind CSS v4, Lucide Icons)
│   └── device/         # Kiosk Screen Player (React 19, Vite, Tailwind CSS v4)
├── packages/
│   ├── shared/         # Kontrak tipe TypeScript, Zod schemas, dan definisi protokol WS
│   └── client/         # Client library WebSocket dengan auto-reconnect & heartbeat
├── supabase/
│   ├── migrations/     # Skema DDL PostgreSQL, Trigger, RLS, dan Storage Bucket
│   └── seed.sql        # Contoh data awal untuk pengujian
├── .env.example        # Template konfigurasi environment variables
└── package.json        # NPM Workspaces root configuration
```

---

## Prasyarat

- **Node.js**: versi `>= 20.0.0`
- **NPM**: versi `>= 10.0.0`
- **Supabase**: Akun aktif di [supabase.com](https://supabase.com) (atau instance Supabase lokal).

---

## Panduan Instalasi & Setup

### 1. Setup Database di Supabase
1. Buat project baru di dashboard Supabase.
2. Buka menu **SQL Editor**, lalu jalankan file skema berikut secara berurutan:
   - [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) *(membuat tabel contents, playlists, playlist_items, devices, admins, trigger, serta bucket storage)*
   - (Opsional) [`supabase/seed.sql`](supabase/seed.sql) *(mengisi data contoh perangkat dan konten)*

### 2. Konfigurasi Environment Variables
Salin template konfigurasi di root workspace:
```bash
cp .env.example .env
```
Buka file `.env` dan lengkapi nilainya:
- `SUPABASE_URL`: Diambil dari menu **Project Settings > API** di Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Diambil dari menu **Project Settings > API > service_role key** *(ingat: jangan pernah membagikan key ini ke publik)*.
- `JWT_SECRET`: Buat string acak (minimal 16 karakter). Contoh generator:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

### 3. Install Dependensi
Jalankan instalasi dependensi untuk seluruh workspace:
```bash
npm install
```

### 4. Buat Akun Admin Pertama
Gunakan script CLI bawaan untuk membuat akun admin:
```bash
npm run create-admin -w @signage/api -- <username> <password>
```
*Contoh:*
```bash
npm run create-admin -w @signage/api -- admin signage1234
```
*(Catatan: username minimal 3 karakter, password minimal 8 karakter)*.

---

## Cara Menjalankan Project

Jalankan tiap service pada terminal terpisah (atau gunakan task runner pilihan Anda):

### Terminal 1: Backend API & WebSocket Server
```bash
npm run dev:api
```
- API berjalan di: `http://localhost:4000`
- WebSocket Server berjalan di: `ws://localhost:4000/ws`
- Health check: `curl http://localhost:4000/health`

### Terminal 2: Admin Dashboard
```bash
npm run dev:dashboard
```
- Buka di browser: `http://localhost:5173`
- Masuk menggunakan akun admin yang telah dibuat pada langkah sebelumnya.

### Terminal 3: Kiosk Screen Player (Device Client)
```bash
npm run dev:device
```
- Buka di browser layar / kiosk: `http://localhost:5174`

---

## Panduan Pengujian End-to-End (Simulasi Layar)

1. **Buka Dashboard**: Akses `http://localhost:5173` dan login.
2. **Daftarkan Layar Baru**:
   - Di tab **Screens**, klik tombol **+ Tambah Layar**.
   - Masukkan nama layar (contoh: `Layar Lobby`) dan lokasi (contoh: `Lantai 1 - Pintu Masuk`).
   - Simpan. Modal kredensial akan menampilkan **Device ID** dan **Device Token**. Klik salin.
3. **Hubungkan Device Player**:
   - Buka tab atau jendela browser baru di `http://localhost:5174`.
   - Masukkan Server URL (`http://localhost:4000`), tempel **Device ID** dan **Device Token**.
   - Klik **Hubungkan Layar**.
4. **Verifikasi Koneksi Real-time**:
   - Status di Kiosk Player akan berubah menjadi hijau (*Terhubung*).
   - Di tab Dashboard admin, status layar tersebut seketika berubah menjadi **Online** dengan indikator radar hijau tanpa perlu me-refresh browser.
5. **Uji Coba Push Konten**:
   - Di dashboard admin pada kartu layar tadi, klik **⚡ Push Konten**.
   - Pilih konten teks/gambar/video dan tentukan durasi (misal 15 detik).
   - Konten akan seketika muncul di layar player `http://localhost:5174` dan kembali ke mode standby/playlist setelah durasi berakhir.

---

## Dokumentasi REST API

Base URL: `http://localhost:4000`.
Semua endpoint di bawah `/api` (kecuali `/api/auth/login`) mewajibkan header:
`Authorization: Bearer <JWT_TOKEN>`.

Format balasan error standar:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan deskripsi error",
    "details": {}
  }
}
```

### 1. Autentikasi
| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login admin `{ username, password }`. Mengembalikan token JWT & profil |
| `GET` | `/api/auth/me` | Cek profil admin yang sedang login |
| `POST` | `/api/auth/logout` | Mengakhiri sesi admin |

### 2. Manajemen Perangkat (Devices)
| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/devices` | Ambil daftar perangkat (query: `page`, `pageSize`, `q`, `status`) |
| `GET` | `/api/devices/:id` | Ambil detail perangkat beserta token koneksinya |
| `POST` | `/api/devices` | Buat perangkat baru `{ nama, lokasi?, playlist_id? }` |
| `PATCH` | `/api/devices/:id` | Perbarui nama, lokasi, atau penugasan playlist perangkat |
| `POST` | `/api/devices/:id/regenerate-token` | Buat token baru (koneksi lama dengan token sebelumnya otomatis diputus) |
| `DELETE` | `/api/devices/:id` | Hapus perangkat (otomatis memutuskan koneksi WS perangkat tersebut) |

### 3. Manajemen Konten Media (Contents)
| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/contents` | Daftar konten media (query: `page`, `pageSize`, `q`, `tipe`) |
| `GET` | `/api/contents/:id` | Detail konten media |
| `POST` | `/api/contents` | Buat konten `text`, `url`, `image`, atau `video` via JSON URL |
| `POST` | `/api/contents/upload` | Upload file gambar/video (`multipart/form-data`: `file`, `judul?`), maks 50 MB |
| `PATCH` | `/api/contents/:id` | Ubah judul atau payload konten (konten file upload payload-nya terkunci) |
| `DELETE` | `/api/contents/:id` | Hapus konten (sekaligus menghapus file dari Supabase Storage jika ada) |

### 4. Manajemen Playlist
| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/playlists` | Daftar seluruh playlist beserta ringkasan jumlah item & total durasi |
| `GET` | `/api/playlists/:id` | Detail playlist beserta seluruh item konten dan urutannya |
| `POST` | `/api/playlists` | Buat playlist baru `{ nama }` |
| `PATCH` | `/api/playlists/:id` | Ubah nama playlist `{ nama }` |
| `PUT` | `/api/playlists/:id/items` | Simpan seluruh isi item playlist `{ items: [{ content_id, duration_seconds }] }` |
| `DELETE` | `/api/playlists/:id` | Hapus playlist |

---

## Protokol Real-time WebSocket

Server WebSocket berjalan pada port yang sama dengan HTTP di path `/ws`.

### 1. Handshake Koneksi
- **Koneksi Dashboard**:
  `ws://localhost:4000/ws?role=dashboard&token=<JWT_TOKEN>`
  *Menerima snapshot status seluruh device dan broadcast pembaruan real-time.*
- **Koneksi Kiosk Screen (Device)**:
  `ws://localhost:4000/ws?role=device&deviceId=<DEVICE_UUID>&token=<DEVICE_TOKEN>`
  *Menerima instruksi push konten, perubahan playlist, serta konfirmasi status.*

### 2. Pesan & Event
- `snapshot`: Server mengirim status terkini seluruh device ke dashboard saat pertama kali tersambung.
- `device_status`: Broadcast status perangkat (`online` / `offline`) dan `last_seen`.
- `push_content`: Dashboard mengirim perintah push konten instan ke perangkat tertentu:
  ```json
  {
    "type": "push_content",
    "deviceId": "uuid-device",
    "contentId": "uuid-konten",
    "duration_seconds": 15
  }
  ```
- `set_playlist`: Server mendistribusikan daftar putar yang ditugaskan ke layar.
- **Heartbeat (Ping/Pong)**: Server mengirimkan ping setiap 15 detik (`WS_PING_INTERVAL_MS`). Jika perangkat tidak membalas, koneksi diputus dan status ditandai `offline` secara otomatis.

---

## Arsitektur & Keputusan Teknis

1. **Single Port Efficiency**: Fastify meng-handle request REST HTTP dan HTTP Upgrade WebSocket di port yang sama (`4000`), menyederhanakan konfigurasi reverse proxy dan deployment.
2. **Strict DB Security via RLS**: Seluruh tabel di PostgreSQL dilindungi Row Level Security (RLS) tanpa policy publik. Akses data hanya diizinkan melalui server API menggunakan `service_role key`.
3. **Decoupled Architecture**: Perubahan pada layer REST memancarkan *internal event emitter* yang didengarkan oleh modul WebSocket Hub. REST tidak bergantung langsung pada status koneksi WebSocket di memori.
4. **Resilient Kiosk Recovery**: Saat server restart, semua status device di database otomatis direset menjadi `offline`. Ketika perangkat layar melakukan *auto-reconnect*, status kembali menjadi `online` secara akurat.
5. **Shared Schemas (`packages/shared`)**: Tipe data dan skema validasi Zod dipakai bersama antara backend dan frontend untuk menjamin konsistensi payload secara *end-to-end*.

---

## Script Bantuan

| Script | Deskripsi |
| --- | --- |
| `npm run typecheck` | Menjalankan typecheck TypeScript di seluruh monorepo |
| `npm run smoke -w @signage/api` | Menjalankan smoke test otomatis end-to-end API |
| `npm run create-admin -w @signage/api` | Membuat atau memperbarui password akun admin |
| `npm run build:api` | Build production bundle Fastify API |
| `npm run build:dashboard` | Build production bundle Admin Dashboard |
| `npm run build:device` | Build production bundle Kiosk Device Player |
