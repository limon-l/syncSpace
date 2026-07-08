import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { connectDatabase } from './lib/database.js';
import { registerCors } from './plugins/cors.plugin.js';
import { registerRateLimit } from './plugins/rate-limit.plugin.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { meetingRoutes } from './modules/meeting/meeting.routes.js';
import { createSocketServer } from './socket/socket.server.js';

async function main() {
  const app = Fastify({
    logger: false,
  });

  await registerCors(app);
  await app.register(cookie);
  await registerRateLimit(app);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(meetingRoutes, { prefix: '/api/meetings' });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  createSocketServer(app);

  await connectDatabase();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info({ port: config.PORT }, 'API server started');
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

main();
