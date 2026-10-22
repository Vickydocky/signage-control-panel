// =====================================================================
// Shared domain types & WebSocket protocol (kontrak API <-> dashboard <-> device)
// =====================================================================

export type DeviceStatus = 'online' | 'offline';
export type ContentType = 'image' | 'video' | 'text' | 'url';

export interface Device {
  id: string;
  nama: string;
  lokasi: string | null;
  status: DeviceStatus;
  last_seen: string | null;
  playlist_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  judul: string;
  tipe: ContentType;
  payload: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  nama: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  content_id: string;
  position: number;
  duration_seconds: number;
}

/** Item playlist + konten lengkap, siap diputar di device */
export interface PlaylistEntry {
  duration_seconds: number;
  content: Content;
}

// ---------------------------------------------------------------------
// WebSocket protocol
//
// Endpoint : ws://<host>/ws
// Device    : /ws?role=device&deviceId=<uuid>&token=<device_token>
// Dashboard : /ws?role=dashboard&token=<jwt>
//
// Liveness  : server mengirim protocol-level ping tiap N detik; browser/Electron
//             membalas pong otomatis. Tidak ada pong => device dianggap offline.
// ---------------------------------------------------------------------

/** Server -> Device */
export type ServerToDeviceMessage =
  | { type: 'welcome'; device: Device; playlist: PlaylistEntry[] }
  | { type: 'playlist_updated'; playlist: PlaylistEntry[] }
  | { type: 'push_content'; content: Content; duration_seconds?: number }
  | { type: 'error'; message: string };

/** Server -> Dashboard */
export type ServerToDashboardMessage =
  | { type: 'snapshot'; devices: Device[] }
  | { type: 'device_status'; deviceId: string; status: DeviceStatus; last_seen: string }
  | { type: 'device_changed'; device: Device }
  | { type: 'device_removed'; deviceId: string }
  | { type: 'error'; message: string };

/** Dashboard -> Server */
export type DashboardToServerMessage =
  | { type: 'push_content'; deviceId: string; contentId: string; duration_seconds?: number };
