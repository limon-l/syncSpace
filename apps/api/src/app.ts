import 'dotenv/config';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { connectDatabase } from './lib/database.js';
import { registerCors } from './plugins/cors.plugin.js';
import { registerSecurity } from './plugins/security.plugin.js';
import { registerRateLimit } from './plugins/rate-limit.plugin.js';
import { sanitizeInput } from './plugins/sanitize.plugin.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { meetingRoutes } from './modules/meeting/meeting.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { liveKitRoutes } from './modules/livekit/livekit.routes.js';
import { fileRoutes } from './modules/files/files.routes.js';
import { createSocketServer } from './socket/socket.server.js';
import { createCollabServer } from './collab/collab-server.js';

async function main() {
  const app = Fastify({
    logger: false,
  });

  await registerSecurity(app);
  await registerCors(app);
  await app.register(cookie, {
    secret: config.SESSION_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    },
  });
  await registerRateLimit(app);
  await app.register(sanitizeInput);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(meetingRoutes, { prefix: '/api/meetings' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(chatRoutes, { prefix: '/api/meetings' });
  await app.register(liveKitRoutes);
  await app.register(fileRoutes);

  app.get('/api/health', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  createSocketServer(app);
  createCollabServer(app.server);

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
