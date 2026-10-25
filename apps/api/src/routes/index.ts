import type { FastifyInstance } from 'fastify';
import { contentsRoutes } from '../modules/contents/contents.routes';
import { devicesRoutes } from '../modules/devices/devices.routes';
import { playlistsRoutes } from '../modules/playlists/playlists.routes';

/**
 * Semua endpoint admin ada di bawah /api.
 * Tahap JWT: cukup pasang satu preHandler auth di plugin ini.
 */
export async function apiRoutes(app: FastifyInstance) {
  await app.register(devicesRoutes);
  await app.register(contentsRoutes);
  await app.register(playlistsRoutes);
}
