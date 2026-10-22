import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const { error } = await supabase.from('devices').select('id', { head: true, count: 'exact' });
    if (error) {
      app.log.error({ err: error }, 'health check: database unreachable');
      return reply.status(503).send({ status: 'degraded', database: 'down', message: error.message });
    }
    return { status: 'ok', database: 'up', uptime: Math.round(process.uptime()) };
  });
}
