import {
  createPlaylistSchema,
  idParamsSchema,
  replacePlaylistItemsSchema,
  updatePlaylistSchema,
} from "@signage/shared";
import type { FastifyInstance } from "fastify";
import {
  createPlaylist,
  getPlaylist,
  listPlaylists,
  removePlaylist,
  renamePlaylist,
  replacePlaylistItems,
} from "./playlists.service";

export async function playlistsRoutes(app: FastifyInstance) {
  app.get("/playlists", async () => listPlaylists());

  app.get("/playlists/:id", async (req) =>
    getPlaylist(idParamsSchema.parse(req.params).id),
  );

  app.post("/playlists", async (req, reply) => {
    const playlist = await createPlaylist(createPlaylistSchema.parse(req.body));
    return reply.status(201).send(playlist);
  });

  app.patch("/playlists/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    return renamePlaylist(id, updatePlaylistSchema.parse(req.body));
  });

  // Ganti seluruh isi playlist sekaligus (tambah, hapus, urut ulang, ubah durasi)
  app.put("/playlists/:id/items", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    return replacePlaylistItems(id, replacePlaylistItemsSchema.parse(req.body));
  });

  app.delete("/playlists/:id", async (req, reply) => {
    await removePlaylist(idParamsSchema.parse(req.params).id);
    return reply.status(204).send();
  });
}
