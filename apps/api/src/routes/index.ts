import type { FastifyInstance } from 'fastify';
import { authProtectedRoutes, authPublicRoutes } from '../modules/auth/auth.routes';
import { requireAuth } from '../modules/auth/requireAuth';
import { contentsRoutes } from '../modules/contents/contents.routes';
import { devicesRoutes } from '../modules/devices/devices.routes';
import { playlistsRoutes } from '../modules/playlists/playlists.routes';

/** Semua endpoint ada di bawah /api. Hanya login yang publik; sisanya wajib JWT. */
export async function apiRoutes(app: FastifyInstance) {
  await app.register(authPublicRoutes);

  // Plugin ini punya hook sendiri (terenkapsulasi): requireAuth hanya berlaku untuk rute di dalamnya
  await app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', requireAuth);
    await protectedApp.register(authProtectedRoutes);
    await protectedApp.register(devicesRoutes);
    await protectedApp.register(contentsRoutes);
    await protectedApp.register(playlistsRoutes);
  });
}