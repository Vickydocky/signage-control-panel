import {
  getDeviceIdsByPlaylist,
  getDevicePublic,
} from "../modules/devices/devices.service";
import { getPlaylistEntries } from "../modules/playlists/playlists.service";
import type { Hub } from "./hub";

/** Kirim playlist terbaru ke satu device (jika sedang terhubung) */
export async function pushPlaylistToDevice(
  hub: Hub,
  deviceId: string,
): Promise<void> {
  if (!hub.isOnline(deviceId)) return;
  const device = await getDevicePublic(deviceId);
  if (!device) return;
  const playlist = device.playlist_id
    ? await getPlaylistEntries(device.playlist_id)
    : [];
  hub.sendToDevice(deviceId, { type: "playlist_updated", playlist });
}

/** Isi sebuah playlist berubah: kirim ke semua device online yang memakainya */
export async function pushPlaylistToDevices(
  hub: Hub,
  playlistId: string,
): Promise<void> {
  const online = (await getDeviceIdsByPlaylist(playlistId)).filter((id) =>
    hub.isOnline(id),
  );
  if (online.length === 0) return;
  const playlist = await getPlaylistEntries(playlistId);
  for (const deviceId of online)
    hub.sendToDevice(deviceId, { type: "playlist_updated", playlist });
}
