import {
  createDeviceSchema,
  idParamsSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
} from '@signage/shared';
import type { FastifyInstance } from 'fastify';
import {
  createDevice,
  getDevice,
  listDevices,
  regenerateToken,
  removeDevice,
  updateDevice,
} from './devices.service';

export async function devicesRoutes(app: FastifyInstance) {
  app.get('/devices', async (req) => listDevices(listDevicesQuerySchema.parse(req.query)));

  app.get('/devices/:id', async (req) => getDevice(idParamsSchema.parse(req.params).id));

  app.post('/devices', async (req, reply) => {
    const device = await createDevice(createDeviceSchema.parse(req.body));
    return reply.status(201).send(device);
  });

  app.patch('/devices/:id', async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    return updateDevice(id, updateDeviceSchema.parse(req.body));
  });

  app.post('/devices/:id/regenerate-token', async (req) =>
    regenerateToken(idParamsSchema.parse(req.params).id),
  );

  app.delete('/devices/:id', async (req, reply) => {
    await removeDevice(idParamsSchema.parse(req.params).id);
    return reply.status(204).send();
  });
}
