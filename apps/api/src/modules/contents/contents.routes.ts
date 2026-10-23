import {
  createContentSchema,
  idParamsSchema,
  listContentsQuerySchema,
  updateContentSchema,
} from "@signage/shared";
import type { FastifyInstance } from "fastify";
import { AppError, badRequest } from "../../lib/errors";
import {
  createContent,
  createContentFromUpload,
  getContent,
  listContents,
  removeContent,
  updateContent,
} from "./contents.service";

export async function contentsRoutes(app: FastifyInstance) {
  app.get("/contents", async (req) =>
    listContents(listContentsQuerySchema.parse(req.query)),
  );

  app.get("/contents/:id", async (req) =>
    getContent(idParamsSchema.parse(req.params).id),
  );

  // JSON: text, url, atau image/video via URL eksternal
  app.post("/contents", async (req, reply) => {
    const content = await createContent(createContentSchema.parse(req.body));
    return reply.status(201).send(content);
  });

  // multipart/form-data: field `file` (wajib) + `judul` (opsional, default nama file)
  app.post("/contents/upload", async (req, reply) => {
    const file = await req.file();
    if (!file) throw badRequest('File is required (multipart field "file")');

    // toBuffer() menghabiskan stream, sehingga semua field form sudah terbaca setelahnya
    const buffer = await file.toBuffer();
    if (file.file.truncated)
      throw new AppError(
        413,
        "FILE_TOO_LARGE",
        "File exceeds the upload size limit",
      );

    const field = file.fields.judul;
    const judulRaw =
      field && !Array.isArray(field) && field.type === "field"
        ? String(field.value)
        : "";
    const judul = (
      judulRaw.trim() ||
      file.filename.replace(/\.[^.]+$/, "") ||
      "Untitled"
    ).slice(0, 200);

    const content = await createContentFromUpload({
      judul,
      buffer,
      mimetype: file.mimetype,
    });
    return reply.status(201).send(content);
  });

  app.patch("/contents/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    return updateContent(id, updateContentSchema.parse(req.body));
  });

  app.delete("/contents/:id", async (req, reply) => {
    await removeContent(idParamsSchema.parse(req.params).id);
    return reply.status(204).send();
  });
}
